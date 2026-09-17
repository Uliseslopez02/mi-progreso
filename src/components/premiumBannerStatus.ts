/**
 * "Cerrado, no molestar por un tiempo" para el banner de Premium del dashboard
 * (ver PremiumBanner.tsx) — mismo patrón de localStorage que
 * onboarding/onboardingStatus.ts, pero con expiración en vez de "para
 * siempre": el banner debe poder reaparecer ocasionalmente tras un cierre,
 * no desaparecer definitivamente al primer click en la cruz.
 */

const DISMISSED_AT_KEY = 'mi-progreso:premium-banner-dismissed-at'
const COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000 // 14 días

export function isPremiumBannerDismissed(): boolean {
  try {
    const raw = window.localStorage.getItem(DISMISSED_AT_KEY)
    if (!raw) return false
    const dismissedAt = Number(raw)
    if (!Number.isFinite(dismissedAt)) return false
    return Date.now() - dismissedAt < COOLDOWN_MS
  } catch {
    return false
  }
}

export function dismissPremiumBanner(): void {
  try {
    window.localStorage.setItem(DISMISSED_AT_KEY, String(Date.now()))
  } catch {
    // localStorage puede no estar disponible (modo privado); en el peor caso
    // el banner se vuelve a mostrar antes de tiempo, no rompe nada.
  }
}
