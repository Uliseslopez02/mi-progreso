export const config = { runtime: 'edge' }

interface RequestBody {
  planTier?: 'premium_monthly' | 'premium_yearly'
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

/** Ver la misma función en api/suggest-habits.ts — mismo criterio de auth, pero acá
 * además necesitamos el id/email reales del usuario, no sólo un booleano. */
async function getAuthenticatedUser(request: Request): Promise<{ id: string; email: string } | null> {
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
    const user = (await res.json()) as { id?: string; email?: string }
    if (!user.id || !user.email) return null
    return { id: user.id, email: user.email }
  } catch {
    return null
  }
}

/**
 * Crea una suscripción (preapproval) de Mercado Pago para el plan elegido y
 * devuelve la URL de checkout hosteada por MP para redirigir al usuario.
 * Los montos reales en ARS viven en los `preapproval_plan` de MP (creados una
 * sola vez fuera de este código, IDs en env vars) — nunca hardcodeados acá.
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
  const planIds: Record<'premium_monthly' | 'premium_yearly', string | undefined> = {
    premium_monthly: process.env.MP_PLAN_ID_MONTHLY,
    premium_yearly: process.env.MP_PLAN_ID_YEARLY,
  }
  if (!accessToken) {
    return jsonResponse({ error: 'Falta configurar MP_ACCESS_TOKEN en el servidor.' }, 500)
  }

  let body: RequestBody
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ error: 'Body inválido' }, 400)
  }

  const planTier = body.planTier
  const planId = planTier ? planIds[planTier] : undefined
  if (!planTier || !planId) {
    return jsonResponse({ error: 'Plan inválido.' }, 400)
  }

  const origin = new URL(request.url).origin

  let response: Response
  try {
    response = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        preapproval_plan_id: planId,
        payer_email: user.email,
        external_reference: user.id,
        back_url: `${origin}/premium/confirmacion`,
        // Sin card_token_id (no recibimos ni tocamos datos de tarjeta acá):
        // 'pending' es lo que le pide a MP devolver un init_point de checkout
        // hosteado para que el usuario autorice el pago del lado de MP.
        status: 'pending',
      }),
    })
  } catch {
    return jsonResponse({ error: 'No se pudo contactar a Mercado Pago.' }, 502)
  }

  if (!response.ok) {
    const mpError = (await response.json().catch(() => null)) as { message?: string; error?: string } | null
    console.error('MP preapproval error', response.status, mpError)
    return jsonResponse(
      { error: `Mercado Pago no pudo iniciar el checkout: ${mpError?.message ?? mpError?.error ?? response.status}` },
      502,
    )
  }

  const data = (await response.json()) as { init_point?: string }
  if (!data.init_point) {
    return jsonResponse({ error: 'Mercado Pago no devolvió una URL de checkout.' }, 502)
  }

  return jsonResponse({ initPoint: data.init_point }, 200)
}
