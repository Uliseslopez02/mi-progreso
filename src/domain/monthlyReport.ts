/**
 * Informe del mes en curso: reorganiza cómputo que ya existe en `scoring.ts`/
 * `consistency.ts` (nada de dominio nuevo) para la pantalla Informes. Sólo
 * mira los días que ya ocurrieron dentro del mes — los que todavía no llegan
 * no cuentan ni a favor ni en contra.
 */
import { categoryConsistency } from './consistency'
import { diffDays, monthDays, startOfMonth, type DateKey } from './date'
import { aggregate, computeStreak, percentFor, type AggregateStats } from './scoring'
import type { DayRecord } from './types'

export interface CategoryScore {
  name: string
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
}

function monthKeysUpToToday(today: DateKey): DateKey[] {
  return monthDays(startOfMonth(today)).filter((key) => diffDays(key, today) <= 0)
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

export function monthlyReport(
  days: Record<string, DayRecord>,
  today: DateKey,
  threshold: number,
): MonthlyReport {
  const keys = monthKeysUpToToday(today)
  const stats = aggregate(days, keys)
  // Sólo objetivos diarios clásicos: los hábitos no puntúan el día, mismo criterio que computeDayStats.
  const categories = categoryConsistency(days, keys, 'goal')

  return {
    monthStart: startOfMonth(today),
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
  }
}
