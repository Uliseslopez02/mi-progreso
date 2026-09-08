export const config = { runtime: 'edge' }

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

/** Ver la misma función en api/checkout.ts. */
async function getAuthenticatedUser(request: Request): Promise<{ id: string; token: string } | null> {
  const auth = request.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY
  if (!token || !supabaseUrl || !anonKey) return null

  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, authorization: `Bearer ${token}` },
    })
    if (!res.ok) return null
    const user = (await res.json()) as { id?: string }
    if (!user.id) return null
    return { id: user.id, token }
  } catch {
    return null
  }
}

/**
 * Cancela la suscripción activa del usuario en Mercado Pago y refleja el
 * cambio de una (optimista) — el webhook confirma después con la misma
 * transición, sin efecto doble porque el status ya coincide.
 */
export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Método no permitido' }, 405)
  }

  const user = await getAuthenticatedUser(request)
  if (!user) {
    return jsonResponse({ error: 'No autenticado.' }, 401)
  }

  const accessToken = process.env.MP_ACCESS_TOKEN
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!accessToken || !supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: 'Falta configuración del servidor.' }, 500)
  }

  // Lee la propia fila con el token del usuario (RLS "owner read" ya la acota).
  let preapprovalId: string | null = null
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/subscriptions?user_id=eq.${user.id}&select=mp_preapproval_id`,
      { headers: { apikey: anonKey, authorization: `Bearer ${user.token}` } },
    )
    if (res.ok) {
      const rows = (await res.json()) as Array<{ mp_preapproval_id: string | null }>
      preapprovalId = rows[0]?.mp_preapproval_id ?? null
    }
  } catch {
    preapprovalId = null
  }

  if (!preapprovalId) {
    return jsonResponse({ error: 'No encontramos una suscripción activa para cancelar.' }, 404)
  }

  try {
    const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
      method: 'PUT',
      headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' }),
    })
    if (!mpRes.ok) {
      return jsonResponse({ error: 'Mercado Pago no pudo procesar la cancelación.' }, 502)
    }
  } catch {
    return jsonResponse({ error: 'No se pudo contactar a Mercado Pago.' }, 502)
  }

  // Actualiza ya mismo con la service-role key (el cliente no tiene permiso
  // de escritura sobre subscriptions vía RLS) para que la UI refleje el
  // cambio sin esperar al webhook.
  try {
    await fetch(`${supabaseUrl}/rest/v1/subscriptions?user_id=eq.${user.id}`, {
      method: 'PATCH',
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ status: 'canceled', canceled_at: new Date().toISOString() }),
    })
  } catch {
    // El webhook de MP va a confirmar la cancelación igual; no falla la
    // respuesta al usuario por esto.
  }

  return jsonResponse({ ok: true }, 200)
}
