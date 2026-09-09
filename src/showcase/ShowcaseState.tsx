import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import type { ReactNode } from 'react'
import { toggleGoal } from '../domain/day'
import type { DateKey } from '../domain/date'
import type { DayRecord, LifeGoal, ProjectTask, ProjectTaskStatus } from '../domain/types'
import { TODAY, buildDemoDays, buildDemoLifeGoal, buildDemoProjectTasks } from './demoData'

interface ShowcaseData {
  days: Record<DateKey, DayRecord>
  lifeGoal: LifeGoal
  projectTasks: ProjectTask[]
}

type Action =
  | { type: 'TOGGLE_GOAL'; goalId: string; delta?: number | boolean }
  | { type: 'TOGGLE_SUBGOAL'; subGoalId: string }
  | { type: 'MOVE_TASK'; taskId: string; status: ProjectTaskStatus }
  | { type: 'RESET' }

/** Estado inicial de la demo — es también el "predeterminado" al que vuelve todo cuando el visitante se va. */
function initialData(): ShowcaseData {
  return {
    days: buildDemoDays(),
    lifeGoal: buildDemoLifeGoal(),
    projectTasks: buildDemoProjectTasks(),
  }
}

function reducer(state: ShowcaseData, action: Action): ShowcaseData {
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
    case 'RESET':
      return initialData()
    default:
      return state
  }
}

interface ShowcaseContextValue extends ShowcaseData {
  toggleGoal: (goalId: string, delta?: number | boolean) => void
  toggleSubGoal: (subGoalId: string) => void
  moveTask: (taskId: string, status: ProjectTaskStatus) => void
}

const ShowcaseContext = createContext<ShowcaseContextValue | null>(null)

/**
 * Estado compartido de la demo pública: un único `days` (mismo formato que la
 * app real) alimenta hábitos, ritual del día, estadísticas, sistema de % y el
 * anillo general — tocar un módulo mueve de verdad a los otros. No se persiste
 * en ningún lado.
 *
 * Además, cada vez que el visitante se va de la página (cambia de pestaña,
 * navega afuera, o vuelve con el botón atrás desde el bfcache) todo se
 * reinicia a `initialData()`: la demo siempre arranca en su estado
 * predeterminado para el próximo que entra, sin depender de un reload.
 */
export function ShowcaseProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialData)

  useEffect(() => {
    const reset = () => dispatch({ type: 'RESET' })

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') reset()
    }
    // `pageshow` con `persisted` cubre la vuelta atrás desde el bfcache, donde
    // el DOM se restaura tal cual quedó y no corre ningún reload.
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) reset()
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pagehide', reset)
    window.addEventListener('pageshow', onPageShow)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('pagehide', reset)
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [])

  const value = useMemo<ShowcaseContextValue>(
    () => ({
      ...state,
      toggleGoal: (goalId, delta) => dispatch({ type: 'TOGGLE_GOAL', goalId, delta }),
      toggleSubGoal: (subGoalId) => dispatch({ type: 'TOGGLE_SUBGOAL', subGoalId }),
      moveTask: (taskId, status) => dispatch({ type: 'MOVE_TASK', taskId, status }),
    }),
    [state],
  )

  return <ShowcaseContext.Provider value={value}>{children}</ShowcaseContext.Provider>
}

export function useShowcase(): ShowcaseContextValue {
  const ctx = useContext(ShowcaseContext)
  if (!ctx) throw new Error('useShowcase debe usarse dentro de ShowcaseProvider')
  return ctx
}
