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
    renderWithSummary({ status: 'free', planTier: 'free', currentPeriodEnd: null, aiUsage: { count: 1, limit: 3 } })

    expect(await screen.findByRole('button', { name: 'Mensual' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Anual/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Obtener Premium' })).toBeInTheDocument()
  })

  it('plan Premium activo: no ofrece comprar de nuevo', async () => {
    renderWithSummary({
      status: 'active',
      planTier: 'premium_monthly',
      currentPeriodEnd: null,
      aiUsage: null,
    })

    expect(await screen.findByText(/Ya sos Premium/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Obtener Premium' })).not.toBeInTheDocument()
  })
})
