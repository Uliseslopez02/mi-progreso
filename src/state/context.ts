import { createContext, useContext } from 'react'
import type { Dispatch } from 'react'
import type { ProgressRepository } from '../storage/repository'
import type { Action, AppState } from './reducer'

export interface AppContextValue {
  state: AppState
  dispatch: Dispatch<Action>
  /** Sólo lo usan pantallas con persistencia propia fuera del blob (ver Enfoque). */
  repository: ProgressRepository
}

export const AppContext = createContext<AppContextValue | null>(null)

export function useAppContext(): AppContextValue {
  const value = useContext(AppContext)
  if (!value) throw new Error('useAppContext debe usarse dentro de <AppProvider>')
  return value
}

/** Atajo para las pantallas: siempre hay datos una vez que la app cargó. */
export function useAppData() {
  const { state, dispatch } = useAppContext()
  if (!state.data) throw new Error('Los datos todavía no están cargados')
  return { data: state.data, today: state.today, dispatch }
}
