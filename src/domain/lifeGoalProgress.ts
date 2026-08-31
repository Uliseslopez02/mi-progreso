/**
 * Progreso y ritmo de una meta de largo plazo. `progress` (0-100) es siempre el
 * número guardado en `LifeGoal` — este archivo decide *cómo* se calcula según
 * `kind`, para que el reducer lo recalcule en un solo lugar (ver
 * `state/reducer.ts`) y el resto de la app (`lifeGoalHealth.ts`, filtros) siga
 * leyendo `progress` sin saber nada de tipos.
 */
import { addDays, diffDays, rangeKeys, type DateKey } from './date'
import { goalConsistency } from './consistency'
import type { DayRecord, LifeGoal, Milestone } from './types'

const clampPercent = (n: number): number => Math.max(0, Math.min(100, Math.round(n)))

/** Ventana móvil para el cálculo de `kind: 'habits'` — ver `habitsProgress`. */
const HABITS_WINDOW_DAYS = 30

/** Punto de partida de la ventana de 30 días, acotado por la fecha de creación
 * de la meta si es más reciente (no penaliza días previos a su creación). */
function habitsWindowStart(goal: LifeGoal, today: DateKey): DateKey {
  const createdOn = goal.createdAt.slice(0, 10)
  const windowStart = addDays(today, -(HABITS_WINDOW_DAYS - 1))
  return createdOn > windowStart ? createdOn : windowStart
}

export interface HabitsProgressBreakdown {
  /** Cuántos hábitos tiene vinculados la meta ahora mismo. */
  linkedHabitCount: number
  /** Días reales considerados en la ventana (puede ser menor a 30 si la meta es nueva). */
  windowDays: number
  /** Suma de días en que los hábitos vinculados estaban vigentes, en la ventana. */
  daysPresent: number
  /** De esos, cuántos se cumplieron. */
  daysCompleted: number
  percent: number
}

/**
 * Desglose real detrás del % de una meta `kind: 'habits'` — única fuente de
 * verdad tanto para `habitsProgress` (usado por el reducer) como para la
 * explicación en la UI ("cumpliste X de Y") y los agregados que recibe la IA
 * de sugerencias proactivas: ningún consumidor puede mostrar un número que
 * contradiga a otro, porque todos parten de este mismo cálculo.
 */
export function habitsProgressBreakdown(
  goal: LifeGoal,
  days: Record<string, DayRecord>,
  today: DateKey,
): HabitsProgressBreakdown {
  const from = habitsWindowStart(goal, today)
  const windowDays = diffDays(from, today) + 1
  if (goal.linkedHabitIds.length === 0) {
    return { linkedHabitCount: 0, windowDays, daysPresent: 0, daysCompleted: 0, percent: 0 }
  }
  const keys = rangeKeys(from, today)
  const consistency = goalConsistency(days, keys, 'habit').filter((c) => goal.linkedHabitIds.includes(c.id))
  const daysPresent = consistency.reduce((sum, c) => sum + c.daysPresent, 0)
  const daysCompleted = consistency.reduce((sum, c) => sum + c.daysCompleted, 0)
  const percent = daysPresent === 0 ? 0 : clampPercent((daysCompleted / daysPresent) * 100)
  return { linkedHabitCount: goal.linkedHabitIds.length, windowDays, daysPresent, daysCompleted, percent }
}

/**
 * Progreso de una meta tipo `'habits'`: promedio de cumplimiento de sus
 * hábitos vinculados (`linkedHabitIds`) en la ventana de `habitsProgressBreakdown`.
 */
function habitsProgress(goal: LifeGoal, days: Record<string, DayRecord>, today: DateKey): number {
  return habitsProgressBreakdown(goal, days, today).percent
}

export function computeLifeGoalProgress(
  goal: LifeGoal,
  days: Record<string, DayRecord> = {},
  today: DateKey = goal.createdAt.slice(0, 10),
): number {
  const kind = goal.kind ?? 'percentage'

  switch (kind) {
    case 'habits':
      return habitsProgress(goal, days, today)
    case 'checklist': {
      if (goal.subGoals.length === 0) return 0
      const done = goal.subGoals.filter((s) => s.done).length
      return clampPercent((done / goal.subGoals.length) * 100)
    }
    case 'milestones': {
      const milestones = goal.milestones ?? []
      if (milestones.length === 0) return 0
      const done = milestones.filter((m) => m.done).length
      return clampPercent((done / milestones.length) * 100)
    }
    case 'quantity':
    case 'money':
    case 'hours':
    case 'sessions': {
      const target = goal.targetValue
      if (!target || target <= 0) return 0
      const current = goal.currentValue ?? 0
      return clampPercent((current / target) * 100)
    }
    case 'percentage':
    default:
      return clampPercent(goal.progress ?? 0)
  }
}

export type PaceStatus = 'ahead' | 'on-pace' | 'behind'

/** Margen de puntos porcentuales antes de calificar adelantado/retrasado, para no parpadear. */
const PACE_MARGIN = 10

/** `null` si no hay fecha objetivo o la meta no está activa — no hay ritmo que calificar. */
export function pace(goal: LifeGoal, today: DateKey): PaceStatus | null {
  if (!goal.targetDate || goal.status !== 'active') return null

  const start = goal.createdAt.slice(0, 10)
  const totalDays = diffDays(start, goal.targetDate)
  if (totalDays <= 0) return null

  const elapsed = diffDays(start, today)
  const expected = clampPercent((elapsed / totalDays) * 100)
  const actual = computeLifeGoalProgress(goal)
  const delta = actual - expected

  if (delta > PACE_MARGIN) return 'ahead'
  if (delta < -PACE_MARGIN) return 'behind'
  return 'on-pace'
}

/** El hito no completado más próximo (por fecha si la tiene, si no por orden de creación). */
export function nextMilestone(goal: LifeGoal): Milestone | null {
  const pending = (goal.milestones ?? []).filter((m) => !m.done)
  if (pending.length === 0) return null
  return [...pending].sort((a, b) => {
    if (a.targetDate && b.targetDate) return a.targetDate < b.targetDate ? -1 : 1
    if (a.targetDate) return -1
    if (b.targetDate) return 1
    return 0
  })[0]
}
