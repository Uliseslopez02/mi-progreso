import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAppContext } from '../state/context'
import { track } from '../domain/analytics'
import { toDateKey, formatLongDate } from '../domain/date'
import { monthlyEquivalentLabel, yearlySavingsPercent } from '../domain/premiumPricing'
import type { SubscriptionSummary } from '../domain/types'

type PlanTier = 'premium_monthly' | 'premium_yearly'

const BENEFITS = [
  {
    icon: '🤖',
    title: 'IA sin límites',
    text: 'Pedile sugerencias e insights las veces que quieras, sin tope mensual.',
  },
  {
    icon: '💡',
    title: 'Sugerencias de hábitos',
    text: 'Ideas concretas para armar o ajustar tus hábitos según tus objetivos.',
  },
  {
    icon: '📊',
    title: 'Insights de tu historial',
    text: 'La IA revisa tu progreso ya registrado y te ayuda a ver patrones y oportunidades.',
  },
]

function planTierLabel(planTier: SubscriptionSummary['planTier']): string {
  if (planTier === 'premium_yearly') return 'Plan anual'
  if (planTier === 'premium_monthly') return 'Plan mensual'
  return 'Free'
}

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
  const [cancelStatus, setCancelStatus] = useState<'idle' | 'canceling' | 'error'>('idle')

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
  const yearlyPerMonth = monthlyEquivalentLabel(yearlyLabel)
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

  const cancelSubscription = async () => {
    if (
      !window.confirm(
        '¿Seguro que querés cancelar tu suscripción Premium? Tu progreso sigue acá — sólo se pierde el acceso ilimitado a IA al vencer el período ya pagado.',
      )
    ) {
      return
    }
    setCancelStatus('canceling')
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) {
        setCancelStatus('error')
        return
      }
      const res = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        setCancelStatus('error')
        return
      }
      setSummary((prev) => (prev ? { ...prev, status: 'canceled' } : prev))
      setCancelStatus('idle')
      track({ name: 'subscription_canceled' })
    } catch {
      setCancelStatus('error')
    }
  }

  if (isPremium) {
    const renewalKey = summary?.currentPeriodEnd ? toDateKey(new Date(summary.currentPeriodEnd)) : null
    return (
      <div className="stack">
        <section className="card">
          <h1 className="card__title">✨ Sos Premium</h1>
          <p className="card__hint">
            Tenés IA sin límites para sugerencias e insights sobre tu progreso. Gracias por bancar
            Mi Progreso.
          </p>
          <div className="stack" style={{ gap: 4, marginTop: 12 }}>
            <p className="card__title" style={{ fontSize: 16 }}>{planTierLabel(summary.planTier)}</p>
            {renewalKey && (
              <p className="card__hint">Se renueva el {formatLongDate(renewalKey)}.</p>
            )}
          </div>

          {cancelStatus === 'error' && (
            <p className="empty">No se pudo cancelar la suscripción. Probá de nuevo en un momento.</p>
          )}

          <button
            type="button"
            className="btn btn--ghost"
            style={{ marginTop: 12 }}
            disabled={cancelStatus === 'canceling'}
            onClick={() => void cancelSubscription()}
          >
            {cancelStatus === 'canceling' ? 'Cancelando…' : 'Cancelar suscripción'}
          </button>
        </section>
      </div>
    )
  }

  return (
    <div className="stack">
      <section className="card">
        <h1 className="card__title">Tu progreso, con un poco de ayuda extra ✨</h1>
        <p className="card__hint">
          Mi Progreso sigue siendo gratis para organizar tus hábitos, objetivos, agenda, proyectos
          e informes. Con Premium sumás IA para acompañarte cuando la necesites.
        </p>
      </section>

      <section className="card">
        <h2 className="card__title" style={{ fontSize: 16 }}>¿Qué suma Premium?</h2>
        <div className="stack" style={{ gap: 14, marginTop: 8 }}>
          {BENEFITS.map((benefit) => (
            <div key={benefit.title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 22, lineHeight: 1 }}>{benefit.icon}</span>
              <div>
                <p style={{ fontWeight: 600 }}>{benefit.title}</p>
                <p className="card__hint">{benefit.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="row" role="group" aria-label="Elegí facturación" style={{ width: '100%' }}>
          <button
            type="button"
            className={`btn ${billing === 'monthly' ? 'btn--primary' : 'btn--ghost'}`}
            style={{ flex: 1 }}
            onClick={() => setBilling('monthly')}
          >
            Mensual
          </button>
          <button
            type="button"
            className={`btn ${billing === 'yearly' ? 'btn--primary' : 'btn--ghost'}`}
            style={{ flex: 1 }}
            onClick={() => setBilling('yearly')}
          >
            Anual{savings !== null ? ` · Ahorrás ${savings}%` : ''}
          </button>
        </div>

        <div style={{ marginTop: 16 }}>
          <p className="card__title" style={{ fontSize: 28 }}>
            {billing === 'monthly' ? monthlyLabel : yearlyLabel}
          </p>
          {billing === 'yearly' && yearlyPerMonth && (
            <p className="card__hint">Equivale a {yearlyPerMonth}.</p>
          )}
        </div>

        {status === 'error' && <p className="empty">{errorMessage}</p>}

        <button
          type="button"
          className="btn btn--primary"
          style={{ width: '100%', marginTop: 16 }}
          disabled={status === 'redirecting'}
          onClick={() => void startCheckout(billing === 'monthly' ? 'premium_monthly' : 'premium_yearly')}
        >
          {status === 'redirecting' ? 'Conectando con Mercado Pago…' : 'Empezar con Premium'}
        </button>
        <p className="card__hint" style={{ marginTop: 8, textAlign: 'center' }}>
          Podés cancelar cuando quieras, sin vueltas.
        </p>
      </section>
    </div>
  )
}
