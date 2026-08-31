/**
 * Señal local de "esta cuenta ya pasó por el onboarding en este dispositivo"
 * (completado o saltado a propósito) — mismo patrón que
 * `auth/welcomeMessages.ts`'s `isReturningDevice`, y a propósito no una
 * key de un solo uso como `entryIntent.ts`: sin esto, alguien que elige
 * "Prefiero explorar por mi cuenta" al registrarse (sigue con 0 hábitos)
 * volvía a ver el wizard completo en su segunda visita, porque `entryIntent`
 * ya se había consumido en la primera. Se lee de forma síncrona a propósito
 * (nunca un viaje de red) para no introducir un parpadeo entre "app vacía" y
 * "wizard" mientras se decide qué mostrar — ver App.tsx.
 */

const ONBOARDING_DONE_KEY = 'mi-progreso:onboarding-done'

export function hasOnboarded(): boolean {
  try {
    return window.localStorage.getItem(ONBOARDING_DONE_KEY) === '1'
  } catch {
    return false
  }
}

export function markOnboarded(): void {
  try {
    window.localStorage.setItem(ONBOARDING_DONE_KEY, '1')
  } catch {
    // localStorage puede no estar disponible (modo privado); en el peor caso
    // se vuelve a ver el onboarding, no rompe nada.
  }
}
