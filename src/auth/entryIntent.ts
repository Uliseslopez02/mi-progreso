/**
 * Puente liviano y no sensible entre la pantalla final del registro (sesión
 * inmediata, sin confirmación de email) y `AppShell`: qué tan directo entrar
 * a crear vs. explorar. Un valor en localStorage, de un solo uso — mismo
 * patrón que focusIntent.ts.
 */

export const ENTRY_INTENT_KEY = 'mi-progreso:entry-intent'

export type EntryIntent = 'createHabit' | 'explore'

export function saveEntryIntent(intent: EntryIntent): void {
  try {
    window.localStorage.setItem(ENTRY_INTENT_KEY, intent)
  } catch {
    // No es crítico: en el peor caso se ve el onboarding por defecto.
  }
}

/** Lee y consume (borra) la intención elegida al terminar el registro — se usa una sola vez. */
export function consumeEntryIntent(): EntryIntent | null {
  try {
    const value = window.localStorage.getItem(ENTRY_INTENT_KEY)
    window.localStorage.removeItem(ENTRY_INTENT_KEY)
    return value === 'createHabit' || value === 'explore' ? value : null
  } catch {
    return null
  }
}
