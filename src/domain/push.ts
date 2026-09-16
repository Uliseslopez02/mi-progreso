import { supabase } from '../lib/supabaseClient'

/**
 * Suscripción/desuscripción a Web Push. A propósito NO pasa por
 * `ProgressRepository` (a diferencia de `notifications`/`notification_preferences`):
 * push necesita una cuenta real + el navegador soporte Service Worker/Push, así
 * que no tiene equivalente en modo local — mismo criterio que otras
 * operaciones "sólo Supabase" del dominio (ver `habitInsights.ts`).
 */
export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
}

/** "BAsd..." (base64url, como la expone el panel de Vercel) → Uint8Array, formato que pide `PushManager.subscribe`. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

async function authHeaders(): Promise<Record<string, string> | null> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) return null
  return { 'content-type': 'application/json', authorization: `Bearer ${token}` }
}

export type SubscribeResult = { ok: true } | { ok: false; reason: 'unsupported' | 'permission_denied' | 'no_session' | 'error' }

/**
 * Pide permiso de notificaciones, suscribe al navegador con la clave pública
 * VAPID (`VITE_VAPID_PUBLIC_KEY`) y guarda la suscripción server-side. Nunca
 * lanza — cualquier fallo vuelve como `{ ok: false, reason }` para que la UI
 * pueda mostrar algo razonable sin try/catch propio.
 */
export async function subscribeToPush(): Promise<SubscribeResult> {
  if (!isPushSupported()) return { ok: false, reason: 'unsupported' }

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return { ok: false, reason: 'permission_denied' }

    const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
    if (!vapidPublicKey) return { ok: false, reason: 'error' }

    const registration = await navigator.serviceWorker.ready
    const existing = await registration.pushManager.getSubscription()
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      }))

    const headers = await authHeaders()
    if (!headers) return { ok: false, reason: 'no_session' }

    const json = subscription.toJSON()
    const res = await fetch('/api/push-subscribe', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        endpoint: json.endpoint,
        p256dh: json.keys?.p256dh,
        auth: json.keys?.auth,
        userAgent: navigator.userAgent.slice(0, 200),
      }),
    })
    return res.ok ? { ok: true } : { ok: false, reason: 'error' }
  } catch {
    return { ok: false, reason: 'error' }
  }
}

/** Cancela la suscripción del navegador y avisa al servidor para que deje de mandarle push. */
export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (!subscription) return
    const endpoint = subscription.endpoint
    await subscription.unsubscribe()

    const headers = await authHeaders()
    if (!headers) return
    await fetch('/api/push-unsubscribe', { method: 'POST', headers, body: JSON.stringify({ endpoint }) })
  } catch {
    // Un fallo acá deja como mucho una suscripción huérfana en el servidor
    // (se limpia sola cuando send-notifications reciba un 404/410) — no rompe la UI.
  }
}
