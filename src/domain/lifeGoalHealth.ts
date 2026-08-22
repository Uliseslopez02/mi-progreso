/**
 * Salud de las metas de largo plazo. No hay historial de progreso guardado
 * (`LifeGoal.progress` es un valor manual, no una serie), así que "estancada"
 * se infiere sólo con datos reales que sí tenemos: progreso en 0 y tiempo
 * transcurrido desde que se creó — nada inventado.
 */
import { diffDays, type DateKey } from './date'
import type { LifeGoal } from './types'

/** Días sin ningún avance para considerar estancada una meta activa. */
const STALLED_DAYS = 14

export interface LifeGoalHealth {
  /** Activa, con fecha objetivo vencida y todavía sin completar. */
  overdue: LifeGoal[]
  /** Activa, sin fecha vencida, en 0% desde hace `STALLED_DAYS` días o más. */
  stalled: LifeGoal[]
  abandoned: LifeGoal[]
}

export function lifeGoalHealth(lifeGoals: LifeGoal[], today: DateKey): LifeGoalHealth {
  const overdue: Array<{ goal: LifeGoal; daysOverdue: number }> = []
  const stalled: Array<{ goal: LifeGoal; daysSinceCreated: number }> = []
  const abandoned: LifeGoal[] = []

  for (const goal of lifeGoals) {
    if (goal.status === 'abandoned') {
      abandoned.push(goal)
      continue
    }
    if (goal.status !== 'active') continue

    if (goal.targetDate && goal.targetDate < today && goal.progress < 100) {
      overdue.push({ goal, daysOverdue: diffDays(goal.targetDate, today) })
      continue
    }

    if (goal.progress === 0) {
      const daysSinceCreated = diffDays(goal.createdAt.slice(0, 10), today)
      if (daysSinceCreated >= STALLED_DAYS) {
        stalled.push({ goal, daysSinceCreated })
      }
    }
  }

  return {
    overdue: overdue.sort((a, b) => b.daysOverdue - a.daysOverdue).map((e) => e.goal),
    stalled: stalled.sort((a, b) => b.daysSinceCreated - a.daysSinceCreated).map((e) => e.goal),
    abandoned: abandoned.sort((a, b) => a.name.localeCompare(b.name, 'es')),
  }
}
