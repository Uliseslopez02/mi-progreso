import type { AppData, DayRecord, Goal, GoalFrequency, GoalSnapshot, PeriodRecord } from './types'

/** Migra datos de V1 (completedGoalIds: string[]) a V2 (goalProgress: Record). */
export function migrateV1ToV2(data: AppData): AppData {
  if (data.version >= 2) return data

  // Convertir completedGoalIds (array booleano) a goalProgress (record flexible)
  const days: Record<string, DayRecord> = {}
  for (const [date, record] of Object.entries(data.days)) {
    const goalProgress: Record<string, number | boolean> = {}
    // @ts-ignore — la propiedad vieja no existe en el tipo nuevo
    const oldIds = record.completedGoalIds as string[] | undefined
    if (oldIds) {
      for (const goalId of oldIds) {
        goalProgress[goalId] = true
      }
    }
    days[date] = {
      date: record.date,
      goals: record.goals,
      goalProgress,
      closed: record.closed,
    }
  }

  // Similar para periods
  const periods: Record<string, PeriodRecord> = {}
  for (const [key, record] of Object.entries(data.periods)) {
    const goalProgress: Record<string, number | boolean> = {}
    // @ts-ignore
    const oldIds = record.completedGoalIds as string[] | undefined
    if (oldIds) {
      for (const goalId of oldIds) {
        goalProgress[goalId] = true
      }
    }
    periods[key] = {
      key: record.key,
      period: record.period,
      periodStart: record.periodStart,
      goals: record.goals,
      goalProgress,
      closed: record.closed,
    }
  }

  // Todos los Goals viejos son kind: 'boolean'
  const goals: Goal[] = data.goals.map((g) => ({
    ...g,
    kind: 'boolean',
    targetValue: undefined,
    unit: undefined,
    daysOfWeek: undefined,
  }))

  return {
    ...data,
    version: 2,
    goals,
    days,
    periods,
  }
}

/**
 * Migra V2 (sin `trackingKind`/`frequency`) a V3. Todo objetivo viejo es
 * `trackingKind: 'goal'` (nada cambia de comportamiento); si tenía `daysOfWeek`
 * se convierte a la forma nueva `frequency`.
 */
export function migrateV2ToV3(data: AppData): AppData {
  if (data.version >= 3) return data

  const toFrequency = (daysOfWeek?: string[]): GoalFrequency | undefined =>
    daysOfWeek && daysOfWeek.length > 0 ? { type: 'daysOfWeek', days: daysOfWeek } : undefined

  const goals: Goal[] = data.goals.map((g) => ({
    ...g,
    trackingKind: g.trackingKind ?? 'goal',
    frequency: g.frequency ?? toFrequency(g.daysOfWeek),
  }))

  const withTrackingKind = (snapshot: GoalSnapshot[]): GoalSnapshot[] =>
    snapshot.map((g) => ({ ...g, trackingKind: g.trackingKind ?? 'goal' }))

  const days: Record<string, DayRecord> = {}
  for (const [date, record] of Object.entries(data.days)) {
    days[date] = { ...record, goals: withTrackingKind(record.goals) }
  }

  const periods: Record<string, PeriodRecord> = {}
  for (const [key, record] of Object.entries(data.periods)) {
    periods[key] = { ...record, goals: withTrackingKind(record.goals) }
  }

  return { ...data, version: 3, goals, days, periods }
}

/** Migra V3 (sin `lifeGoals`) a V4: agrega la lista vacía, nada más cambia. */
export function migrateV3ToV4(data: AppData): AppData {
  if (data.version >= 4) return data
  return { ...data, version: 4, lifeGoals: data.lifeGoals ?? [] }
}

/** Migra V4 (sin `plannerItems`) a V5: agrega la lista vacía, nada más cambia. */
export function migrateV4ToV5(data: AppData): AppData {
  if (data.version >= 5) return data
  return { ...data, version: 5, plannerItems: data.plannerItems ?? [] }
}

/** Migra V5 (sin `routines`/`routineRuns`) a V6: agrega listas vacías, nada más cambia. */
export function migrateV5ToV6(data: AppData): AppData {
  if (data.version >= 6) return data
  return { ...data, version: 6, routines: data.routines ?? [], routineRuns: data.routineRuns ?? {} }
}

/** Migra V6 (sin `lifeWheelSnapshots`) a V7: agrega la lista vacía, nada más cambia. */
export function migrateV6ToV7(data: AppData): AppData {
  if (data.version >= 7) return data
  return { ...data, version: 7, lifeWheelSnapshots: data.lifeWheelSnapshots ?? [] }
}

/** Migra V7 (sin `reflections`) a V8: agrega la lista vacía, nada más cambia.
 * `Settings.birthDate`/`lifeExpectancyYears` son opcionales, no necesitan migración. */
export function migrateV7ToV8(data: AppData): AppData {
  if (data.version >= 8) return data
  return { ...data, version: 8, reflections: data.reflections ?? [] }
}

/** Migra V8 (sin `projects`/`projectTasks`) a V9: agrega las listas vacías, nada más cambia. */
export function migrateV8ToV9(data: AppData): AppData {
  if (data.version >= 9) return data
  return { ...data, version: 9, projects: data.projects ?? [], projectTasks: data.projectTasks ?? [] }
}
