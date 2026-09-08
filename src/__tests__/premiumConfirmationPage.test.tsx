import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { PremiumConfirmationPage } from '../pages/PremiumConfirmationPage'
import { AppContext, type AppContextValue } from '../state/context'
import type { SubscriptionSummary } from '../domain/types'

function renderWithSummary(summary: SubscriptionSummary) {
  const value = {
    repository: { getSubscriptionSummary: vi.fn().mockResolvedValue(summary) },
  } as unknown as AppContextValue
  return render(
    <AppContext.Provider value={value}>
      <MemoryRouter>
        <PremiumConfirmationPage />
      </MemoryRouter>
    </AppContext.Provider>,
  )
}

describe('PremiumConfirmationPage', () => {
  it('cuando la suscripción ya está activa, muestra la bienvenida a Premium', async () => {
    renderWithSummary({ status: 'active', planTier: 'premium_monthly', currentPeriodEnd: null, aiUsage: null })

    expect(await screen.findByText('¡Bienvenido a Premium!')).toBeInTheDocument()
  })

  it('mientras no confirma, muestra el estado de espera', () => {
    renderWithSummary({ status: 'free', planTier: 'free', currentPeriodEnd: null, aiUsage: { count: 0, limit: 3 } })

    expect(screen.getByText('Confirmando tu pago…')).toBeInTheDocument()
  })
})
