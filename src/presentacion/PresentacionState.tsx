import { createContext, useContext, useMemo, useReducer } from 'react'
import type { ReactNode } from 'react'
import { toggleGoal } from '../domain/day'
import type { DateKey } from '../domain/date'
import type { DayRecord, LifeGoal, ProjectTask, ProjectTaskStatus } from '../domain/types'
import { TODAY, buildDemoDays, buildDemoLifeGoal, buildDemoProjectTasks } from './demoData'

interface PresentacionData {
  days: Record<DateKey, DayRecord>
  lifeGoal: LifeGoal
  projectTasks: ProjectTask[]
}

type Action =
  | { type: 'TOGGLE_GOAL'; goalId: string; delta?: number | boolean }
  | { type: 'TOGGLE_SUBGOAL'; subGoalId: string }
  | { type: 'MOVE_TASK'; taskId: string; status: ProjectTaskStatus }

function reducer(state: PresentacionData, action: Action): PresentacionData {
  switch (action.type) {
    case 'TOGGLE_GOAL': {
      const record = state.days[TODAY]
      if (!record) return state
      const next = toggleGoal(record, action.goalId, action.delta)
      return { ...state, days: { ...state.days, [TODAY]: next } }
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
  toggleSubGoal: (subGoalId: string) => void
  moveTask: (taskId: string, status: ProjectTaskStatus) => void
}

const PresentacionContext = createContext<PresentacionContextValue | null>(null)

/**
 * Estado compartido de `/presentacion`: un único `days` (mismo formato que la
 * app real) alimenta hábitos, dashboard y estadísticas — tocar un módulo
 * mueve de verdad a los otros. Nada se persiste; se reinicia al recargar.
 */
export function PresentacionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    days: buildDemoDays(),
    lifeGoal: buildDemoLifeGoal(),
    projectTasks: buildDemoProjectTasks(),
  }))

  const value = useMemo<PresentacionContextValue>(
    () => ({
      ...state,
      toggleGoal: (goalId, delta) => dispatch({ type: 'TOGGLE_GOAL', goalId, delta }),
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
