/**
 * Genera las fechas concretas de un ítem "recurrente". No hay ninguna entidad de
 * recurrencia guardada: cada fecha se materializa como un `PlannerItem` independiente
 * (mismo criterio de "materializar, no virtualizar" que ya usa `GoalSnapshot`) — cada
 * instancia se edita/borra sola con las acciones que ya existen.
 */
import { addDays, getDayOfWeekEnglish, type DateKey } from './date'

export type RecurrencePattern = 'none' | 'daily' | 'weekdays' | 'weekly'

const WEEKS_AHEAD = 8
const DAILY_HORIZON_DAYS = WEEKS_AHEAD * 7

const WEEKEND_DAYS = new Set(['saturday', 'sunday'])

/** Fechas concretas para el patrón elegido, siempre incluye `anchor` como primera fecha. */
export function recurrenceDates(anchor: DateKey, pattern: RecurrencePattern): DateKey[] {
  switch (pattern) {
    case 'daily':
      return Array.from({ length: DAILY_HORIZON_DAYS }, (_, i) => addDays(anchor, i))
    case 'weekdays':
      return Array.from({ length: DAILY_HORIZON_DAYS }, (_, i) => addDays(anchor, i)).filter(
        (date) => !WEEKEND_DAYS.has(getDayOfWeekEnglish(date)),
      )
    case 'weekly':
      return Array.from({ length: WEEKS_AHEAD }, (_, i) => addDays(anchor, i * 7))
    case 'none':
    default:
      return [anchor]
  }
}
