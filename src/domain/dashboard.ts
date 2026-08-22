/**
 * Cómputo puro para el dashboard (`TodayPage`): saludo, prioridad principal,
 * rutina activa, próximo evento y rachas activas. Todo se deriva de datos ya
 * persistidos — nada de texto inventado, mismo criterio que `lifeGoalHealth.ts`.
 */
import { goalStreaks } from './consistency'
import type { DateKey } from './date'
import { getRoutineRun, routineProgress } from './routine'
import type { DayRecord, Goal, PlannerItem, Routine, RoutineRun } from './types'

export function greetingForHour(hour: number): string {
  if (hour < 6) return 'Buenas noches'
  if (hour < 12) return 'Buenos días'
  if (hour < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

export interface ActiveStreak {
  id: string
  name: string
  current: number
}

/** Objetivos/hábitos activos con racha en curso (>0), los más largos primero. */
export function topActiveStreaks(
  goals: Goal[],
  days: Record<string, DayRecord>,
  today: DateKey,
  limit = 3,
): ActiveStreak[] {
  return goals
    .filter((g) => g.active)
    .map((g) => ({ id: g.id, name: g.name, current: goalStreaks(days, g.id, today).current }))
    .filter((s) => s.current > 0)
    .sort((a, b) => b.current - a.current)
    .slice(0, limit)
}

const PRIORITY_RANK: Record<PlannerItem['priority'], number> = { high: 0, medium: 1, low: 2 }

/** Tarea pendiente de hoy de mayor prioridad (alta > media > baja, después por orden). */
export function mainPriorityToday(plannerItems: PlannerItem[], today: DateKey): PlannerItem | null {
  const pending = plannerItems.filter((i) => i.date === today && i.type === 'task' && !i.done)
  if (pending.length === 0) return null
  return [...pending].sort(
    (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.order - b.order,
  )[0]
}

/** Primer evento pendiente de hoy, por orden. */
export function nextEventToday(plannerItems: PlannerItem[], today: DateKey): PlannerItem | null {
  const pending = plannerItems
    .filter((i) => i.date === today && i.type === 'event' && !i.done)
    .sort((a, b) => a.order - b.order)
  return pending[0] ?? null
}

export interface ActiveRoutineToday {
  routine: Routine
  done: number
  total: number
  percent: number
}

/** Primera rutina activa (por orden) que hoy todavía no se completó del todo. */
export function activeRoutineToday(
  routines: Routine[],
  routineRuns: Record<string, RoutineRun>,
  today: DateKey,
): ActiveRoutineToday | null {
  const ordered = [...routines].filter((r) => r.active).sort((a, b) => a.order - b.order)
  for (const routine of ordered) {
    const run = getRoutineRun(routineRuns, routine.id, today)
    const progress = routineProgress(routine, run)
    if (progress.total > 0 && progress.done < progress.total) {
      return { routine, ...progress }
    }
  }
  return null
}
