// Middleware de Vercel (Edge Runtime, corre antes de servir cualquier ruta
// — estáticos, rewrites del SPA y funciones de `api/`) que protege TODO el
// sitio con un usuario/contraseña compartido entre las personas autorizadas.
// Es un gate independiente del login real de la app (Supabase Auth, ver
// `src/auth`): éste sólo decide si alguien puede siquiera ver el sitio.
//
// Los usuarios autorizados viven en la tabla `site_gate_users` (ver
// `supabase/migrations/0028_site_gate_users.sql`) — alta con
// `scripts/add-site-gate-user.mjs`. La sesión se guarda en una cookie
// httpOnly firmada con HMAC-SHA256 (Web Crypto, disponible en Edge Runtime),
// sin estado del lado del servidor.
import { next } from '@vercel/functions'

export const config = { matcher: '/:path*' }

const COOKIE_NAME = 'mp_gate'
const LOGIN_PATH = '/__site-gate/login'
const SESSION_MS = 30 * 24 * 60 * 60 * 1000

// Llamadas servidor-a-servidor que no pueden traer la cookie del gate:
// webhook de Mercado Pago y el cron de notificaciones (éste ya valida su
// propio CRON_SECRET, ver api/send-notifications.ts).
const BYPASS_PATHS = new Set(['/api/mp-webhook', '/api/send-notifications'])

async function hmacHex(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value))
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function getCookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie')
  if (!header) return null
  const found = header
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
  return found ? decodeURIComponent(found.slice(name.length + 1)) : null
}

async function verifySessionCookie(cookie: string, secret: string): Promise<boolean> {
  const [username, expiry, signature] = cookie.split('.')
  if (!username || !expiry || !signature) return false
  if (Date.now() > Number(expiry)) return false
  const expected = await hmacHex(secret, `${username}.${expiry}`)
  return expected === signature
}

async function verifyCredentials(username: string, password: string, secret: string): Promise<boolean> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return false

  const normalizedUsername = username.trim().toLowerCase()
  const response = await fetch(
    `${supabaseUrl}/rest/v1/site_gate_users?username=eq.${encodeURIComponent(normalizedUsername)}&select=password_hash`,
    { headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` } },
  )
  if (!response.ok) return false
  const rows = (await response.json()) as { password_hash: string }[]
  if (!rows.length) return false

  const candidateHash = await hmacHex(secret, password)
  return candidateHash === rows[0].password_hash
}

function gatePage(): string {
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Acceso — Mi Progreso</title>
<style>
  :root { color-scheme: dark; }
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; background:#0b0d10; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
  form { background:#15181d; border:1px solid #23272e; border-radius:16px; padding:32px; width:100%; max-width:340px; box-sizing:border-box; }
  h1 { color:#fff; font-size:18px; margin:0 0 20px; }
  label { display:block; color:#9aa1ac; font-size:13px; margin-bottom:6px; }
  input { width:100%; box-sizing:border-box; background:#0b0d10; border:1px solid #2a2f37; color:#fff; border-radius:8px; padding:10px 12px; margin-bottom:16px; font-size:15px; }
  button { width:100%; background:#4f7cff; color:#fff; border:none; border-radius:8px; padding:12px; font-size:15px; font-weight:600; cursor:pointer; }
  button:disabled { opacity:0.6; }
  #err { color:#ff6b6b; font-size:13px; margin:-8px 0 16px; min-height:16px; }
</style></head>
<body>
  <form id="f">
    <h1>Mi Progreso</h1>
    <div id="err"></div>
    <label for="u">Usuario</label>
    <input id="u" name="username" autocomplete="username" required autofocus>
    <label for="p">Contraseña</label>
    <input id="p" name="password" type="password" autocomplete="current-password" required>
    <button type="submit">Entrar</button>
  </form>
  <script>
    document.getElementById('f').addEventListener('submit', async (e) => {
      e.preventDefault()
      const btn = e.target.querySelector('button')
      const err = document.getElementById('err')
      btn.disabled = true
      err.textContent = ''
      try {
        const res = await fetch('${LOGIN_PATH}', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            username: document.getElementById('u').value,
            password: document.getElementById('p').value,
          }),
        })
        if (res.ok) { location.reload(); return }
        err.textContent = 'Usuario o contraseña incorrectos.'
      } catch {
        err.textContent = 'Error de conexión, probá de nuevo.'
      }
      btn.disabled = false
    })
  </script>
</body></html>`
}

function html(body: string, status = 200): Response {
  return new Response(body, { status, headers: { 'content-type': 'text/html; charset=utf-8' } })
}

export default async function middleware(request: Request): Promise<Response> {
  const url = new URL(request.url)

  if (BYPASS_PATHS.has(url.pathname)) return next()

  const secret = process.env.SITE_GATE_SECRET
  if (!secret) return html('<h1>Sitio en configuración.</h1>', 503)

  if (url.pathname === LOGIN_PATH && request.method === 'POST') {
    let body: { username?: string; password?: string }
    try {
      body = (await request.json()) as { username?: string; password?: string }
    } catch {
      return new Response('Bad Request', { status: 400 })
    }
    if (!body.username || !body.password) return new Response('Bad Request', { status: 400 })

    const ok = await verifyCredentials(body.username, body.password, secret)
    if (!ok) return new Response('Unauthorized', { status: 401 })

    const normalizedUsername = body.username.trim().toLowerCase()
    const expiry = Date.now() + SESSION_MS
    const signature = await hmacHex(secret, `${normalizedUsername}.${expiry}`)
    const cookieValue = encodeURIComponent(`${normalizedUsername}.${expiry}.${signature}`)
    return new Response(null, {
      status: 200,
      headers: {
        'set-cookie': `${COOKIE_NAME}=${cookieValue}; Path=/; Max-Age=${Math.floor(SESSION_MS / 1000)}; HttpOnly; Secure; SameSite=Lax`,
      },
    })
  }

  const cookie = getCookie(request, COOKIE_NAME)
  if (cookie && (await verifySessionCookie(cookie, secret))) return next()

  if (request.method === 'GET' || request.method === 'HEAD') return html(gatePage())
  return new Response('Unauthorized', { status: 401 })
}
