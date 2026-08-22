/**
 * Puente liviano y no sensible entre el paso 4 del registro ("¿qué te
 * gustaría mejorar primero?") y el wizard de onboarding: sólo un id de área
 * en localStorage, de un solo uso, para preseleccionar sin bloquear ni
 * duplicar lógica de personalización en dos lugares.
 */

export const ONBOARDING_FOCUS_KEY = 'mi-progreso:onboarding-focus'

export interface FocusOption {
  id: string
  label: string
  /** Id de LIFE_AREAS a preseleccionar en el onboarding, si corresponde. */
  areaId: string | null
}

export const FOCUS_OPTIONS: FocusOption[] = [
  { id: 'salud', label: 'Salud', areaId: 'salud' },
  { id: 'productividad', label: 'Productividad', areaId: 'productividad' },
  { id: 'habitos', label: 'Hábitos', areaId: 'orden' },
  { id: 'bienestar', label: 'Bienestar', areaId: 'bienestar' },
  { id: 'objetivos', label: 'Objetivos personales', areaId: 'desarrollo' },
  { id: 'explorar', label: 'Explorar por mi cuenta', areaId: null },
]

export function saveFocusIntent(areaId: string | null): void {
  try {
    if (areaId) window.localStorage.setItem(ONBOARDING_FOCUS_KEY, areaId)
    else window.localStorage.removeItem(ONBOARDING_FOCUS_KEY)
  } catch {
    // No es crítico: en el peor caso el onboarding no llega preseleccionado.
  }
}

/** Lee y consume (borra) el foco elegido en el registro — se usa una sola vez. */
export function consumeFocusIntent(): string | null {
  try {
    const value = window.localStorage.getItem(ONBOARDING_FOCUS_KEY)
    window.localStorage.removeItem(ONBOARDING_FOCUS_KEY)
    return value
  } catch {
    return null
  }
}
