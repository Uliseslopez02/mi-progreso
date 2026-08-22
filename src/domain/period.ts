/**
 * Objetivos semanales y mensuales: mismo mecanismo que day.ts (snapshot +
 * completado), pero con una ventana más larga. `periodStart` es el lunes de
 * la semana o el día 1 del mes; la clave del registro combina tipo y arranque
 * para que semana y mes convivan en el mismo diccionario sin choques.
 */
import type { DateKey } from './date'
import { startOfMonth, startOfWeek } from './date'
import type { AppData, Category, Goal, GoalSnapshot, PeriodRecord, RecurringPeriod } from './types'

export function periodStartFor(date: DateKey, period: RecurringPeriod): DateKey {
  return period === 'weekly' ? startOfWeek(date) : startOfMonth(date)
}

export function periodKey(period: RecurringPeriod, periodStart: DateKey): string {
  return `${period}:${periodStart}`
}

export function snapshotPeriodGoals(
  goals: Goal[],
  categories: Category[],
  period: RecurringPeriod,
): GoalSnapshot[] {
  const categoryName = new Map(categories.map((c) => [c.id, c.name]))
  return goals
    .filter((g) => g.active && g.period === period)
    .sort((a, b) => a.order - b.order)
    .map((g) => ({
      goalId: g.id,
      name: g.name,
      categoryId: g.categoryId,
      categoryName: categoryName.get(g.categoryId) ?? 'Sin categoría',
      weight: g.weight > 0 ? g.weight : 1,
      kind: g.kind,
      targetValue: g.targetValue,
      unit: g.unit,
      trackingKind: g.trackingKind,
    }))
}

/**
 * Igual que ensureDay: crea o resincroniza el registro del período vigente.
 * Si no hay objetivos de ese tipo, no crea nada — así la tarjeta "Objetivos
 * de la semana" no aparece vacía hasta que el usuario agregue uno.
 */
export function ensurePeriod(data: AppData, period: RecurringPeriod, today: DateKey): AppData {
  const periodStart = periodStartFor(today, period)
  const key = periodKey(period, periodStart)
  const existing = data.periods[key]
  const goals = snapshotPeriodGoals(data.goals, data.categories, period)

  if (!existing) {
    if (goals.length === 0) return data
    const record: PeriodRecord = {
      key,
      period,
      periodStart,
      goals,
      goalProgress: {},
      closed: false,
    }
    return { ...data, periods: { ...data.periods, [key]: record } }
  }

  if (sameSnapshot(existing.goals, goals) && !existing.closed) return data

  const validIds = new Set(goals.map((g) => g.goalId))
  const goalProgress = Object.fromEntries(
    Object.entries(existing.goalProgress).filter(([id]) => validIds.has(id))
  )

  const record: PeriodRecord = {
    ...existing,
    goals,
    goalProgress,
    closed: false,
  }
  return { ...data, periods: { ...data.periods, [key]: record } }
}

/** Marca como cerrado todo período que ya no sea la semana/mes actual. */
export function closePastPeriods(data: AppData, today: DateKey): AppData {
  const current = new Set<string>([
    periodKey('weekly', periodStartFor(today, 'weekly')),
    periodKey('monthly', periodStartFor(today, 'monthly')),
  ])

  let changed = false
  const periods: Record<string, PeriodRecord> = {}
  for (const [key, record] of Object.entries(data.periods)) {
    if (!current.has(key) && !record.closed) {
      periods[key] = { ...record, closed: true }
      changed = true
    } else {
      periods[key] = record
    }
  }
  return changed ? { ...data, periods } : data
}

function sameSnapshot(a: GoalSnapshot[], b: GoalSnapshot[]): boolean {
  if (a.length !== b.length) return false
  return a.every((goal, i) =>
    goal.goalId === b[i].goalId &&
    goal.name === b[i].name &&
    goal.weight === b[i].weight &&
    goal.categoryId === b[i].categoryId &&
    goal.categoryName === b[i].categoryName &&
    goal.kind === b[i].kind &&
    goal.targetValue === b[i].targetValue &&
    goal.unit === b[i].unit &&
    goal.trackingKind === b[i].trackingKind,
  )
}

export function togglePeriodGoal(record: PeriodRecord, goalId: string, delta: number | boolean = true): PeriodRecord {
  const snapshot = record.goals.find((g) => g.goalId === goalId)
  if (!snapshot) return record

  const current = record.goalProgress[goalId] ?? 0
  let next: number | boolean

  if (snapshot.kind === 'boolean') {
    next = typeof current === 'boolean' ? !current : !current
  } else {
    if (typeof delta !== 'number') delta = 1
    const numCurrent = typeof current === 'number' ? current : 0
    next = Math.max(0, numCurrent + delta)
    if (snapshot.targetValue && next > snapshot.targetValue) {
      next = snapshot.targetValue
    }
  }

  return {
    ...record,
    goalProgress: {
      ...record.goalProgress,
      [goalId]: next,
    },
  }
}
