/**
 * Mapa anual de un hábito, estilo heatmap de GitHub: ventana móvil de N
 * semanas terminando hoy (no un calendario Ene-Dic), un hábito a la vez.
 * Sólo compone piezas que ya existen (`goalCompletionOn`, `startOfWeek`,
 * `weekDays`) — no hay regla nueva de cumplimiento.
 */
import { addDays, diffDays, startOfWeek, weekDays, type DateKey } from './date'
import { goalCompletionOn } from './consistency'
import type { DayRecord } from './types'

export type YearMapCellStatus = 'done' | 'missed' | 'no-record' | 'future'

export interface YearMapCell {
  date: DateKey
  status: YearMapCellStatus
}

/** Una semana lunes→domingo (7 celdas). */
export interface YearMapWeek {
  mondayKey: DateKey
  cells: YearMapCell[]
}

export const YEAR_MAP_WEEKS = 53

export function habitYearMap(
  days: Record<string, DayRecord>,
  goalId: string,
  today: DateKey,
  weeksCount: number = YEAR_MAP_WEEKS,
): YearMapWeek[] {
  const lastMonday = startOfWeek(today)
  const firstMonday = addDays(lastMonday, -7 * (weeksCount - 1))

  return Array.from({ length: weeksCount }, (_, i) => {
    const mondayKey = addDays(firstMonday, 7 * i)
    const cells = weekDays(mondayKey).map((date): YearMapCell => {
      if (diffDays(today, date) > 0) return { date, status: 'future' }
      const done = goalCompletionOn(days[date], goalId)
      return { date, status: done === null ? 'no-record' : done ? 'done' : 'missed' }
    })
    return { mondayKey, cells }
  })
}

export interface YearMapSummary {
  daysPresent: number
  daysCompleted: number
  percent: number
}

export function habitYearSummary(weeks: YearMapWeek[]): YearMapSummary {
  let daysPresent = 0
  let daysCompleted = 0
  for (const week of weeks) {
    for (const cell of week.cells) {
      if (cell.status === 'done' || cell.status === 'missed') {
        daysPresent += 1
        if (cell.status === 'done') daysCompleted += 1
      }
    }
  }
  return {
    daysPresent,
    daysCompleted,
    percent: daysPresent === 0 ? 0 : Math.round((daysCompleted / daysPresent) * 100),
  }
}
