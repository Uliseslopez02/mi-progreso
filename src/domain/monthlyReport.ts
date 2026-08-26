/**
 * Informe del mes en curso: reorganiza cómputo que ya existe en `scoring.ts`/
 * `consistency.ts` (nada de dominio nuevo) para la pantalla Informes. Sólo
 * mira los días que ya ocurrieron dentro del mes — los que todavía no llegan
 * no cuentan ni a favor ni en contra.
 */
import { categoryConsistency, goalConsistency } from './consistency'
import { addMonths, diffDays, formatWeekday, monthDays, startOfMonth, type DateKey } from './date'
import { aggregate, computeDayStats, computeStreak, percentFor, type AggregateStats } from './scoring'
import type { DayRecord, PlannerItem } from './types'

export interface CategoryScore {
  name: string
  percent: number
}

export interface WeekdayScore {
  day: string
  average: number
}

export interface PlannedVsRealized {
  planned: number
  done: number
  percent: number
}

export interface MonthlyReport {
  monthStart: DateKey
  daysElapsed: number
  stats: AggregateStats
  /** Racha actual (puede haber empezado en el mes anterior). */
  streak: number
  /** Racha más larga dentro de los días del mes en curso. */
  bestStreakInMonth: number
  bestCategory: CategoryScore | null
  worstCategory: CategoryScore | null
  /** Días del mes con 100% de cumplimiento. */
  perfectDays: number
  /** `null` si el mes anterior no tiene ningún día registrado. */
  previousMonthAverage: number | null
  /** `stats.average - previousMonthAverage`, `null` en las mismas condiciones. */
  deltaVsPreviousMonth: number | null
  mostConsistentGoal: CategoryScore | null
  /** `null` si sólo hay un objetivo (sería el mismo que `mostConsistentGoal`). */
  hardestGoal: CategoryScore | null
  bestWeekday: WeekdayScore | null
  plannedVsRealized: PlannedVsRealized
}

function monthKeysUpToToday(today: DateKey): DateKey[] {
  // diffDays(key, today) = today - key: >= 0 significa que `key` ya ocurrió (es hoy o antes).
  return monthDays(startOfMonth(today)).filter((key) => diffDays(key, today) >= 0)
}

function longestStreakInRange(
  days: Record<string, DayRecord>,
  keys: DateKey[],
  threshold: number,
): number {
  let best = 0
  let running = 0
  for (const key of keys) {
    if (days[key] && percentFor(days, key) >= threshold) {
      running += 1
      best = Math.max(best, running)
    } else {
      running = 0
    }
  }
  return best
}

function bestWeekdayFor(days: Record<string, DayRecord>, keys: DateKey[]): WeekdayScore | null {
  const sums = new Map<string, { total: number; count: number }>()
  for (const key of keys) {
    if (!days[key]) continue
    const day = formatWeekday(key)
    const entry = sums.get(day) ?? { total: 0, count: 0 }
    entry.total += percentFor(days, key)
    entry.count += 1
    sums.set(day, entry)
  }
  let best: WeekdayScore | null = null
  for (const [day, { total, count }] of sums) {
    const average = Math.round(total / count)
    if (!best || average > best.average) best = { day, average }
  }
  return best
}

function plannedVsRealizedFor(plannerItems: PlannerItem[], keys: DateKey[]): PlannedVsRealized {
  const monthItems = plannerItems.filter((i) => keys.includes(i.date))
  const done = monthItems.filter((i) => i.done).length
  return {
    planned: monthItems.length,
    done,
    percent: monthItems.length === 0 ? 0 : Math.round((done / monthItems.length) * 100),
  }
}

export function monthlyReport(
  days: Record<string, DayRecord>,
  plannerItems: PlannerItem[],
  today: DateKey,
  threshold: number,
): MonthlyReport {
  const monthStart = startOfMonth(today)
  const keys = monthKeysUpToToday(today)
  const stats = aggregate(days, keys)
  // Sólo objetivos diarios clásicos: los hábitos no puntúan el día, mismo criterio que computeDayStats.
  const categories = categoryConsistency(days, keys, 'goal')
  const goals = goalConsistency(days, keys, 'goal')

  const previousMonthStats = aggregate(days, monthDays(addMonths(monthStart, -1)))
  const previousMonthAverage = previousMonthStats.daysWithRecord > 0 ? previousMonthStats.average : null

  return {
    monthStart,
    daysElapsed: keys.length,
    stats,
    streak: computeStreak(days, today, threshold),
    bestStreakInMonth: longestStreakInRange(days, keys, threshold),
    bestCategory: categories[0] ? { name: categories[0].name, percent: categories[0].percent } : null,
    worstCategory:
      categories.length > 1
        ? {
            name: categories[categories.length - 1].name,
            percent: categories[categories.length - 1].percent,
          }
        : null,
    perfectDays: keys.filter((key) => days[key] && computeDayStats(days[key]).percent === 100).length,
    previousMonthAverage,
    deltaVsPreviousMonth: previousMonthAverage === null ? null : stats.average - previousMonthAverage,
    mostConsistentGoal: goals[0] ? { name: goals[0].name, percent: goals[0].percent } : null,
    hardestGoal:
      goals.length > 1 ? { name: goals[goals.length - 1].name, percent: goals[goals.length - 1].percent } : null,
    bestWeekday: bestWeekdayFor(days, keys),
    plannedVsRealized: plannedVsRealizedFor(plannerItems, keys),
  }
}
