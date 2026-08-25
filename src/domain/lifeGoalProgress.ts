/**
 * Progreso y ritmo de una meta de largo plazo. `progress` (0-100) es siempre el
 * número guardado en `LifeGoal` — este archivo decide *cómo* se calcula según
 * `kind`, para que el reducer lo recalcule en un solo lugar (ver
 * `state/reducer.ts`) y el resto de la app (`lifeGoalHealth.ts`, filtros) siga
 * leyendo `progress` sin saber nada de tipos.
 */
import { diffDays, type DateKey } from './date'
import type { LifeGoal, Milestone } from './types'

const clampPercent = (n: number): number => Math.max(0, Math.min(100, Math.round(n)))

export function computeLifeGoalProgress(goal: LifeGoal): number {
  const kind = goal.kind ?? 'percentage'

  switch (kind) {
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
