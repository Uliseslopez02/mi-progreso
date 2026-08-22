import { useEffect, useMemo, useReducer, useRef } from 'react'
import type { ReactNode } from 'react'
import type { AppData } from '../domain/types'
import { todayKey } from '../domain/date'
import { createEmptyData } from '../domain/defaults'
import {
  migrateV1ToV2,
  migrateV2ToV3,
  migrateV3ToV4,
  migrateV4ToV5,
  migrateV5ToV6,
  migrateV6ToV7,
  migrateV7ToV8,
} from '../domain/migrations'
import type { ProgressRepository } from '../storage/repository'
import { AppContext } from './context'
import { reducer } from './reducer'
import type { AppState } from './reducer'

const initialState: AppState = { status: 'loading', data: null, today: todayKey() }

/** Contra una red, guardar en cada tecla/tilde es un request por cambio. */
const SAVE_DEBOUNCE_MS = 800

interface Props {
  repository: ProgressRepository
  children: ReactNode
}

export function AppProvider({ repository, children }: Props) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const hydrated = useRef(false)
  const pendingSave = useRef<AppData | null>(null)
  const saveTimer = useRef<number | null>(null)

  // Carga inicial desde la capa de persistencia (hoy localStorage, mañana API).
  useEffect(() => {
    let cancelled = false
    repository.load().then((stored) => {
      if (cancelled) return
      const today = todayKey()
      const data = stored ?? createEmptyData(new Date().toISOString())
      const migrated = migrateV7ToV8(
        migrateV6ToV7(
          migrateV5ToV6(migrateV4ToV5(migrateV3ToV4(migrateV2ToV3(migrateV1ToV2(data))))),
        ),
      )
      dispatch({ type: 'hydrate', data: migrated, today })
    })
    return () => {
      cancelled = true
    }
  }, [repository])

  // Guarda cada cambio, con debounce: contra una API real no queremos un
  // request por cada tilde. Si la pestaña se oculta o cierra con un guardado
  // pendiente, se fuerza a que salga igual (ver el efecto de abajo).
  useEffect(() => {
    if (state.status !== 'ready' || !state.data) return
    hydrated.current = true
    pendingSave.current = state.data
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      saveTimer.current = null
      const data = pendingSave.current
      pendingSave.current = null
      if (data) void repository.save(data)
    }, SAVE_DEBOUNCE_MS)
  }, [state.status, state.data, repository])

  // Fuerza el guardado pendiente si la pestaña se oculta, se cierra, o el
  // componente se desmonta (p. ej. al cerrar sesión) antes de que venza el debounce.
  useEffect(() => {
    const flush = () => {
      if (saveTimer.current === null) return
      window.clearTimeout(saveTimer.current)
      saveTimer.current = null
      const data = pendingSave.current
      pendingSave.current = null
      if (data) void repository.save(data)
    }
    const onVisibilityChange = () => {
      if (document.hidden) flush()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [repository])

  // Cambio de día con la app abierta (medianoche o volver de segundo plano).
  useEffect(() => {
    const check = () => dispatch({ type: 'setToday', today: todayKey() })
    const timer = window.setInterval(check, 60_000)
    document.addEventListener('visibilitychange', check)
    window.addEventListener('focus', check)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('focus', check)
    }
  }, [])

  const value = useMemo(() => ({ state, dispatch, repository }), [state, repository])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
