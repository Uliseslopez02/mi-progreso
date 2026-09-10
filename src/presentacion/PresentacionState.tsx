import { createContext, useContext, useMemo, useReducer } from 'react'
import type { ReactNode } from 'react'
import { snapshotGoals, toggleGoal } from '../domain/day'
import type { DateKey } from '../domain/date'
import { computeLifeGoalProgress } from '../domain/lifeGoalProgress'
import { routineRunKey } from '../domain/routine'
import type {
  DayRecord,
  Goal,
  LifeGoal,
  PlannerItem,
  ProjectTask,
  ProjectTaskStatus,
  Routine,
  RoutineRun,
} from '../domain/types'
import {
  ALL_DEMO_GOALS,
  DEMO_CATEGORIES,
  TODAY,
  buildDemoDays,
  buildDemoLifeGoals,
  buildDemoPlannerItems,
  buildDemoProjectTasks,
  buildDemoRoutineRuns,
  buildDemoRoutines,
} from './demoData'

interface PresentacionData {
  /** Igual que `AppData.goals`: objetivos + hábitos, la fuente del snapshot de hoy. */
  goals: Goal[]
  days: Record<DateKey, DayRecord>
  lifeGoals: LifeGoal[]
  plannerItems: PlannerItem[]
  projectTasks: ProjectTask[]
  routines: Routine[]
  routineRuns: Record<string, RoutineRun>
}

type Action =
  | { type: 'TOGGLE_GOAL'; goalId: string; delta?: number | boolean }
  | { type: 'SET_GOAL_PROGRESS'; goalId: string; value: number }
  | { type: 'UPDATE_GOAL'; goalId: string; patch: Partial<Omit<Goal, 'id'>> }
  | { type: 'REMOVE_GOAL'; goalId: string }
  | { type: 'UPDATE_LIFEGOAL'; goalId: string; patch: Partial<Omit<LifeGoal, 'id'>> }
  | { type: 'REMOVE_LIFEGOAL'; goalId: string }
  | { type: 'MOVE_LIFEGOAL'; goalId: string; direction: -1 | 1 }
  | { type: 'TOGGLE_PLANNER_ITEM'; itemId: string }
  | { type: 'REMOVE_PLANNER_ITEM'; itemId: string }
  | { type: 'DUPLICATE_PLANNER_ITEM'; itemId: string }
  | { type: 'POSTPONE_PLANNER_ITEM'; itemId: string }
  | { type: 'MOVE_PLANNER_ITEM'; itemId: string; startTime: string }
  | { type: 'RESIZE_PLANNER_ITEM'; itemId: string; durationMinutes: number }
  | { type: 'MOVE_TASK'; taskId: string; status: ProjectTaskStatus }
  | { type: 'UPDATE_ROUTINE'; routineId: string; patch: Partial<Omit<Routine, 'id'>> }
  | { type: 'REMOVE_ROUTINE'; routineId: string }
  | { type: 'MOVE_ROUTINE'; routineId: string; direction: -1 | 1 }
  | { type: 'TOGGLE_ROUTINE_STEP'; routineId: string; stepId: string }

/** Re-snapshotea `days[TODAY]` a partir de `goals` conservando el progreso ya
 * cargado — mismo comportamiento que `ensureDay` para el día en curso. */
function resnapshotToday(goals: Goal[], days: Record<DateKey, DayRecord>): Record<DateKey, DayRecord> {
  const record = days[TODAY]
  if (!record) return days
  const snapshot = snapshotGoals(goals, DEMO_CATEGORIES, TODAY)
  const validIds = new Set(snapshot.map((g) => g.goalId))
  const goalProgress = Object.fromEntries(
    Object.entries(record.goalProgress).filter(([id]) => validIds.has(id)),
  )
  return { ...days, [TODAY]: { ...record, goals: snapshot, goalProgress } }
}

/** Recalcula el `progress` de cada meta con la misma función que la app —
 * las metas de tipo "hábitos vinculados" cambian cuando cambian los días. */
function recomputeLifeGoals(lifeGoals: LifeGoal[], days: Record<DateKey, DayRecord>): LifeGoal[] {
  return lifeGoals.map((g) => ({ ...g, progress: computeLifeGoalProgress(g, days, TODAY) }))
}

function reducer(state: PresentacionData, action: Action): PresentacionData {
  switch (action.type) {
    case 'TOGGLE_GOAL': {
      const record = state.days[TODAY]
      if (!record) return state
      const days = { ...state.days, [TODAY]: toggleGoal(record, action.goalId, action.delta) }
      return { ...state, days, lifeGoals: recomputeLifeGoals(state.lifeGoals, days) }
    }
    case 'SET_GOAL_PROGRESS': {
      const record = state.days[TODAY]
      if (!record) return state
      const snapshot = record.goals.find((g) => g.goalId === action.goalId)
      if (!snapshot) return state
      const capped = snapshot.targetValue ? Math.min(action.value, snapshot.targetValue) : action.value
      const value = Math.max(0, Number.isFinite(capped) ? capped : 0)
      const days = {
        ...state.days,
        [TODAY]: { ...record, goalProgress: { ...record.goalProgress, [action.goalId]: value } },
      }
      return { ...state, days, lifeGoals: recomputeLifeGoals(state.lifeGoals, days) }
    }
    case 'UPDATE_GOAL': {
      const goals = state.goals.map((g) => (g.id === action.goalId ? { ...g, ...action.patch } : g))
      const days = resnapshotToday(goals, state.days)
      return { ...state, goals, days, lifeGoals: recomputeLifeGoals(state.lifeGoals, days) }
    }
    case 'REMOVE_GOAL': {
      const goals = state.goals.filter((g) => g.id !== action.goalId)
      const days = resnapshotToday(goals, state.days)
      return { ...state, goals, days, lifeGoals: recomputeLifeGoals(state.lifeGoals, days) }
    }
    case 'UPDATE_LIFEGOAL': {
      const lifeGoals = state.lifeGoals.map((g) => {
        if (g.id !== action.goalId) return g
        const merged = { ...g, ...action.patch }
        return { ...merged, progress: computeLifeGoalProgress(merged, state.days, TODAY) }
      })
      return { ...state, lifeGoals }
    }
    case 'REMOVE_LIFEGOAL':
      return { ...state, lifeGoals: state.lifeGoals.filter((g) => g.id !== action.goalId) }
    case 'MOVE_LIFEGOAL': {
      const list = [...state.lifeGoals].sort((a, b) => a.order - b.order)
      const i = list.findIndex((g) => g.id === action.goalId)
      const j = i + action.direction
      if (i < 0 || j < 0 || j >= list.length) return state
      ;[list[i], list[j]] = [list[j], list[i]]
      return { ...state, lifeGoals: list.map((g, idx) => ({ ...g, order: idx })) }
    }
    case 'TOGGLE_PLANNER_ITEM': {
      const plannerItems = state.plannerItems.map((it) =>
        it.id === action.itemId ? { ...it, done: !it.done } : it,
      )
      return { ...state, plannerItems }
    }
    case 'REMOVE_PLANNER_ITEM':
      return { ...state, plannerItems: state.plannerItems.filter((it) => it.id !== action.itemId) }
    case 'DUPLICATE_PLANNER_ITEM': {
      const item = state.plannerItems.find((it) => it.id === action.itemId)
      if (!item) return state
      const copy: PlannerItem = {
        ...item,
        id: `${item.id}-copy-${state.plannerItems.length}`,
        done: false,
        order: state.plannerItems.length,
        createdAt: new Date().toISOString(),
      }
      return { ...state, plannerItems: [...state.plannerItems, copy] }
    }
    case 'POSTPONE_PLANNER_ITEM': {
      // En la app pasa al día siguiente; en el demo (un solo día visible) lo
      // sacamos de la vista, que es el efecto observable.
      return { ...state, plannerItems: state.plannerItems.filter((it) => it.id !== action.itemId) }
    }
    case 'MOVE_PLANNER_ITEM': {
      const plannerItems = state.plannerItems.map((it) =>
        it.id === action.itemId ? { ...it, startTime: action.startTime } : it,
      )
      return { ...state, plannerItems }
    }
    case 'RESIZE_PLANNER_ITEM': {
      const plannerItems = state.plannerItems.map((it) =>
        it.id === action.itemId ? { ...it, durationMinutes: action.durationMinutes } : it,
      )
      return { ...state, plannerItems }
    }
    case 'MOVE_TASK': {
      const projectTasks = state.projectTasks.map((t) =>
        t.id === action.taskId ? { ...t, status: action.status } : t,
      )
      return { ...state, projectTasks }
    }
    case 'UPDATE_ROUTINE': {
      const routines = state.routines.map((r) =>
        r.id === action.routineId ? { ...r, ...action.patch } : r,
      )
      return { ...state, routines }
    }
    case 'REMOVE_ROUTINE': {
      const routineRuns = Object.fromEntries(
        Object.entries(state.routineRuns).filter(([, run]) => run.routineId !== action.routineId),
      )
      return {
        ...state,
        routines: state.routines.filter((r) => r.id !== action.routineId),
        routineRuns,
      }
    }
    case 'MOVE_ROUTINE': {
      const ordered = [...state.routines].sort((a, b) => a.order - b.order)
      const index = ordered.findIndex((r) => r.id === action.routineId)
      const target = index + action.direction
      if (index === -1 || target < 0 || target >= ordered.length) return state
      const swapped = [...ordered]
      ;[swapped[index], swapped[target]] = [swapped[target], swapped[index]]
      return { ...state, routines: swapped.map((r, order) => ({ ...r, order })) }
    }
    case 'TOGGLE_ROUTINE_STEP': {
      const key = routineRunKey(action.routineId, TODAY)
      const existing = state.routineRuns[key]
      const completed = new Set(existing?.completedStepIds ?? [])
      if (completed.has(action.stepId)) completed.delete(action.stepId)
      else completed.add(action.stepId)
      const run: RoutineRun = { routineId: action.routineId, date: TODAY, completedStepIds: [...completed] }
      return { ...state, routineRuns: { ...state.routineRuns, [key]: run } }
    }
    default:
      return state
  }
}

interface PresentacionContextValue extends PresentacionData {
  toggleGoal: (goalId: string, delta?: number | boolean) => void
  setGoalProgress: (goalId: string, value: number) => void
  updateGoal: (goalId: string, patch: Partial<Omit<Goal, 'id'>>) => void
  removeGoal: (goalId: string) => void
  updateLifeGoal: (goalId: string, patch: Partial<Omit<LifeGoal, 'id'>>) => void
  removeLifeGoal: (goalId: string) => void
  moveLifeGoal: (goalId: string, direction: -1 | 1) => void
  togglePlannerItem: (itemId: string) => void
  removePlannerItem: (itemId: string) => void
  duplicatePlannerItem: (itemId: string) => void
  postponePlannerItem: (itemId: string) => void
  movePlannerItem: (itemId: string, startTime: string) => void
  resizePlannerItem: (itemId: string, durationMinutes: number) => void
  moveTask: (taskId: string, status: ProjectTaskStatus) => void
  updateRoutine: (routineId: string, patch: Partial<Omit<Routine, 'id'>>) => void
  removeRoutine: (routineId: string) => void
  moveRoutine: (routineId: string, direction: -1 | 1) => void
  toggleRoutineStep: (routineId: string, stepId: string) => void
}

const PresentacionContext = createContext<PresentacionContextValue | null>(null)

/**
 * Estado compartido de `/presentacion`: `goals` + `days` + `lifeGoals` +
 * `plannerItems` + `projectTasks`, mismo formato que `AppData`. Tocar o editar
 * algo mueve de verdad a lo demás (marcar un objetivo recalcula las metas de
 * hábitos, etc.). Nada se persiste; se reinicia al recargar.
 */
export function PresentacionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    const days = buildDemoDays()
    return {
      goals: ALL_DEMO_GOALS.map((g) => ({ ...g })),
      days,
      lifeGoals: recomputeLifeGoals(buildDemoLifeGoals(), days),
      plannerItems: buildDemoPlannerItems(),
      projectTasks: buildDemoProjectTasks(),
      routines: buildDemoRoutines(),
      routineRuns: buildDemoRoutineRuns(),
    }
  })

  const value = useMemo<PresentacionContextValue>(
    () => ({
      ...state,
      toggleGoal: (goalId, delta) => dispatch({ type: 'TOGGLE_GOAL', goalId, delta }),
      setGoalProgress: (goalId, value) => dispatch({ type: 'SET_GOAL_PROGRESS', goalId, value }),
      updateGoal: (goalId, patch) => dispatch({ type: 'UPDATE_GOAL', goalId, patch }),
      removeGoal: (goalId) => dispatch({ type: 'REMOVE_GOAL', goalId }),
      updateLifeGoal: (goalId, patch) => dispatch({ type: 'UPDATE_LIFEGOAL', goalId, patch }),
      removeLifeGoal: (goalId) => dispatch({ type: 'REMOVE_LIFEGOAL', goalId }),
      moveLifeGoal: (goalId, direction) => dispatch({ type: 'MOVE_LIFEGOAL', goalId, direction }),
      togglePlannerItem: (itemId) => dispatch({ type: 'TOGGLE_PLANNER_ITEM', itemId }),
      removePlannerItem: (itemId) => dispatch({ type: 'REMOVE_PLANNER_ITEM', itemId }),
      duplicatePlannerItem: (itemId) => dispatch({ type: 'DUPLICATE_PLANNER_ITEM', itemId }),
      postponePlannerItem: (itemId) => dispatch({ type: 'POSTPONE_PLANNER_ITEM', itemId }),
      movePlannerItem: (itemId, startTime) => dispatch({ type: 'MOVE_PLANNER_ITEM', itemId, startTime }),
      resizePlannerItem: (itemId, durationMinutes) =>
        dispatch({ type: 'RESIZE_PLANNER_ITEM', itemId, durationMinutes }),
      moveTask: (taskId, status) => dispatch({ type: 'MOVE_TASK', taskId, status }),
      updateRoutine: (routineId, patch) => dispatch({ type: 'UPDATE_ROUTINE', routineId, patch }),
      removeRoutine: (routineId) => dispatch({ type: 'REMOVE_ROUTINE', routineId }),
      moveRoutine: (routineId, direction) => dispatch({ type: 'MOVE_ROUTINE', routineId, direction }),
      toggleRoutineStep: (routineId, stepId) => dispatch({ type: 'TOGGLE_ROUTINE_STEP', routineId, stepId }),
    }),
    [state],
  )

  return <PresentacionContext.Provider value={value}>{children}</PresentacionContext.Provider>
}

export function usePresentacion(): PresentacionContextValue {
  const ctx = useContext(PresentacionContext)
  if (!ctx) throw new Error('usePresentacion debe usarse dentro de PresentacionProvider')
  return ctx
}
