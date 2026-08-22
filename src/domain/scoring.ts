/**
 * Cálculo del progreso. Todo lo de este archivo es puro: entra data, sale número.
 * El porcentaje sale siempre de los objetivos reales del día, nunca de valores fijos.
 */
import type { DateKey } from './date'
import { addDays, diffDays, startOfWeek, weekDays } from './date'
import type { DayRecord, GoalSnapshot } from './types'

/** Lo mínimo que hace falta para calcular un progreso: día o período, da igual. */
export interface Completable {
  goals: GoalSnapshot[]
  goalProgress: Record<string, number | boolean>
}

export interface DayStats {
  /** Porcentaje exacto, sin redondear (0–100). */
  percentExact: number
  /** Porcentaje que se muestra en pantalla (entero). */
  percent: number
  /** Nota 0–10 derivada del porcentaje mostrado, siempre coherente con él. */
  grade: number
  completedCount: number
  totalCount: number
  completedWeight: number
  totalWeight: number
}

export const EMPTY_DAY_STATS: DayStats = {
  percentExact: 0,
  percent: 0,
  grade: 0,
  completedCount: 0,
  totalCount: 0,
  completedWeight: 0,
  totalWeight: 0,
}

export function computeDayStats(day: Completable | undefined): DayStats {
  if (!day) return EMPTY_DAY_STATS
  // Los hábitos se trackean aparte (racha/consistencia) y no puntúan el día.
  const goals = day.goals.filter((g) => g.trackingKind !== 'habit')
  if (goals.length === 0) return EMPTY_DAY_STATS

  let totalWeight = 0
  let completedWeight = 0
  let completedCount = 0

  for (const goal of goals) {
    const weight = goal.weight > 0 ? goal.weight : 1
    totalWeight += weight

    const progress = day.goalProgress[goal.goalId] ?? 0

    if (goal.kind === 'boolean') {
      // Booleano: 0 o 1
      if (progress) {
        completedWeight += weight
        completedCount += 1
      }
    } else {
      // Cuantitativo/temporal: progress / targetValue * weight
      const numProgress = typeof progress === 'number' ? progress : 0
      const ratio = goal.targetValue ? Math.min(1, numProgress / goal.targetValue) : numProgress ? 1 : 0
      completedWeight += weight * ratio
      // Contar como "completado" solo si alcanzó el 100%
      if (ratio >= 1) completedCount += 1
    }
  }

  if (totalWeight === 0) return EMPTY_DAY_STATS

  const percentExact = (completedWeight / totalWeight) * 100
  const percent = Math.round(percentExact)

  return {
    percentExact,
    percent,
    grade: percent / 10,
    completedCount,
    totalCount: goals.length,
    completedWeight,
    totalWeight,
  }
}

/** Frase del día. Tono adulto: reconoce el resultado sin festejarlo de más. */
export function messageForPercent(percent: number): string {
  if (percent >= 100) return 'Día perfecto. Completaste todos tus objetivos.'
  if (percent >= 85) return 'Excelente. Estuviste muy enfocado.'
  if (percent >= 70) return 'Muy buen día.'
  if (percent >= 50) return 'Buen esfuerzo. Seguí construyendo.'
  if (percent >= 30) return 'Hay margen para mejorar.'
  return 'Hoy fue un día difícil. Mañana es una nueva oportunidad.'
}

/** Etiqueta corta para acompañar la nota. */
export function labelForPercent(percent: number): string {
  if (percent >= 100) return 'Día perfecto'
  if (percent >= 85) return 'Excelente'
  if (percent >= 70) return 'Muy buen día'
  if (percent >= 50) return 'Buen esfuerzo'
  if (percent >= 30) return 'Por debajo'
  return 'Día difícil'
}

/** Banda de color usada por el calendario. */
export type ProgressBand = 'none' | 'low' | 'mid' | 'good' | 'high' | 'top'

export function bandForPercent(percent: number, hasRecord = true): ProgressBand {
  if (!hasRecord) return 'none'
  if (percent >= 90) return 'top'
  if (percent >= 75) return 'high'
  if (percent >= 50) return 'good'
  if (percent >= 25) return 'mid'
  return 'low'
}

export function percentFor(days: Record<string, DayRecord>, key: DateKey): number {
  return computeDayStats(days[key]).percent
}

/**
 * Racha: días consecutivos que alcanzaron el mínimo.
 * Si hoy todavía no llegó al mínimo, la racha se mide desde ayer, así no se
 * "pierde" la racha por mirar la app a la mañana.
 */
export function computeStreak(
  days: Record<string, DayRecord>,
  today: DateKey,
  threshold: number,
): number {
  let cursor = today
  if (percentFor(days, today) < threshold) {
    cursor = addDays(today, -1)
  }
  let streak = 0
  while (percentFor(days, cursor) >= threshold) {
    streak += 1
    cursor = addDays(cursor, -1)
  }
  return streak
}

export interface SeriesPoint {
  date: DateKey
  percent: number
  hasRecord: boolean
}

/** Serie diaria para el gráfico de historial (últimos `count` días hasta `today`). */
export function historySeries(
  days: Record<string, DayRecord>,
  today: DateKey,
  count: number,
): SeriesPoint[] {
  const out: SeriesPoint[] = []
  for (let i = count - 1; i >= 0; i--) {
    const date = addDays(today, -i)
    const record = days[date]
    out.push({
      date,
      percent: computeDayStats(record).percent,
      hasRecord: Boolean(record),
    })
  }
  return out
}

export interface AggregateStats {
  average: number
  best: { date: DateKey; percent: number } | null
  worst: { date: DateKey; percent: number } | null
  daysWithRecord: number
  completedGoals: number
}

/** Promedio / mejor / peor sobre los días que efectivamente tienen registro. */
export function aggregate(
  days: Record<string, DayRecord>,
  keys: DateKey[],
): AggregateStats {
  let sum = 0
  let count = 0
  let completedGoals = 0
  let best: AggregateStats['best'] = null
  let worst: AggregateStats['worst'] = null

  for (const key of keys) {
    const record = days[key]
    if (!record) continue
    const stats = computeDayStats(record)
    sum += stats.percent
    count += 1
    completedGoals += stats.completedCount
    if (!best || stats.percent > best.percent) best = { date: key, percent: stats.percent }
    if (!worst || stats.percent < worst.percent) worst = { date: key, percent: stats.percent }
  }

  return {
    average: count === 0 ? 0 : Math.round(sum / count),
    best,
    worst,
    daysWithRecord: count,
    completedGoals,
  }
}

export interface WeekSummary extends AggregateStats {
  weekStart: DateKey
  previousAverage: number | null
  /** Diferencia en puntos porcentuales contra la semana anterior. */
  delta: number | null
  streak: number
}

export function weekSummary(
  days: Record<string, DayRecord>,
  today: DateKey,
  threshold: number,
): WeekSummary {
  const weekStart = startOfWeek(today)
  // Sólo hasta hoy: los días que todavía no ocurrieron no bajan el promedio.
  const currentKeys = weekDays(weekStart).filter((k) => diffDays(k, today) >= 0)
  const previousKeys = weekDays(addDays(weekStart, -7))

  const current = aggregate(days, currentKeys)
  const previous = aggregate(days, previousKeys)

  return {
    ...current,
    weekStart,
    previousAverage: previous.daysWithRecord > 0 ? previous.average : null,
    delta: previous.daysWithRecord > 0 ? current.average - previous.average : null,
    streak: computeStreak(days, today, threshold),
  }
}

/** "7,2" — una coma decimal y sin decimal inútil (10 en vez de 10,0). */
export function formatGrade(grade: number): string {
  const rounded = Math.round(grade * 10) / 10
  return Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(1).replace('.', ',')
}

export function formatDelta(delta: number): string {
  return `${delta > 0 ? '+' : ''}${delta}%`
}
