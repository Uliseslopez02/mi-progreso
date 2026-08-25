/**
 * Utilidades de hora del día ("HH:MM" local), separado de `date.ts` a propósito:
 * ese archivo sólo trabaja con `DateKey` (día calendario), esto es hora dentro del día.
 */

const pad = (n: number) => String(n).padStart(2, '0')

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function minutesToTime(minutes: number): string {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, Math.round(minutes)))
  return `${pad(Math.floor(clamped / 60))}:${pad(clamped % 60)}`
}

/** Redondea al múltiplo de `step` minutos más cercano (default 15, para que el arrastre "enganche"). */
export function snapMinutes(minutes: number, step = 15): number {
  return Math.round(minutes / step) * step
}

/** "08:00" → "8:00" (sin cero a la izquierda en la hora, más natural para leer). */
export function formatTime(time: string): string {
  const [h, m] = time.split(':')
  return `${Number(h)}:${m}`
}

/** "08:00" + 30 → "8:00–8:30". La duración puede cruzar medianoche (ej. 23:45 + 30 → 0:15). */
export function formatTimeRange(startTime: string, durationMinutes: number): string {
  const endTime = minutesToTime((timeToMinutes(startTime) + durationMinutes) % (24 * 60))
  return `${formatTime(startTime)}–${formatTime(endTime)}`
}
