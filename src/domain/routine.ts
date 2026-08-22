import type { DateKey } from './date'
import type { Routine, RoutineRun } from './types'

export function routineRunKey(routineId: string, date: DateKey): string {
  return `${routineId}:${date}`
}

export function getRoutineRun(
  routineRuns: Record<string, RoutineRun>,
  routineId: string,
  date: DateKey,
): RoutineRun | undefined {
  return routineRuns[routineRunKey(routineId, date)]
}

/**
 * Progreso de una rutina en un día concreto. Filtra `completedStepIds` contra
 * los pasos vigentes: si un paso se borró después de haberse marcado, no
 * cuenta ni para el numerador ni figura como completado.
 */
export function routineProgress(
  routine: Routine,
  run: RoutineRun | undefined,
): { done: number; total: number; percent: number } {
  const total = routine.steps.length
  if (total === 0) return { done: 0, total: 0, percent: 0 }
  const validIds = new Set(routine.steps.map((s) => s.id))
  const done = (run?.completedStepIds ?? []).filter((id) => validIds.has(id)).length
  return { done, total, percent: Math.round((done / total) * 100) }
}
