import { closePastDays, ensureDay, toggleGoal } from '../domain/day'
import type { DateKey } from '../domain/date'
import { closePastPeriods, ensurePeriod, periodKey, periodStartFor, togglePeriodGoal } from '../domain/period'
import { routineRunKey } from '../domain/routine'
import type {
  AppData,
  Category,
  Goal,
  LifeGoal,
  LifeWheelSnapshot,
  PlannerItem,
  RecurringPeriod,
  Reflection,
  Routine,
  RoutineRun,
  Settings,
} from '../domain/types'

/** Sincroniza el día de hoy y las ventanas semanal/mensual vigentes. */
function syncToday(data: AppData, today: DateKey): AppData {
  let next = ensureDay(data, today, today)
  next = ensurePeriod(next, 'weekly', today)
  next = ensurePeriod(next, 'monthly', today)
  return next
}

function closePast(data: AppData, today: DateKey): AppData {
  return closePastPeriods(closePastDays(data, today), today)
}

export interface AppState {
  status: 'loading' | 'ready'
  data: AppData | null
  today: DateKey
}

export type Action =
  | { type: 'hydrate'; data: AppData; today: DateKey }
  | { type: 'setToday'; today: DateKey }
  | { type: 'toggleGoal'; date: DateKey; goalId: string }
  | { type: 'setGoalProgress'; date: DateKey; goalId: string; value: number | boolean }
  | { type: 'togglePeriodGoal'; period: RecurringPeriod; goalId: string }
  | { type: 'setPeriodGoalProgress'; period: RecurringPeriod; goalId: string; value: number | boolean }
  | { type: 'addGoal'; goal: Goal }
  | { type: 'updateGoal'; id: string; patch: Partial<Omit<Goal, 'id'>> }
  | { type: 'removeGoal'; id: string }
  | { type: 'moveGoal'; id: string; direction: -1 | 1 }
  | { type: 'addCategory'; category: Category }
  | { type: 'updateCategory'; id: string; patch: Partial<Omit<Category, 'id'>> }
  | { type: 'removeCategory'; id: string }
  | { type: 'updateSettings'; patch: Partial<Settings> }
  | { type: 'addLifeGoal'; goal: LifeGoal }
  | { type: 'updateLifeGoal'; id: string; patch: Partial<Omit<LifeGoal, 'id'>> }
  | { type: 'removeLifeGoal'; id: string }
  | { type: 'moveLifeGoal'; id: string; direction: -1 | 1 }
  | { type: 'addPlannerItem'; item: PlannerItem }
  | { type: 'updatePlannerItem'; id: string; patch: Partial<Omit<PlannerItem, 'id'>> }
  | { type: 'removePlannerItem'; id: string }
  | { type: 'reorderPlannerItems'; updates: Array<{ id: string; date: DateKey; order: number }> }
  | { type: 'addRoutine'; routine: Routine }
  | { type: 'updateRoutine'; id: string; patch: Partial<Omit<Routine, 'id'>> }
  | { type: 'removeRoutine'; id: string }
  | { type: 'moveRoutine'; id: string; direction: -1 | 1 }
  | { type: 'toggleRoutineStep'; date: DateKey; routineId: string; stepId: string }
  | { type: 'addLifeWheelSnapshot'; snapshot: LifeWheelSnapshot }
  | { type: 'removeLifeWheelSnapshot'; id: string }
  | { type: 'addReflection'; reflection: Reflection }
  | { type: 'removeReflection'; id: string }
  | { type: 'replaceData'; data: AppData }

export function reducer(state: AppState, action: Action): AppState {
  if (action.type === 'hydrate') {
    const data = syncToday(closePast(action.data, action.today), action.today)
    return { status: 'ready', data, today: action.today }
  }

  if (!state.data) return state
  const data = state.data

  switch (action.type) {
    case 'setToday': {
      if (action.today === state.today) return state
      const next = syncToday(closePast(data, action.today), action.today)
      return { ...state, today: action.today, data: next }
    }

    case 'toggleGoal': {
      const record = data.days[action.date]
      if (!record) return state
      const editable = action.date === state.today || data.settings.allowEditingPastDays
      if (!editable) return state
      return withData(state, {
        ...data,
        days: { ...data.days, [action.date]: toggleGoal(record, action.goalId) },
      })
    }

    case 'setGoalProgress': {
      const record = data.days[action.date]
      if (!record) return state
      const editable = action.date === state.today || data.settings.allowEditingPastDays
      if (!editable) return state
      return withData(state, {
        ...data,
        days: {
          ...data.days,
          [action.date]: {
            ...record,
            goalProgress: {
              ...record.goalProgress,
              [action.goalId]: action.value,
            },
          },
        },
      })
    }

    case 'togglePeriodGoal': {
      const key = periodKey(action.period, periodStartFor(state.today, action.period))
      const record = data.periods[key]
      if (!record) return state
      const editable = !record.closed || data.settings.allowEditingPastDays
      if (!editable) return state
      return withData(state, {
        ...data,
        periods: { ...data.periods, [key]: togglePeriodGoal(record, action.goalId) },
      })
    }

    case 'setPeriodGoalProgress': {
      const key = periodKey(action.period, periodStartFor(state.today, action.period))
      const record = data.periods[key]
      if (!record) return state
      const editable = !record.closed || data.settings.allowEditingPastDays
      if (!editable) return state
      return withData(state, {
        ...data,
        periods: {
          ...data.periods,
          [key]: {
            ...record,
            goalProgress: {
              ...record.goalProgress,
              [action.goalId]: action.value,
            },
          },
        },
      })
    }

    case 'addGoal': {
      const next = { ...data, goals: [...data.goals, action.goal] }
      return withData(state, syncToday(next, state.today))
    }

    case 'updateGoal': {
      const next = {
        ...data,
        goals: data.goals.map((g) => (g.id === action.id ? { ...g, ...action.patch } : g)),
      }
      return withData(state, syncToday(next, state.today))
    }

    case 'removeGoal': {
      const next = { ...data, goals: data.goals.filter((g) => g.id !== action.id) }
      return withData(state, syncToday(next, state.today))
    }

    case 'moveGoal': {
      // Objetivos y hábitos se reordenan cada uno dentro de su propia sección
      // (mismo trackingKind), aunque compartan el mismo array `goals`.
      const moving = data.goals.find((g) => g.id === action.id)
      if (!moving) return state
      const sectionKind = moving.trackingKind ?? 'goal'
      const ordered = data.goals
        .filter((g) => (g.trackingKind ?? 'goal') === sectionKind)
        .sort((a, b) => a.order - b.order)
      const index = ordered.findIndex((g) => g.id === action.id)
      const target = index + action.direction
      if (index === -1 || target < 0 || target >= ordered.length) return state
      const swapped = [...ordered]
      ;[swapped[index], swapped[target]] = [swapped[target], swapped[index]]
      const newOrder = new Map(swapped.map((goal, order) => [goal.id, order]))
      const next = {
        ...data,
        goals: data.goals.map((g) => (newOrder.has(g.id) ? { ...g, order: newOrder.get(g.id)! } : g)),
      }
      return withData(state, syncToday(next, state.today))
    }

    case 'addCategory':
      return withData(state, { ...data, categories: [...data.categories, action.category] })

    case 'updateCategory': {
      const next = {
        ...data,
        categories: data.categories.map((c) =>
          c.id === action.id ? { ...c, ...action.patch } : c,
        ),
      }
      return withData(state, syncToday(next, state.today))
    }

    case 'removeCategory': {
      // Una categoría no se borra sola: se lleva puestos sus objetivos. Las
      // metas de largo plazo no se borran (su categoría es opcional): sólo
      // quedan sin categoría.
      const next = {
        ...data,
        categories: data.categories.filter((c) => c.id !== action.id),
        goals: data.goals.filter((g) => g.categoryId !== action.id),
        lifeGoals: data.lifeGoals.map((g) =>
          g.categoryId === action.id ? { ...g, categoryId: undefined } : g,
        ),
      }
      return withData(state, syncToday(next, state.today))
    }

    case 'updateSettings':
      return withData(state, { ...data, settings: { ...data.settings, ...action.patch } })

    case 'addLifeGoal':
      return withData(state, { ...data, lifeGoals: [...data.lifeGoals, action.goal] })

    case 'updateLifeGoal':
      return withData(state, {
        ...data,
        lifeGoals: data.lifeGoals.map((g) => (g.id === action.id ? { ...g, ...action.patch } : g)),
      })

    case 'removeLifeGoal':
      return withData(state, {
        ...data,
        lifeGoals: data.lifeGoals.filter((g) => g.id !== action.id),
      })

    case 'moveLifeGoal': {
      const ordered = [...data.lifeGoals].sort((a, b) => a.order - b.order)
      const index = ordered.findIndex((g) => g.id === action.id)
      const target = index + action.direction
      if (index === -1 || target < 0 || target >= ordered.length) return state
      const swapped = [...ordered]
      ;[swapped[index], swapped[target]] = [swapped[target], swapped[index]]
      return withData(state, {
        ...data,
        lifeGoals: swapped.map((goal, order) => ({ ...goal, order })),
      })
    }

    case 'addPlannerItem':
      return withData(state, { ...data, plannerItems: [...data.plannerItems, action.item] })

    case 'updatePlannerItem':
      return withData(state, {
        ...data,
        plannerItems: data.plannerItems.map((i) => (i.id === action.id ? { ...i, ...action.patch } : i)),
      })

    case 'removePlannerItem':
      return withData(state, {
        ...data,
        plannerItems: data.plannerItems.filter((i) => i.id !== action.id),
      })

    case 'reorderPlannerItems': {
      const patchById = new Map(action.updates.map((u) => [u.id, u]))
      return withData(state, {
        ...data,
        plannerItems: data.plannerItems.map((i) => {
          const patch = patchById.get(i.id)
          return patch ? { ...i, date: patch.date, order: patch.order } : i
        }),
      })
    }

    case 'addRoutine':
      return withData(state, { ...data, routines: [...data.routines, action.routine] })

    case 'updateRoutine':
      return withData(state, {
        ...data,
        routines: data.routines.map((r) => (r.id === action.id ? { ...r, ...action.patch } : r)),
      })

    case 'removeRoutine': {
      const runs = Object.fromEntries(
        Object.entries(data.routineRuns).filter(([, run]) => run.routineId !== action.id),
      )
      return withData(state, {
        ...data,
        routines: data.routines.filter((r) => r.id !== action.id),
        routineRuns: runs,
      })
    }

    case 'moveRoutine': {
      const ordered = [...data.routines].sort((a, b) => a.order - b.order)
      const index = ordered.findIndex((r) => r.id === action.id)
      const target = index + action.direction
      if (index === -1 || target < 0 || target >= ordered.length) return state
      const swapped = [...ordered]
      ;[swapped[index], swapped[target]] = [swapped[target], swapped[index]]
      return withData(state, {
        ...data,
        routines: swapped.map((routine, order) => ({ ...routine, order })),
      })
    }

    case 'toggleRoutineStep': {
      const editable = action.date === state.today || data.settings.allowEditingPastDays
      if (!editable) return state
      const routine = data.routines.find((r) => r.id === action.routineId)
      if (!routine) return state
      const key = routineRunKey(action.routineId, action.date)
      const existing = data.routineRuns[key]
      const completed = new Set(existing?.completedStepIds ?? [])
      if (completed.has(action.stepId)) completed.delete(action.stepId)
      else completed.add(action.stepId)
      const run: RoutineRun = {
        routineId: action.routineId,
        date: action.date,
        completedStepIds: [...completed],
      }
      return withData(state, { ...data, routineRuns: { ...data.routineRuns, [key]: run } })
    }

    case 'addLifeWheelSnapshot':
      return withData(state, {
        ...data,
        lifeWheelSnapshots: [...data.lifeWheelSnapshots, action.snapshot],
      })

    case 'removeLifeWheelSnapshot':
      return withData(state, {
        ...data,
        lifeWheelSnapshots: data.lifeWheelSnapshots.filter((s) => s.id !== action.id),
      })

    case 'addReflection':
      return withData(state, { ...data, reflections: [...data.reflections, action.reflection] })

    case 'removeReflection':
      return withData(state, {
        ...data,
        reflections: data.reflections.filter((r) => r.id !== action.id),
      })

    case 'replaceData':
      return withData(state, syncToday(action.data, state.today))

    default:
      return state
  }
}

function withData(state: AppState, data: AppData): AppState {
  return data === state.data ? state : { ...state, data }
}
