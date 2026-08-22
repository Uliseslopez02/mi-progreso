/** Utilidades de fecha en horario local (nunca UTC, para que "hoy" sea hoy). */

export type DateKey = string // YYYY-MM-DD

const pad = (n: number) => String(n).padStart(2, '0')

export function toDateKey(date: Date): DateKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function fromDateKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayKey(now: Date = new Date()): DateKey {
  return toDateKey(now)
}

export function addDays(key: DateKey, days: number): DateKey {
  const d = fromDateKey(key)
  d.setDate(d.getDate() + days)
  return toDateKey(d)
}

/** Diferencia en días entre dos claves (b - a). */
export function diffDays(a: DateKey, b: DateKey): number {
  const ms = fromDateKey(b).getTime() - fromDateKey(a).getTime()
  return Math.round(ms / 86_400_000)
}

/** Lunes de la semana a la que pertenece la fecha. */
export function startOfWeek(key: DateKey): DateKey {
  const d = fromDateKey(key)
  const dow = (d.getDay() + 6) % 7 // 0 = lunes
  return addDays(key, -dow)
}

export function weekDays(mondayKey: DateKey): DateKey[] {
  return Array.from({ length: 7 }, (_, i) => addDays(mondayKey, i))
}

/** Rango de claves [desde, hasta] inclusive. */
export function rangeKeys(from: DateKey, to: DateKey): DateKey[] {
  const out: DateKey[] = []
  for (let k = from; diffDays(k, to) >= 0; k = addDays(k, 1)) out.push(k)
  return out
}

const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const DAY_NAMES_ENGLISH = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
const DAY_SHORT = ['D', 'L', 'M', 'M', 'J', 'V', 'S']
const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** "Martes 18 de agosto" */
export function formatLongDate(key: DateKey): string {
  const d = fromDateKey(key)
  return capitalize(`${DAY_NAMES[d.getDay()]} ${d.getDate()} de ${MONTH_NAMES[d.getMonth()]}`)
}

/** "18/08" */
export function formatShortDate(key: DateKey): string {
  const d = fromDateKey(key)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** "Martes" */
export function formatWeekday(key: DateKey): string {
  return capitalize(DAY_NAMES[fromDateKey(key).getDay()])
}

/** "Agosto 2026" */
export function formatMonthYear(key: DateKey): string {
  const d = fromDateKey(key)
  return capitalize(`${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`)
}

export const weekdayInitials = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
export { DAY_SHORT }

/** Días lunes→domingo en inglés, mismo orden que `weekdayInitials`, para el selector de frecuencia. */
export const WEEKDAY_KEYS = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
]

export function startOfMonth(key: DateKey): DateKey {
  const d = fromDateKey(key)
  return toDateKey(new Date(d.getFullYear(), d.getMonth(), 1))
}

export function addMonths(key: DateKey, months: number): DateKey {
  const d = fromDateKey(key)
  return toDateKey(new Date(d.getFullYear(), d.getMonth() + months, 1))
}

/** Todas las fechas del mes de `key`. */
export function monthDays(key: DateKey): DateKey[] {
  const d = fromDateKey(key)
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  return Array.from({ length: last }, (_, i) =>
    toDateKey(new Date(d.getFullYear(), d.getMonth(), i + 1)),
  )
}

/** Día de la semana en inglés (monday, tuesday, ...) para daysOfWeek. */
export function getDayOfWeekEnglish(key: DateKey): string {
  return DAY_NAMES_ENGLISH[fromDateKey(key).getDay()]
}
