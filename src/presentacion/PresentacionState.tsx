import { createContext, useContext, useMemo, useReducer } from 'react'
import type { ReactNode } from 'react'
import { snapshotGoals, toggleGoal } from '../domain/day'
import type { DateKey } from '../domain/date'
import type { DayRecord, Goal, LifeGoal, ProjectTask, ProjectTaskStatus } from '../domain/types'
import {
  ALL_DEMO_GOALS,
  DEMO_CATEGORIES,
  TODAY,
  buildDemoDays,
  buildDemoLifeGoal,
  buildDemoProjectTasks,
} from './demoData'

interface PresentacionData {
  /** Igual que `AppData.goals`: objetivos + hábitos, la fuente de la que sale
   * el snapshot de hoy. Editar un peso o un hábito acá re-snapshotea el día,
   * igual que hace `ensureDay` en la app. */
  goals: Goal[]
  days: Record<DateKey, DayRecord>
  lifeGoal: LifeGoal
  projectTasks: ProjectTask[]
}

type Action =
  | { type: 'TOGGLE_GOAL'; goalId: string; delta?: number | boolean }
  | { type: 'SET_GOAL_PROGRESS'; goalId: string; value: number }
  | { type: 'UPDATE_GOAL'; goalId: string; patch: Partial<Omit<Goal, 'id'>> }
  | { type: 'REMOVE_GOAL'; goalId: string }
  | { type: 'TOGGLE_SUBGOAL'; subGoalId: string }
  | { type: 'MOVE_TASK'; taskId: string; status: ProjectTaskStatus }

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

function reducer(state: PresentacionData, action: Action): PresentacionData {
  switch (action.type) {
    case 'TOGGLE_GOAL': {
      const record = state.days[TODAY]
      if (!record) return state
      const next = toggleGoal(record, action.goalId, action.delta)
      return { ...state, days: { ...state.days, [TODAY]: next } }
    }
    case 'SET_GOAL_PROGRESS': {
      const record = state.days[TODAY]
      if (!record) return state
      const snapshot = record.goals.find((g) => g.goalId === action.goalId)
      if (!snapshot) return state
      const capped = snapshot.targetValue ? Math.min(action.value, snapshot.targetValue) : action.value
      const value = Math.max(0, Number.isFinite(capped) ? capped : 0)
      return {
        ...state,
        days: {
          ...state.days,
          [TODAY]: { ...record, goalProgress: { ...record.goalProgress, [action.goalId]: value } },
        },
      }
    }
    case 'UPDATE_GOAL': {
      const goals = state.goals.map((g) => (g.id === action.goalId ? { ...g, ...action.patch } : g))
      return { ...state, goals, days: resnapshotToday(goals, state.days) }
    }
    case 'REMOVE_GOAL': {
      const goals = state.goals.filter((g) => g.id !== action.goalId)
      return { ...state, goals, days: resnapshotToday(goals, state.days) }
    }
    case 'TOGGLE_SUBGOAL': {
      const subGoals = state.lifeGoal.subGoals.map((s) =>
        s.id === action.subGoalId ? { ...s, done: !s.done } : s,
      )
      const done = subGoals.filter((s) => s.done).length
      const progress = subGoals.length === 0 ? 0 : Math.round((done / subGoals.length) * 100)
      return { ...state, lifeGoal: { ...state.lifeGoal, subGoals, progress } }
    }
    case 'MOVE_TASK': {
      const projectTasks = state.projectTasks.map((t) =>
        t.id === action.taskId ? { ...t, status: action.status } : t,
      )
      return { ...state, projectTasks }
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
  toggleSubGoal: (subGoalId: string) => void
  moveTask: (taskId: string, status: ProjectTaskStatus) => void
}

const PresentacionContext = createContext<PresentacionContextValue | null>(null)

/**
 * Estado compartido de `/presentacion`: un único `goals` + `days` (mismo
 * formato que la app real) alimenta el dashboard, los hábitos y las
 * estadísticas — tocar o editar algo en un módulo mueve de verdad a los
 * otros. Nada se persiste; se reinicia al recargar.
 */
export function PresentacionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    goals: ALL_DEMO_GOALS.map((g) => ({ ...g })),
    days: buildDemoDays(),
    lifeGoal: buildDemoLifeGoal(),
    projectTasks: buildDemoProjectTasks(),
  }))

  const value = useMemo<PresentacionContextValue>(
    () => ({
      ...state,
      toggleGoal: (goalId, delta) => dispatch({ type: 'TOGGLE_GOAL', goalId, delta }),
      setGoalProgress: (goalId, value) => dispatch({ type: 'SET_GOAL_PROGRESS', goalId, value }),
      updateGoal: (goalId, patch) => dispatch({ type: 'UPDATE_GOAL', goalId, patch }),
      removeGoal: (goalId) => dispatch({ type: 'REMOVE_GOAL', goalId }),
      toggleSubGoal: (subGoalId) => dispatch({ type: 'TOGGLE_SUBGOAL', subGoalId }),
      moveTask: (taskId, status) => dispatch({ type: 'MOVE_TASK', taskId, status }),
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
