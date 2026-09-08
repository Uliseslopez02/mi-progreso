/**
 * Eventos del funnel de monetización (ver prompt original, sección 19). Sin
 * proveedor real todavía (PostHog/Amplitude/GA) — cada evento se loguea a
 * consola en dev y queda listo para enchufar un proveedor real cambiando
 * sólo `send()`, sin tocar ningún call site. Nombres y payloads pensados
 * para responder: ¿cuánta gente ve el paywall, cuánta intenta comprar,
 * cuánta confirma el pago, cuánta cancela?
 */
export type AnalyticsEvent =
  | { name: 'paywall_viewed'; feature: 'suggest_habits' | 'habit_insights' }
  | { name: 'premium_page_viewed' }
  | { name: 'checkout_started'; planTier: 'premium_monthly' | 'premium_yearly' }
  | { name: 'checkout_redirected'; planTier: 'premium_monthly' | 'premium_yearly' }
  | { name: 'checkout_failed'; planTier: 'premium_monthly' | 'premium_yearly'; reason: string }
  | { name: 'premium_confirmed' }
  | { name: 'subscription_canceled' }

function send(event: AnalyticsEvent) {
  if (import.meta.env.DEV) {
    console.debug('[analytics]', event.name, event)
  }
  // Acá se conecta un proveedor real (PostHog/Amplitude/GA) el día que se
  // sume uno — sin cambiar ningún call site de `track()`.
}

export function track(event: AnalyticsEvent) {
  try {
    send(event)
  } catch {
    // Un fallo de analytics nunca debe romper la funcionalidad real.
  }
}
