import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
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

const initialState: AppState = { status: 'loading', data: null, today: todayKey(), error: null, plan: 'free' }

/** Contra una red, guardar en cada tecla/tilde es un request por cambio. */
const SAVE_DEBOUNCE_MS = 800
/** Si guardar falla (red caída, etc.), reintentar en vez de perder el cambio en silencio. */
const SAVE_RETRY_MS = 6000

interface Props {
  repository: ProgressRepository
  children: ReactNode
}

export function AppProvider({ repository, children }: Props) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [attempt, setAttempt] = useState(0)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'error'>('idle')
  const hydrated = useRef(false)
  const pendingSave = useRef<AppData | null>(null)
  const saveTimer = useRef<number | null>(null)
  const retryTimer = useRef<number | null>(null)

  const retryHydrate = () => {
    dispatch({ type: 'hydrateRetry' })
    setAttempt((n) => n + 1)
  }

  // Carga inicial desde la capa de persistencia (hoy localStorage, mañana API).
  useEffect(() => {
    let cancelled = false
    repository
      .load()
      .then((stored) => {
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
      .catch((err: unknown) => {
        if (cancelled) return
        const message =
          err instanceof Error && /fetch|network/i.test(err.message)
            ? 'No pudimos conectarnos para cargar tus datos. Revisá tu conexión.'
            : 'No pudimos cargar tus datos. Puede ser un problema temporal del servidor.'
        dispatch({ type: 'hydrateError', message })
      })
    return () => {
      cancelled = true
    }
  }, [repository, attempt])

  // Plan de la cuenta: no bloquea la carga principal ni tiene reintento propio —
  // si falla, se queda en 'free' (el default de initialState), que es lo correcto
  // hasta que se resuelva (nadie pierde acceso a nada por esto, sin cobros todavía).
  useEffect(() => {
    let cancelled = false
    repository
      .getUserPlan()
      .then((plan) => {
        if (!cancelled) dispatch({ type: 'setPlan', plan })
      })
      .catch(() => {
        // silencioso a propósito: ver comentario arriba
      })
    return () => {
      cancelled = true
    }
  }, [repository])

  // Intenta guardar; si falla (red caída, backend caído) no se pierde el
  // cambio en silencio: queda pendiente y se reintenta solo, más adelante.
  const runSave = useCallback(
    (data: AppData) => {
      setSaveStatus('saving')
      repository
        .save(data)
        .then(() => setSaveStatus('idle'))
        .catch(() => {
          pendingSave.current = data
          setSaveStatus('error')
          if (retryTimer.current !== null) window.clearTimeout(retryTimer.current)
          retryTimer.current = window.setTimeout(() => {
            retryTimer.current = null
            const retryData = pendingSave.current
            pendingSave.current = null
            if (retryData) runSave(retryData)
          }, SAVE_RETRY_MS)
        })
    },
    [repository],
  )

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
      if (data) runSave(data)
    }, SAVE_DEBOUNCE_MS)
  }, [state.status, state.data, repository, runSave])

  // Fuerza el guardado pendiente si la pestaña se oculta, se cierra, o el
  // componente se desmonta (p. ej. al cerrar sesión) antes de que venza el debounce.
  useEffect(() => {
    const flush = () => {
      if (retryTimer.current !== null) {
        window.clearTimeout(retryTimer.current)
        retryTimer.current = null
      }
      if (saveTimer.current === null) return
      window.clearTimeout(saveTimer.current)
      saveTimer.current = null
      const data = pendingSave.current
      pendingSave.current = null
      if (data) runSave(data)
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
  }, [repository, runSave])

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

  const value = useMemo(
    () => ({ state, dispatch, repository, retryHydrate, saveStatus }),
    [state, repository, saveStatus],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
