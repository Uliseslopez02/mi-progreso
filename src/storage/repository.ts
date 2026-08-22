import type { AppData, FocusSession } from '../domain/types'

/**
 * Contrato de persistencia. La UI sólo conoce esta interfaz, así que el día que
 * exista un backend alcanza con escribir otra implementación (HttpRepository)
 * y pasarla en main.tsx: no hay que tocar componentes ni estado.
 *
 * `loadFocusSessions`/`saveFocusSession` son la excepción al patrón
 * `load/save` de un solo blob: el historial de enfoque crece sin límite
 * superior, así que se persiste sesión por sesión (una escritura al
 * terminarla), no reenviando todo el historial en cada guardado con debounce.
 */
export interface ProgressRepository {
  load(): Promise<AppData | null>
  save(data: AppData): Promise<void>
  clear(): Promise<void>
  loadFocusSessions(): Promise<FocusSession[]>
  saveFocusSession(session: FocusSession): Promise<void>
}
