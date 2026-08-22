import { createContext, useContext, useMemo, useReducer } from 'react'
import type { ReactNode } from 'react'
import { toggleGoal } from '../domain/day'
import type { DateKey } from '../domain/date'
import type { DayRecord, LifeGoal } from '../domain/types'
import { TODAY, buildDemoDays, buildDemoLifeGoal } from './demoData'

interface ShowcaseData {
  days: Record<DateKey, DayRecord>
  lifeGoal: LifeGoal
}

type Action =
  | { type: 'TOGGLE_GOAL'; goalId: string; delta?: number | boolean }
  | { type: 'TOGGLE_SUBGOAL'; subGoalId: string }

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
    default:
      return state
  }
}

interface ShowcaseContextValue extends ShowcaseData {
  toggleGoal: (goalId: string, delta?: number | boolean) => void
  toggleSubGoal: (subGoalId: string) => void
}

const ShowcaseContext = createContext<ShowcaseContextValue | null>(null)

/**
 * Estado compartido de la demo pública: un único `days` (mismo formato que la
 * app real) alimenta hábitos, ritual del día, estadísticas y el anillo
 * general — tocar un módulo mueve de verdad a los otros. No se persiste en
 * ningún lado; se reinicia al recargar la página.
 */
export function ShowcaseProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    days: buildDemoDays(),
    lifeGoal: buildDemoLifeGoal(),
  }))

  const value = useMemo<ShowcaseContextValue>(
    () => ({
      ...state,
      toggleGoal: (goalId, delta) => dispatch({ type: 'TOGGLE_GOAL', goalId, delta }),
      toggleSubGoal: (subGoalId) => dispatch({ type: 'TOGGLE_SUBGOAL', subGoalId }),
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
