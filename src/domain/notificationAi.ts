import { supabase } from '../lib/supabaseClient'
import type { NotificationType, UserContext } from './notifications'

export interface NotificationAiResult {
  title: string
  body: string
}

/**
 * Le pide a la IA que redacte (nunca decide, nunca inventa datos) el título y
 * cuerpo de UNA notificación ya elegida por el motor de reglas — sólo la de
 * mayor prioridad del día (ver `useNotificationEngine.ts`), con cuota propia
 * y separada de la de "Hábitos sugeridos"/"Sugerencias" (ver
 * `api/notification-message.ts`). Nunca lanza ni muestra error: si algo
 * falla, `null` — el llamador sigue con el mensaje de plantilla, que ya es
 * bueno por sí solo.
 */
export async function tryPhraseNotification(
  type: NotificationType,
  context: UserContext,
  fallbackTitle: string,
  fallbackBody: string,
): Promise<NotificationAiResult | null> {
  try {
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    if (!token) return null

    const res = await fetch('/api/notification-message', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ type, context, fallbackTitle, fallbackBody }),
    })
    if (!res.ok) return null

    const data = (await res.json()) as { title?: unknown; body?: unknown }
    const title = typeof data.title === 'string' ? data.title.trim().slice(0, 80) : ''
    const body = typeof data.body === 'string' ? data.body.trim().slice(0, 220) : ''
    if (!title || !body) return null
    return { title, body }
  } catch {
    return null
  }
}
