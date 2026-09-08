import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { track } from '../domain/analytics'
import { useAppContext } from '../state/context'

const POLL_INTERVAL_MS = 3000
const MAX_ATTEMPTS = 10

/**
 * Destino del `back_url` de Mercado Pago tras el checkout. La confirmación
 * real llega por webhook (asíncrono, ver api/mp-webhook.ts) — puede tardar
 * unos segundos más que la redirección, así que se reintenta en vez de
 * asumir éxito o fallo inmediato.
 */
export function PremiumConfirmationPage() {
  const { repository } = useAppContext()
  const [confirmed, setConfirmed] = useState(false)
  const [gaveUp, setGaveUp] = useState(false)
  const attemptsRef = useRef(0)

  useEffect(() => {
    let cancelled = false
    const poll = () => {
      repository
        .getSubscriptionSummary()
        .then((summary) => {
          if (cancelled) return
          if (summary.status === 'active') {
            setConfirmed(true)
            track({ name: 'premium_confirmed' })
            return
          }
          attemptsRef.current += 1
          if (attemptsRef.current >= MAX_ATTEMPTS) {
            setGaveUp(true)
            return
          }
          setTimeout(poll, POLL_INTERVAL_MS)
        })
        .catch(() => {
          attemptsRef.current += 1
          if (!cancelled && attemptsRef.current < MAX_ATTEMPTS) setTimeout(poll, POLL_INTERVAL_MS)
        })
    }
    poll()
    return () => {
      cancelled = true
    }
  }, [repository])

  return (
    <div className="stack">
      <section className="card">
        {confirmed ? (
          <>
            <h1 className="card__title">¡Bienvenido a Premium!</h1>
            <p className="card__hint">
              Ya tenés sugerencias e insights de IA sin límite. Podés seguir usando Mi Progreso
              como siempre — esto sólo suma.
            </p>
          </>
        ) : gaveUp ? (
          <>
            <h1 className="card__title">Tu pago se está procesando</h1>
            <p className="card__hint">
              Puede tardar un poco más en confirmarse — va a activarse solo, no hace falta que
              hagas nada.
            </p>
          </>
        ) : (
          <>
            <h1 className="card__title">Confirmando tu pago…</h1>
            <p className="card__hint">Esto no debería tardar más que unos segundos.</p>
          </>
        )}
        <Link to="/" className="btn btn--ghost">
          Volver a Mi Progreso
        </Link>
      </section>
    </div>
  )
}
