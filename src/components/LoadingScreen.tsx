import { useEffect, useState } from 'react'
import { Logo } from './Logo'
import { ProgressPath } from './ProgressPath'

interface Props {
  message: string
  /** Sólo se ofrece si hay algo real para reintentar (p. ej. la carga de datos). */
  onRetry?: () => void
  /** Ms reales de espera antes de admitir que se está tardando — no es una etapa falsa. */
  slowAfterMs?: number
  /** Ms reales antes de asumir que quedó trabado y ofrecer reintentar. */
  stuckAfterMs?: number
}

/** Pantalla de carga con identidad de marca. Nunca queda muda: si tarda, lo dice; si se traba, ofrece reintentar. */
export function LoadingScreen({ message, onRetry, slowAfterMs = 6000, stuckAfterMs = 16000 }: Props) {
  const [slow, setSlow] = useState(false)
  const [stuck, setStuck] = useState(false)

  useEffect(() => {
    setSlow(false)
    setStuck(false)
    const slowTimer = window.setTimeout(() => setSlow(true), slowAfterMs)
    const stuckTimer = window.setTimeout(() => setStuck(true), stuckAfterMs)
    return () => {
      window.clearTimeout(slowTimer)
      window.clearTimeout(stuckTimer)
    }
  }, [slowAfterMs, stuckAfterMs, message])

  return (
    <div className="loading-screen">
      <Logo size={32} className="loading-screen__brandmark" />
      <ProgressPath steps={5} indeterminate size="md" />
      <p className="loading-screen__message" role="status">
        {message}
      </p>
      {slow && !stuck && <p className="loading-screen__hint">Esto está tardando más de lo normal…</p>}
      {stuck && (
        <div className="loading-screen__stuck">
          <p className="loading-screen__hint">Parece que hay un problema de conexión.</p>
          {onRetry && (
            <button type="button" className="btn btn--ghost" onClick={onRetry}>
              Reintentar
            </button>
          )}
        </div>
      )}
    </div>
  )
}
