import { closePastDays, ensureDay, toggleGoal } from '../domain/day'
import type { DateKey } from '../domain/date'
import { computeLifeGoalProgress } from '../domain/lifeGoalProgress'
import { closePastPeriods, ensurePeriod, periodKey, periodStartFor, togglePeriodGoal } from '../domain/period'
import { routineRunKey } from '../domain/routine'
import type {
  AppData,
  Category,
  Goal,
  LifeGoal,
  Note,
  PlannerItem,
  Project,
  ProjectTask,
  ProjectTaskStatus,
  RecurringPeriod,
  Reflection,
  Routine,
  RoutineRun,
  Settings,
  UserPlan,
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
  status: 'loading' | 'ready' | 'error'
  data: AppData | null
  today: DateKey
  error: string | null
  /** Plan comercial de la cuenta. 'free' hasta que `getUserPlan()` resuelva (ver AppProvider). */
  plan: UserPlan
}

export type Action =
  | { type: 'hydrate'; data: AppData; today: DateKey }
  | { type: 'setPlan'; plan: UserPlan }
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
  | { type: 'addReflection'; reflection: Reflection }
  | { type: 'removeReflection'; id: string }
  | { type: 'addNote'; note: Note }
  | { type: 'updateNote'; id: string; patch: Partial<Omit<Note, 'id'>> }
  | { type: 'removeNote'; id: string }
  | { type: 'addProject'; project: Project }
  | { type: 'updateProject'; id: string; patch: Partial<Omit<Project, 'id'>> }
  | { type: 'removeProject'; id: string }
  | { type: 'moveProject'; id: string; direction: -1 | 1 }
  | { type: 'reorderProjects'; updates: Array<{ id: string; order: number }> }
  | { type: 'addProjectTask'; task: ProjectTask }
  | { type: 'updateProjectTask'; id: string; patch: Partial<Omit<ProjectTask, 'id'>> }
  | { type: 'removeProjectTask'; id: string }
  | { type: 'reorderProjectTasks'; updates: Array<{ id: string; status: ProjectTaskStatus; order: number }> }
  | { type: 'replaceData'; data: AppData }
  | { type: 'hydrateError'; message: string }
  | { type: 'hydrateRetry' }

export function reducer(state: AppState, action: Action): AppState {
  if (action.type === 'hydrate') {
    const data = syncToday(closePast(action.data, action.today), action.today)
    return { status: 'ready', data, today: action.today, error: null, plan: state.plan }
  }

  if (action.type === 'hydrateError') {
    return { status: 'error', data: null, today: state.today, error: action.message, plan: state.plan }
  }

  if (action.type === 'hydrateRetry') {
    return { status: 'loading', data: null, today: state.today, error: null, plan: state.plan }
  }

  if (action.type === 'setPlan') {
    return { ...state, plan: action.plan }
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
      const days = { ...data.days, [action.date]: toggleGoal(record, action.goalId) }
      return withData(state, recomputeHabitLinkedGoals({ ...data, days }, action.goalId, state.today))
    }

    case 'setGoalProgress': {
      const record = data.days[action.date]
      if (!record) return state
      const editable = action.date === state.today || data.settings.allowEditingPastDays
      if (!editable) return state
      const days = {
        ...data.days,
        [action.date]: {
          ...record,
          goalProgress: {
            ...record.goalProgress,
            [action.goalId]: action.value,
          },
        },
      }
      return withData(state, recomputeHabitLinkedGoals({ ...data, days }, action.goalId, state.today))
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
      // Si el objetivo borrado era un hábito vinculado a alguna meta, se
      // desvincula acá (evita una referencia huérfana en `linkedHabitIds`) y
      // se recalcula el progreso de esa meta si dependía de él (`kind: 'habits'`).
      const lifeGoals = data.lifeGoals.map((g) => {
        if (!g.linkedHabitIds.includes(action.id)) return g
        const patched = { ...g, linkedHabitIds: g.linkedHabitIds.filter((id) => id !== action.id) }
        return { ...patched, progress: computeLifeGoalProgress(patched, data.days, state.today) }
      })
      const next = { ...data, goals: data.goals.filter((g) => g.id !== action.id), lifeGoals }
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

    case 'addLifeGoal': {
      const goal = { ...action.goal, progress: computeLifeGoalProgress(action.goal, data.days, state.today) }
      return withData(state, { ...data, lifeGoals: [...data.lifeGoals, goal] })
    }

    case 'updateLifeGoal':
      return withData(state, {
        ...data,
        lifeGoals: data.lifeGoals.map((g) => {
          if (g.id !== action.id) return g
          const merged = { ...g, ...action.patch }
          return { ...merged, progress: computeLifeGoalProgress(merged, data.days, state.today) }
        }),
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

    case 'addReflection':
      return withData(state, { ...data, reflections: [...data.reflections, action.reflection] })

    case 'removeReflection':
      return withData(state, {
        ...data,
        reflections: data.reflections.filter((r) => r.id !== action.id),
      })

    case 'addNote':
      return withData(state, { ...data, notes: [...data.notes, action.note] })

    case 'updateNote':
      return withData(state, {
        ...data,
        notes: data.notes.map((n) => (n.id === action.id ? { ...n, ...action.patch } : n)),
      })

    case 'removeNote':
      return withData(state, { ...data, notes: data.notes.filter((n) => n.id !== action.id) })

    case 'addProject':
      return withData(state, { ...data, projects: [...data.projects, action.project] })

    case 'updateProject':
      return withData(state, {
        ...data,
        projects: data.projects.map((p) => (p.id === action.id ? { ...p, ...action.patch } : p)),
      })

    case 'removeProject':
      return withData(state, {
        ...data,
        projects: data.projects.filter((p) => p.id !== action.id),
        projectTasks: data.projectTasks.filter((t) => t.projectId !== action.id),
      })

    case 'moveProject': {
      const ordered = [...data.projects].sort((a, b) => a.order - b.order)
      const index = ordered.findIndex((p) => p.id === action.id)
      const target = index + action.direction
      if (index === -1 || target < 0 || target >= ordered.length) return state
      const swapped = [...ordered]
      ;[swapped[index], swapped[target]] = [swapped[target], swapped[index]]
      return withData(state, {
        ...data,
        projects: swapped.map((project, order) => ({ ...project, order })),
      })
    }

    case 'reorderProjects': {
      const orderById = new Map(action.updates.map((u) => [u.id, u.order]))
      return withData(state, {
        ...data,
        projects: data.projects.map((p) => (orderById.has(p.id) ? { ...p, order: orderById.get(p.id)! } : p)),
      })
    }

    case 'addProjectTask':
      return withData(state, { ...data, projectTasks: [...data.projectTasks, action.task] })

    case 'updateProjectTask':
      return withData(state, {
        ...data,
        projectTasks: data.projectTasks.map((t) => (t.id === action.id ? { ...t, ...action.patch } : t)),
      })

    case 'removeProjectTask':
      return withData(state, {
        ...data,
        projectTasks: data.projectTasks.filter((t) => t.id !== action.id),
      })

    case 'reorderProjectTasks': {
      const patchById = new Map(action.updates.map((u) => [u.id, u]))
      return withData(state, {
        ...data,
        projectTasks: data.projectTasks.map((t) => {
          const patch = patchById.get(t.id)
          return patch ? { ...t, status: patch.status, order: patch.order } : t
        }),
      })
    }

    case 'replaceData':
      return withData(state, syncToday(action.data, state.today))

    default:
      return state
  }
}

function withData(state: AppState, data: AppData): AppState {
  return data === state.data ? state : { ...state, data }
}

/**
 * Recalcula `progress` de las metas `kind: 'habits'` que tienen a `habitGoalId`
 * entre sus `linkedHabitIds`, después de marcar ese hábito en `days`. Las
 * demás metas quedan con la misma referencia (sin recalcular ni tocar), igual
 * criterio de "no tocar lo que no cambió" que `moveLifeGoal`.
 */
function recomputeHabitLinkedGoals(data: AppData, habitGoalId: string, today: DateKey): AppData {
  let changed = false
  const lifeGoals = data.lifeGoals.map((g) => {
    if (g.kind !== 'habits' || !g.linkedHabitIds.includes(habitGoalId)) return g
    const progress = computeLifeGoalProgress(g, data.days, today)
    if (progress === g.progress) return g
    changed = true
    return { ...g, progress }
  })
  return changed ? { ...data, lifeGoals } : data
}
