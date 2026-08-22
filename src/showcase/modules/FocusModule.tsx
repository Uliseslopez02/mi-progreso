import { useEffect, useState } from 'react'
import { formatDuration, remainingSeconds } from '../../domain/focus'
import { ProgressRing } from '../../components/ProgressRing'
import { ModuleFrame } from '../ModuleFrame'

const PLANNED_MINUTES = 25
const PLANNED_SECONDS = PLANNED_MINUTES * 60

type Status = 'idle' | 'running' | 'paused' | 'done'

/** Módulo 7 — temporizador de enfoque real, basado en timestamps (no un contador). */
export function FocusModule() {
  const [status, setStatus] = useState<Status>('idle')
  const [startedAt, setStartedAt] = useState<string | null>(null)
  const [pausedRemaining, setPausedRemaining] = useState(PLANNED_SECONDS)
  const [, tick] = useState(0)

  useEffect(() => {
    if (status !== 'running') return
    const id = window.setInterval(() => tick((t) => t + 1), 1000)
    return () => window.clearInterval(id)
  }, [status])

  const remaining =
    status === 'running' && startedAt
      ? remainingSeconds(startedAt, PLANNED_MINUTES, new Date())
      : status === 'idle'
        ? PLANNED_SECONDS
        : pausedRemaining

  useEffect(() => {
    if (status === 'running' && remaining <= 0) setStatus('done')
  }, [status, remaining])

  const start = () => {
    setStartedAt(new Date().toISOString())
    setStatus('running')
  }
  const pause = () => {
    setPausedRemaining(remaining)
    setStatus('paused')
  }
  const resume = () => {
    setStartedAt(new Date(Date.now() - (PLANNED_SECONDS - pausedRemaining) * 1000).toISOString())
    setStatus('running')
  }
  const reset = () => {
    setStatus('idle')
    setStartedAt(null)
    setPausedRemaining(PLANNED_SECONDS)
  }

  const percent = ((PLANNED_SECONDS - remaining) / PLANNED_SECONDS) * 100

  return (
    <ModuleFrame eyebrow="Enfoque" title="Un bloque de concentración real" className="sc-module--focus">
      <div className="focus-timer">
        <ProgressRing percent={percent} size={140} strokeWidth={9} label={formatDuration(remaining)} caption={status === 'done' ? 'completado' : 'enfoque'} />
        <div className="row" style={{ justifyContent: 'center', marginTop: 14 }}>
          {status === 'idle' && (
            <button type="button" className="btn btn--primary" onClick={start}>
              ▶ Comenzar
            </button>
          )}
          {status === 'running' && (
            <button type="button" className="btn btn--ghost" onClick={pause}>
              Pausar
            </button>
          )}
          {status === 'paused' && (
            <>
              <button type="button" className="btn btn--primary" onClick={resume}>
                ▶ Continuar
              </button>
              <button type="button" className="btn btn--ghost" onClick={reset}>
                Reiniciar
              </button>
            </>
          )}
          {status === 'done' && (
            <button type="button" className="btn btn--ghost" onClick={reset}>
              ¡Sesión completa! Reiniciar
            </button>
          )}
        </div>
      </div>
    </ModuleFrame>
  )
}
