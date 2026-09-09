export const config = { runtime: 'edge' }

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Valida la firma `x-signature` que manda Mercado Pago (algoritmo oficial:
 * HMAC-SHA256 de un manifest `id:{dataId};request-id:{x-request-id};ts:{ts};`
 * con el webhook secret configurado en el panel de MP). Sin esto, cualquiera
 * que descubra esta URL podría falsificar una notificación de pago exitoso.
 */
async function isValidSignature(request: Request, dataId: string): Promise<boolean> {
  const secret = process.env.MP_WEBHOOK_SECRET
  const signatureHeader = request.headers.get('x-signature')
  const requestId = request.headers.get('x-request-id')
  if (!secret || !signatureHeader || !requestId) return false

  const parts = Object.fromEntries(
    signatureHeader.split(',').map((part) => {
      const [key, value] = part.split('=').map((s) => s.trim())
      return [key, value]
    }),
  )
  const ts = parts.ts
  const v1 = parts.v1
  if (!ts || !v1) return false

  // MP manda data.id a veces en mayúsculas pero exige minúsculas en el manifest
  // de la firma (recomendación oficial) — sin esto, notificaciones legítimas
  // con un id alfanumérico fallarían la validación por una diferencia de case.
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(manifest))
  return toHex(signature) === v1
}

type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'expired'

function mapStatus(mpStatus: string): SubscriptionStatus | null {
  if (mpStatus === 'authorized') return 'active'
  if (mpStatus === 'paused') return 'past_due'
  if (mpStatus === 'cancelled') return 'canceled'
  return null
}

/**
 * Recibe las notificaciones de suscripción de Mercado Pago. Nunca confía en
 * el body de la notificación para el estado real — siempre vuelve a
 * consultar el recurso completo a la API de MP (recomendación oficial,
 * evita que una notificación falsificada con datos inventados haga algo).
 * Escribe en `subscriptions` con la service-role key porque el cliente no
 * tiene (ni debe tener) permiso de escritura sobre esa tabla.
 */
export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Método no permitido' }, 405)
  }

  let body: { type?: string; data?: { id?: string } } = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const url = new URL(request.url)
  const type = body.type ?? url.searchParams.get('type') ?? url.searchParams.get('topic') ?? ''
  const dataId = body.data?.id ?? url.searchParams.get('data.id') ?? url.searchParams.get('id') ?? ''

  if (type !== 'preapproval' || !dataId) {
    // Otros tipos de notificación (ej. 'payment') no son relevantes para el
    // estado de suscripción — se responde 200 igual para que MP no reintente.
    return jsonResponse({ ok: true }, 200)
  }

  if (!(await isValidSignature(request, dataId))) {
    return jsonResponse({ error: 'Firma inválida.' }, 401)
  }

  const accessToken = process.env.MP_ACCESS_TOKEN
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!accessToken || !supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Falta configuración del servidor.' }, 500)
  }

  let preapproval: {
    status?: string
    external_reference?: string
    payer_email?: string
    id?: string
    auto_recurring?: { frequency?: number }
  }
  try {
    const res = await fetch(`https://api.mercadopago.com/preapproval/${dataId}`, {
      headers: { authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return jsonResponse({ error: 'No se pudo consultar la suscripción en MP.' }, 502)
    preapproval = await res.json()
  } catch {
    return jsonResponse({ error: 'No se pudo contactar a Mercado Pago.' }, 502)
  }

  const status = mapStatus(preapproval.status ?? '')
  const userId = preapproval.external_reference
  if (!status || !userId) {
    // Estado sin mapeo conocido (ej. 'pending') o sin external_reference:
    // no hay nada seguro que actualizar todavía, se acepta sin error.
    return jsonResponse({ ok: true }, 200)
  }

  // Sin preapproval_plan_id (ver api/checkout.ts) — el plan se infiere de la
  // frecuencia real de cobro que devuelve MP, no de un id de plan.
  let planTier: 'premium_monthly' | 'premium_yearly' | undefined
  const frequency = preapproval.auto_recurring?.frequency
  if (frequency === 1) planTier = 'premium_monthly'
  else if (frequency === 12) planTier = 'premium_yearly'

  try {
    const upsertRes = await fetch(`${supabaseUrl}/rest/v1/subscriptions?on_conflict=user_id`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        'content-type': 'application/json',
        prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        user_id: userId,
        status,
        plan_tier: status === 'active' ? planTier : undefined,
        payment_provider: 'mercadopago',
        mp_customer_email: preapproval.payer_email,
        mp_preapproval_id: preapproval.id,
        current_period_start: status === 'active' ? new Date().toISOString() : undefined,
        canceled_at: status === 'canceled' ? new Date().toISOString() : undefined,
        updated_at: new Date().toISOString(),
      }),
    })
    if (!upsertRes.ok) {
      return jsonResponse({ error: 'No se pudo actualizar la suscripción.' }, 500)
    }
  } catch {
    return jsonResponse({ error: 'No se pudo contactar a Supabase.' }, 502)
  }

  return jsonResponse({ ok: true }, 200)
}
