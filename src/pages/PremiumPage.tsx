import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAppContext } from '../state/context'
import { track } from '../domain/analytics'
import { yearlySavingsPercent } from '../domain/premiumPricing'
import type { SubscriptionSummary } from '../domain/types'

type PlanTier = 'premium_monthly' | 'premium_yearly'

/**
 * Página de precios: comparación Free/Premium orientada a resultado, con
 * checkout hosteado por Mercado Pago (ver api/checkout.ts). Los montos reales
 * viven en los planes de MP, acá sólo se muestran los labels configurables
 * por env var (VITE_PREMIUM_*_PRICE_LABEL) — sin precios hardcodeados.
 */
export function PremiumPage() {
  const { repository } = useAppContext()
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')
  const [summary, setSummary] = useState<SubscriptionSummary | null>(null)
  const [status, setStatus] = useState<'idle' | 'redirecting' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    track({ name: 'premium_page_viewed' })
  }, [])

  useEffect(() => {
    let cancelled = false
    repository
      .getSubscriptionSummary()
      .then((s) => {
        if (!cancelled) setSummary(s)
      })
      .catch(() => {
        // Silencioso a propósito: la página sigue siendo útil (comparar planes,
        // comprar) aunque no se pueda leer el estado actual.
      })
    return () => {
      cancelled = true
    }
  }, [repository])

  const monthlyLabel = import.meta.env.VITE_PREMIUM_MONTHLY_PRICE_LABEL || '—'
  const yearlyLabel = import.meta.env.VITE_PREMIUM_YEARLY_PRICE_LABEL || '—'
  const savings = yearlySavingsPercent(monthlyLabel, yearlyLabel)
  const isPremium = summary?.status === 'active'

  const startCheckout = async (planTier: PlanTier) => {
    track({ name: 'checkout_started', planTier })
    setStatus('redirecting')
    setErrorMessage('')
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) {
        setErrorMessage('Necesitás una sesión activa para continuar.')
        setStatus('error')
        track({ name: 'checkout_failed', planTier, reason: 'no_session' })
        return
      }
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ planTier }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        setErrorMessage(body?.error ?? 'No se pudo iniciar el pago.')
        setStatus('error')
        track({ name: 'checkout_failed', planTier, reason: body?.error ?? 'unknown' })
        return
      }
      const data = (await res.json()) as { initPoint?: string }
      if (!data.initPoint) {
        setErrorMessage('No se pudo iniciar el pago.')
        setStatus('error')
        track({ name: 'checkout_failed', planTier, reason: 'no_init_point' })
        return
      }
      track({ name: 'checkout_redirected', planTier })
      window.location.href = data.initPoint
    } catch {
      setErrorMessage('No se pudo conectar con el servicio de pagos.')
      setStatus('error')
      track({ name: 'checkout_failed', planTier, reason: 'network_error' })
    }
  }

  return (
    <div className="stack">
      <section className="card">
        <h1 className="card__title">Llevá tu progreso al siguiente nivel</h1>
        <p className="card__hint">
          Todo tu seguimiento — hábitos, objetivos, agenda, proyectos, informes — es y va a
          seguir siendo gratis. Premium suma IA sin límites: sugerencias de hábitos e insights
          sobre tu historial, cuando quieras.
        </p>

        {isPremium && (
          <p className="card__hint" style={{ color: 'var(--accent)' }}>
            Ya sos Premium. Gestioná tu suscripción desde Ajustes.
          </p>
        )}

        {!isPremium && (
          <>
            <div className="row" role="group" aria-label="Elegí facturación">
              <button
                type="button"
                className={`btn ${billing === 'monthly' ? 'btn--primary' : 'btn--ghost'}`}
                onClick={() => setBilling('monthly')}
              >
                Mensual
              </button>
              <button
                type="button"
                className={`btn ${billing === 'yearly' ? 'btn--primary' : 'btn--ghost'}`}
                onClick={() => setBilling('yearly')}
              >
                Anual{savings !== null ? ` · Ahorrás ${savings}%` : ''}
              </button>
            </div>

            <p className="card__title" style={{ marginTop: 12 }}>
              {billing === 'monthly' ? monthlyLabel : yearlyLabel}
            </p>

            {status === 'error' && <p className="empty">{errorMessage}</p>}

            <button
              type="button"
              className="btn btn--primary"
              disabled={status === 'redirecting'}
              onClick={() => void startCheckout(billing === 'monthly' ? 'premium_monthly' : 'premium_yearly')}
            >
              {status === 'redirecting' ? 'Conectando con Mercado Pago…' : 'Obtener Premium'}
            </button>
          </>
        )}
      </section>
    </div>
  )
}
