import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AiUpsellCard } from '../components/AiUpsellCard'
import * as analytics from '../domain/analytics'

describe('AiUpsellCard', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('muestra el copy orientado a valor y un link a /premium, y registra paywall_viewed', () => {
    const trackSpy = vi.spyOn(analytics, 'track')
    render(
      <MemoryRouter>
        <AiUpsellCard feature="suggest_habits" />
      </MemoryRouter>,
    )

    expect(screen.getByText(/Ya usaste tus 3 sugerencias de IA este mes/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Conocer Premium' })).toHaveAttribute('href', '/premium')
    expect(trackSpy).toHaveBeenCalledWith({ name: 'paywall_viewed', feature: 'suggest_habits' })
  })
})
