import type { AppData, FocusSession, UserPlan } from '../domain/types'

/**
 * Contrato de persistencia. La UI sólo conoce esta interfaz, así que el día que
 * exista un backend alcanza con escribir otra implementación (HttpRepository)
 * y pasarla en main.tsx: no hay que tocar componentes ni estado.
 *
 * `loadFocusSessions`/`saveFocusSession` son la excepción al patrón
 * `load/save` de un solo blob: el historial de enfoque crece sin límite
 * superior, así que se persiste sesión por sesión (una escritura al
 * terminarla), no reenviando todo el historial en cada guardado con debounce.
 *
 * `getUserPlan` es de sólo lectura a propósito: todavía no hay forma de
 * cambiar de plan desde la app (sin cobros), así que no existe un `setUserPlan`.
 *
 * `completeOnboarding`/`getOnboardingCompleted` persisten en el perfil si la
 * cuenta ya pasó por el onboarding (o lo saltó a propósito) — hoy la UI decide
 * qué mostrar con una señal local más inmediata (ver `onboarding/onboardingStatus.ts`,
 * sin este viaje de red), pero este flag queda disponible server-side, por
 * cuenta, para lo que haga falta después (panel propio, IA, otro dispositivo).
 */
export interface ProgressRepository {
  load(): Promise<AppData | null>
  save(data: AppData): Promise<void>
  clear(): Promise<void>
  loadFocusSessions(): Promise<FocusSession[]>
  saveFocusSession(session: FocusSession): Promise<void>
  getUserPlan(): Promise<UserPlan>
  getOnboardingCompleted(): Promise<boolean>
  completeOnboarding(): Promise<void>
}
