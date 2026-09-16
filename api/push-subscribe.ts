export const config = { runtime: 'edge' }

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

interface RequestBody {
  endpoint?: string
  p256dh?: string
  auth?: string
  userAgent?: string
}

/**
 * Guarda una suscripción Web Push. Auth por JWT de sesión (igual criterio que
 * suggest-habits.ts) — el insert lo hace la propia fila del usuario vía RLS
 * ("push_subscriptions: owner rw", ver 0025_notifications.sql), sin
 * service-role key: el cliente sólo puede escribir su propia suscripción.
 */
export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Método no permitido' }, 405)
  }

  const auth = request.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY
  if (!token || !supabaseUrl || !anonKey) {
    return jsonResponse({ error: 'No autenticado.' }, 401)
  }

  let body: RequestBody
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ error: 'Body inválido' }, 400)
  }

  const endpoint = (body.endpoint ?? '').trim()
  const p256dh = (body.p256dh ?? '').trim()
  const authKey = (body.auth ?? '').trim()
  if (!endpoint || !p256dh || !authKey) {
    return jsonResponse({ error: 'Faltan datos de la suscripción' }, 400)
  }

  const res = await fetch(`${supabaseUrl}/rest/v1/push_subscriptions?on_conflict=endpoint`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      endpoint,
      p256dh,
      auth_key: authKey,
      user_agent: (body.userAgent ?? '').slice(0, 200) || null,
      last_seen_at: new Date().toISOString(),
    }),
  })

  if (!res.ok) {
    console.error('[push-subscribe] no se pudo guardar la suscripción', res.status, await res.text())
    return jsonResponse({ error: 'No se pudo guardar la suscripción.' }, 502)
  }

  return jsonResponse({ ok: true }, 200)
}
