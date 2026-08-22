import { getDayOfWeekEnglish, type DateKey } from './date'
import type { AppData, Category, DayRecord, Goal, GoalSnapshot } from './types'

/** Congela los objetivos diarios activos para registrarlos en un día concreto. */
export function snapshotGoals(goals: Goal[], categories: Category[], date?: DateKey): GoalSnapshot[] {
  const categoryName = new Map(categories.map((c) => [c.id, c.name]))
  const dayOfWeek = date ? getDayOfWeekEnglish(date) : null

  return goals
    .filter((g) => {
      if (!g.active || g.period !== 'daily') return false
      // 'daysOfWeek' es la única frecuencia que restringe en qué día aparece;
      // 'daily'/'timesPerWeek'/'monthly' aparecen todos los días.
      if (g.frequency?.type === 'daysOfWeek' && dayOfWeek && !g.frequency.days.includes(dayOfWeek)) {
        return false
      }
      return true
    })
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
 * Devuelve el registro del día, creándolo si todavía no existe.
 * Mientras el día sea "hoy" el snapshot se mantiene sincronizado con los
 * objetivos activos (si agrego un objetivo hoy, aparece hoy). Los días cerrados
 * quedan intactos.
 */
export function ensureDay(data: AppData, date: DateKey, today: DateKey): AppData {
  const existing = data.days[date]
  const isToday = date === today

  if (existing && !isToday) return data

  const goals = snapshotGoals(data.goals, data.categories, date)

  if (!existing) {
    const record: DayRecord = { date, goals, goalProgress: {}, closed: !isToday }
    return { ...data, days: { ...data.days, [date]: record } }
  }

  if (sameSnapshot(existing.goals, goals) && !existing.closed) return data

  const validIds = new Set(goals.map((g) => g.goalId))
  const goalProgress = Object.fromEntries(
    Object.entries(existing.goalProgress).filter(([id]) => validIds.has(id))
  )

  const record: DayRecord = {
    ...existing,
    goals,
    goalProgress,
    closed: false,
  }
  return { ...data, days: { ...data.days, [date]: record } }
}

/** Marca como cerrados todos los días que ya no son hoy. */
export function closePastDays(data: AppData, today: DateKey): AppData {
  let changed = false
  const days: Record<string, DayRecord> = {}
  for (const [key, record] of Object.entries(data.days)) {
    if (key !== today && !record.closed) {
      days[key] = { ...record, closed: true }
      changed = true
    } else {
      days[key] = record
    }
  }
  return changed ? { ...data, days } : data
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

export function toggleGoal(record: DayRecord, goalId: string, delta: number | boolean = true): DayRecord {
  const snapshot = record.goals.find((g) => g.goalId === goalId)
  if (!snapshot) return record

  const current = record.goalProgress[goalId] ?? 0
  let next: number | boolean

  if (snapshot.kind === 'boolean') {
    // Toggle booleano: actual → !actual
    next = typeof current === 'boolean' ? !current : !current
  } else {
    // Cuantitativo/temporal: suma delta
    if (typeof delta !== 'number') delta = 1
    const numCurrent = typeof current === 'number' ? current : 0
    next = Math.max(0, numCurrent + delta)
    // No exceder target si está definido
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
