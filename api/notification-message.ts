import { phraseNotification } from './_lib/phraseNotification'
import type { PhraseContext } from './_lib/phraseNotification'

export const config = { runtime: 'edge' }

/**
 * Redacta el título/cuerpo de UNA notificación ya elegida por el motor de
 * reglas del cliente (`src/domain/notificationEngine.ts`) — esta función
 * nunca decide qué se notifica ni inventa datos, sólo le da tono al mensaje.
 * Cuota propia y SEPARADA de la de "Hábitos sugeridos"/"Sugerencias"
 * (`increment_ai_usage`, 3/mes en Free): esto es una feature del producto,
 * no un beneficio Premium, así que no debería competir por la misma cuota.
 * El control de costo es simplemente "el cliente pide esto como máximo una
 * vez por día" (ver `notificationAi.ts`) + un techo duro acá abajo
 * (`MAX_AI_NOTIFICATIONS_PER_DAY`) para que un cliente modificado no pueda
 * generar llamadas ilimitadas. El prompt/parseo vive en `_lib/phraseNotification.ts`,
 * compartido con `api/send-notifications.ts` (el cron de push), para que el
 * tono nunca diverja entre los dos caminos.
 */
const AI_UNAVAILABLE_MESSAGE = 'No se pudo generar el mensaje.'
const MAX_AI_NOTIFICATIONS_PER_DAY = 3

interface RequestBody {
  type?: string
  context?: PhraseContext
  fallbackTitle?: string
  fallbackBody?: string
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

/** Ver la misma función en api/suggest-habits.ts — mismo criterio de auth. */
async function getAuthenticatedUser(request: Request): Promise<{ token: string; supabaseUrl: string; anonKey: string } | null> {
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
    return { token, supabaseUrl, anonKey }
  } catch {
    return null
  }
}

/**
 * Techo duro server-side, independiente de que el cliente se comporte bien:
 * cuenta cuántas notificaciones con `ai_phrased = true` se crearon en las
 * últimas 24hs para este usuario (RLS ya acota a sus propias filas — se usa
 * su propio JWT, nunca la service-role key). Si la consulta falla, se deja
 * pasar (fail-open): más vale una llamada de más que romper el acompañamiento
 * por un error transitorio de red.
 */
async function underDailyCap(auth: { token: string; supabaseUrl: string; anonKey: string }): Promise<boolean> {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const res = await fetch(
      `${auth.supabaseUrl}/rest/v1/notifications?select=id&ai_phrased=eq.true&created_at=gte.${encodeURIComponent(since)}&limit=${MAX_AI_NOTIFICATIONS_PER_DAY}`,
      { headers: { apikey: auth.anonKey, authorization: `Bearer ${auth.token}` } },
    )
    if (!res.ok) return true
    const rows = (await res.json()) as unknown[]
    return rows.length < MAX_AI_NOTIFICATIONS_PER_DAY
  } catch {
    return true
  }
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Método no permitido' }, 405)
  }

  const auth = await getAuthenticatedUser(request)
  if (!auth) {
    return jsonResponse({ error: 'No autenticado.' }, 401)
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('[notification-message] ANTHROPIC_API_KEY no está configurada en el entorno del servidor')
    return jsonResponse({ error: AI_UNAVAILABLE_MESSAGE }, 503)
  }

  if (!(await underDailyCap(auth))) {
    return jsonResponse({ error: 'Límite diario alcanzado.' }, 429)
  }

  let body: RequestBody
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ error: 'Body inválido' }, 400)
  }

  const type = (body.type ?? '').slice(0, 40)
  const fallbackTitle = (body.fallbackTitle ?? '').slice(0, 80)
  const fallbackBody = (body.fallbackBody ?? '').slice(0, 220)
  if (!fallbackTitle || !fallbackBody) {
    return jsonResponse({ error: 'Faltan datos' }, 400)
  }

  // Contexto recortado a números — nunca se manda historial día por día, ni
  // nombres de objetivos/hábitos: sólo agregados, igual criterio que
  // habit-insights.ts.
  const result = await phraseNotification(apiKey, type, body.context ?? {}, fallbackTitle, fallbackBody)
  if (!result) {
    return jsonResponse({ error: AI_UNAVAILABLE_MESSAGE }, 502)
  }

  return jsonResponse(result, 200)
}
