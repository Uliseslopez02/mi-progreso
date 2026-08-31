/**
 * Constancia: no alcanza con el promedio del día, quiero saber *qué* cumplo
 * siempre y qué vengo dejando pasar. Todo se calcula sobre los snapshots
 * guardados, así que un objetivo que todavía no existía no baja el porcentaje.
 */
import { addDays, formatWeekday, type DateKey } from './date'
import type { DayRecord, Goal, GoalSnapshot, TrackingKind } from './types'

/** Único criterio de "cumplido" para un objetivo/hábito en un día: booleano
 * puro, o cuantitativo/temporal comparado contra su `targetValue`. Compartido
 * por `goalConsistency`, `goalCompletionOn` y `weekdayConsistency` para que
 * los tres nunca puedan divergir sobre qué cuenta como cumplido. */
function isGoalCompleted(snapshot: GoalSnapshot, progress: number | boolean | undefined): boolean {
  const value = progress ?? 0
  if (snapshot.kind === 'boolean') return !!value
  return snapshot.targetValue ? (value as number) >= snapshot.targetValue : !!value
}

export interface Consistency {
  id: string
  name: string
  categoryId: string
  categoryName: string
  /** Días del rango en los que el objetivo estaba vigente. */
  daysPresent: number
  daysCompleted: number
  percent: number
}

interface Accumulator {
  id: string
  name: string
  categoryId: string
  categoryName: string
  present: number
  completed: number
}

function toConsistency(acc: Accumulator): Consistency {
  return {
    id: acc.id,
    name: acc.name,
    categoryId: acc.categoryId,
    categoryName: acc.categoryName,
    daysPresent: acc.present,
    daysCompleted: acc.completed,
    percent: acc.present === 0 ? 0 : Math.round((acc.completed / acc.present) * 100),
  }
}

const byPercentThenName = (a: Consistency, b: Consistency) =>
  b.percent - a.percent || a.name.localeCompare(b.name, 'es')

/**
 * Porcentaje de cumplimiento de cada objetivo/hábito dentro del rango.
 * `trackingKind` filtra a sólo objetivos, sólo hábitos, o ambos si se omite.
 */
export function goalConsistency(
  days: Record<string, DayRecord>,
  keys: DateKey[],
  trackingKind?: TrackingKind,
): Consistency[] {
  const accumulators = new Map<string, Accumulator>()

  // En orden ascendente: el nombre que queda es el más reciente.
  for (const key of [...keys].sort()) {
    const record = days[key]
    if (!record) continue

    for (const goal of record.goals) {
      if (trackingKind && (goal.trackingKind ?? 'goal') !== trackingKind) continue
      const isCompleted = isGoalCompleted(goal, record.goalProgress[goal.goalId])

      const current = accumulators.get(goal.goalId) ?? {
        id: goal.goalId,
        name: goal.name,
        categoryId: goal.categoryId,
        categoryName: goal.categoryName,
        present: 0,
        completed: 0,
      }
      current.name = goal.name
      current.categoryId = goal.categoryId
      current.categoryName = goal.categoryName
      current.present += 1
      if (isCompleted) current.completed += 1
      accumulators.set(goal.goalId, current)
    }
  }

  return [...accumulators.values()].map(toConsistency).sort(byPercentThenName)
}

/** Lo mismo agrupado por categoría, para ver qué área viene floja. */
export function categoryConsistency(
  days: Record<string, DayRecord>,
  keys: DateKey[],
  trackingKind?: TrackingKind,
): Consistency[] {
  const accumulators = new Map<string, Accumulator>()

  for (const goal of goalConsistency(days, keys, trackingKind)) {
    const current = accumulators.get(goal.categoryId) ?? {
      id: goal.categoryId,
      name: goal.categoryName,
      categoryId: goal.categoryId,
      categoryName: goal.categoryName,
      present: 0,
      completed: 0,
    }
    current.name = goal.categoryName
    current.present += goal.daysPresent
    current.completed += goal.daysCompleted
    accumulators.set(goal.categoryId, current)
  }

  return [...accumulators.values()].map(toConsistency).sort(byPercentThenName)
}

export interface StreakInfo {
  current: number
  best: number
}

/** true/false = cumplido o no ese día; null = ese día no estaba entre sus objetivos vigentes. */
export function goalCompletionOn(record: DayRecord | undefined, goalId: string): boolean | null {
  if (!record) return null
  const snapshot = record.goals.find((g) => g.goalId === goalId)
  if (!snapshot) return null
  return isGoalCompleted(snapshot, record.goalProgress[goalId])
}

/** Días desde el último cumplimiento de un objetivo/hábito (0 = hoy), mirando
 * hasta `maxLookback` días atrás. `null` = no se cumplió en ese rango (o no
 * existía). Usado por las sugerencias proactivas de IA para detectar hábitos
 * abandonados sin guardar ningún dato nuevo. */
export function daysSinceLastCompletion(
  days: Record<string, DayRecord>,
  goalId: string,
  today: DateKey,
  maxLookback = 90,
): number | null {
  for (let i = 0; i <= maxLookback; i++) {
    const key = addDays(today, -i)
    if (goalCompletionOn(days[key], goalId) === true) return i
  }
  return null
}

export interface WeekdayConsistency {
  /** "Lunes", "Martes", ... — ya en español, listo para mostrar o mandar a la IA. */
  weekday: string
  daysPresent: number
  daysCompleted: number
  percent: number
}

/** Igual que `goalConsistency` pero agrupado por día de la semana en vez de
 * por objetivo — para detectar patrones tipo "cumplís mejor los martes". */
export function weekdayConsistency(
  days: Record<string, DayRecord>,
  keys: DateKey[],
  trackingKind?: TrackingKind,
): WeekdayConsistency[] {
  const accumulators = new Map<string, { present: number; completed: number }>()

  for (const key of keys) {
    const record = days[key]
    if (!record) continue
    const matching = record.goals.filter((g) => !trackingKind || (g.trackingKind ?? 'goal') === trackingKind)
    if (matching.length === 0) continue
    const weekday = formatWeekday(key)
    const current = accumulators.get(weekday) ?? { present: 0, completed: 0 }
    for (const goal of matching) {
      current.present += 1
      if (isGoalCompleted(goal, record.goalProgress[goal.goalId])) current.completed += 1
    }
    accumulators.set(weekday, current)
  }

  return [...accumulators.entries()].map(([weekday, { present, completed }]) => ({
    weekday,
    daysPresent: present,
    daysCompleted: completed,
    percent: present === 0 ? 0 : Math.round((completed / present) * 100),
  }))
}

/**
 * Racha actual y mejor racha de un objetivo/hábito puntual, mirando su propio
 * historial de cumplimiento (no el % general del día). Misma regla que
 * `computeStreak`: si hoy todavía no se cumplió, la racha actual se cuenta
 * desde ayer. Los días en que el objetivo no existía (`null`) no rompen la
 * racha ni la mejor racha — simplemente se saltean.
 */
export function goalStreaks(days: Record<string, DayRecord>, goalId: string, today: DateKey): StreakInfo {
  let cursor = today
  if (goalCompletionOn(days[today], goalId) === false) {
    cursor = addDays(today, -1)
  }

  let current = 0
  while (true) {
    const done = goalCompletionOn(days[cursor], goalId)
    if (done === null || done === false) break
    current += 1
    cursor = addDays(cursor, -1)
  }

  let best = 0
  let running = 0
  for (const key of Object.keys(days).sort()) {
    const done = goalCompletionOn(days[key], goalId)
    if (done === true) {
      running += 1
      best = Math.max(best, running)
    } else if (done === false) {
      running = 0
    }
  }

  return { current, best: Math.max(best, current) }
}

export interface HabitStreak {
  id: string
  name: string
  current: number
  best: number
}

/**
 * Separa los hábitos entre racha activa (`current > 0`) y racha perdida
 * (llegaron a tener racha pero hoy están en 0). Los que nunca arrancaron
 * (`current === 0 && best === 0`) no aparecen en ninguna lista: no hay nada
 * útil que mostrar sobre ellos todavía.
 */
export function habitStreakBreakdown(
  habits: Goal[],
  days: Record<string, DayRecord>,
  today: DateKey,
): { active: HabitStreak[]; broken: HabitStreak[] } {
  const active: HabitStreak[] = []
  const broken: HabitStreak[] = []

  for (const habit of habits) {
    const { current, best } = goalStreaks(days, habit.id, today)
    if (current > 0) active.push({ id: habit.id, name: habit.name, current, best })
    else if (best > 0) broken.push({ id: habit.id, name: habit.name, current, best })
  }

  active.sort((a, b) => b.current - a.current || a.name.localeCompare(b.name, 'es'))
  broken.sort((a, b) => b.best - a.best || a.name.localeCompare(b.name, 'es'))
  return { active, broken }
}
