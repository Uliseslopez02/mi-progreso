// Da de alta (o actualiza la contraseña de) un usuario autorizado a pasar el
// gate de acceso a todo el sitio (ver middleware.ts en la raíz del repo).
//
// Uso:
//   node --env-file=.env.local scripts/add-site-gate-user.mjs <usuario> <contraseña>
//
// Necesita en .env.local: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// SITE_GATE_SECRET (el mismo valor que en las env vars de Vercel).
import { createHmac } from 'node:crypto'

const [username, password] = process.argv.slice(2)
if (!username || !password) {
  console.error('Uso: node --env-file=.env.local scripts/add-site-gate-user.mjs <usuario> <contraseña>')
  process.exit(1)
}

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const gateSecret = process.env.SITE_GATE_SECRET

for (const [name, value] of Object.entries({
  VITE_SUPABASE_URL: supabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY: serviceKey,
  SITE_GATE_SECRET: gateSecret,
})) {
  if (!value) {
    console.error(`Falta ${name} en el entorno (cargalo con --env-file=.env.local o exportalo antes de correr el script).`)
    process.exit(1)
  }
}

const normalizedUsername = username.trim().toLowerCase()
const passwordHash = createHmac('sha256', gateSecret).update(password).digest('hex')

const res = await fetch(`${supabaseUrl}/rest/v1/site_gate_users?on_conflict=username`, {
  method: 'POST',
  headers: {
    apikey: serviceKey,
    authorization: `Bearer ${serviceKey}`,
    'content-type': 'application/json',
    prefer: 'resolution=merge-duplicates,return=representation',
  },
  body: JSON.stringify({ username: normalizedUsername, password_hash: passwordHash }),
})

if (!res.ok) {
  console.error(`Error ${res.status}: ${await res.text()}`)
  process.exit(1)
}

console.log(`Usuario "${normalizedUsername}" habilitado para entrar al sitio.`)
