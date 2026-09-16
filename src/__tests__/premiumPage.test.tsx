import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PremiumPage } from '../pages/PremiumPage'
import { AppContext, type AppContextValue } from '../state/context'
import type { SubscriptionSummary } from '../domain/types'

vi.mock('../lib/supabaseClient', () => ({ supabase: { auth: { getSession: vi.fn() } } }))

function renderWithSummary(summary: SubscriptionSummary) {
  const value = {
    repository: { getSubscriptionSummary: vi.fn().mockResolvedValue(summary) },
  } as unknown as AppContextValue
  return render(
    <AppContext.Provider value={value}>
      <PremiumPage />
    </AppContext.Provider>,
  )
}

describe('PremiumPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('plan Free: muestra el toggle mensual/anual y el botón de compra', async () => {
    renderWithSummary({
      status: 'free',
      planTier: 'free',
      currentPeriodEnd: null,
      trialEnd: null,
      aiUsage: { count: 1, limit: 3 },
    })

    expect(await screen.findByRole('button', { name: 'Mensual' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Anual/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Empezar con Premium' })).toBeInTheDocument()
    expect(screen.queryByText(/Estás en tu prueba Premium/)).not.toBeInTheDocument()
  })

  it('plan Premium activo: no ofrece comprar de nuevo, ofrece cancelar', async () => {
    renderWithSummary({
      status: 'active',
      planTier: 'premium_monthly',
      currentPeriodEnd: null,
      trialEnd: null,
      aiUsage: null,
    })

    expect(await screen.findByText(/Sos Premium/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Empezar con Premium' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancelar suscripción' })).toBeInTheDocument()
  })

  it('trial vigente: muestra la tarjeta de prueba con los días restantes y sigue ofreciendo comprar', async () => {
    const trialEnd = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
    renderWithSummary({
      status: 'trial',
      planTier: 'free',
      currentPeriodEnd: null,
      trialEnd,
      aiUsage: null,
    })

    expect(await screen.findByText(/Estás en tu prueba Premium/)).toBeInTheDocument()
    expect(screen.getByText(/Te quedan 5 días/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Empezar con Premium' })).toBeInTheDocument()
  })
})
