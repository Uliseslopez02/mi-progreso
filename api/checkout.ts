export const config = { runtime: 'edge' }

interface RequestBody {
  planTier?: 'premium_monthly' | 'premium_yearly'
}

const PLAN_CONFIG: Record<
  'premium_monthly' | 'premium_yearly',
  { reason: string; frequency: number; envVar: string }
> = {
  premium_monthly: { reason: 'Mi Progreso Premium Mensual', frequency: 1, envVar: 'MP_PRICE_MONTHLY_ARS' },
  premium_yearly: { reason: 'Mi Progreso Premium Anual', frequency: 12, envVar: 'MP_PRICE_YEARLY_ARS' },
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

/**
 * El monto de la suscripción viene de una env var en ARS y siempre es entero
 * (sin centavos). Se parsea tolerante — igual criterio que `parseWholePesos`
 * en src/domain/premiumPricing.ts — para aceptar cualquier formato razonable
 * que se haya cargado en Vercel: "3900", "3.900", "$3.900", "3.900 ARS".
 * `Number("$3.900")` daría NaN y `Number("3.900")` daría 3.9 — ambos rompían
 * el checkout con "precio sin configurar" aunque la variable estuviera puesta.
 */
function parseArsAmount(raw: string | undefined): number {
  if (!raw) return NaN
  return Number(raw.replace(/[^0-9]/g, ''))
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
 *
 * IMPORTANTE: una suscripción con `preapproval_plan_id` (plan asociado) exige
 * que el propio backend ya tenga un `card_token_id` (tarjeta tokenizada) y
 * `status: 'authorized'` — MP no ofrece ahí un checkout hosteado pendiente.
 * Por eso NO se usa `preapproval_plan_id` acá: se crea una suscripción "sin
 * plan asociado", con `auto_recurring` inline y `status: 'pending'`, que es
 * el único modo que devuelve un `init_point` para que el usuario ponga su
 * tarjeta del lado de Mercado Pago (nunca la vemos nosotros). El monto real
 * en ARS vive en una env var (`MP_PRICE_*_ARS`), nunca hardcodeado acá.
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
  const plan = planTier ? PLAN_CONFIG[planTier] : undefined
  if (!plan) {
    return jsonResponse({ error: 'Plan inválido.' }, 400)
  }
  const rawAmount = process.env[plan.envVar]
  const amount = parseArsAmount(rawAmount)
  if (!amount || !Number.isFinite(amount)) {
    console.error('checkout: precio sin configurar', { envVar: plan.envVar, rawAmount, parsed: amount })
    return jsonResponse({ error: `Precio sin configurar (${plan.envVar}).` }, 400)
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
        reason: plan.reason,
        payer_email: user.email,
        external_reference: user.id,
        back_url: `${origin}/premium/confirmacion`,
        status: 'pending',
        auto_recurring: {
          frequency: plan.frequency,
          frequency_type: 'months',
          transaction_amount: amount,
          currency_id: 'ARS',
        },
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
