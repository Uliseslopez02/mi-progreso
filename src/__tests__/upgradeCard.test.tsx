import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { UpgradeCard } from '../components/UpgradeCard'
import * as analytics from '../domain/analytics'

describe('UpgradeCard', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('muestra copy de valor, link a /premium y registra limit_reached', () => {
    const trackSpy = vi.spyOn(analytics, 'track')
    render(
      <MemoryRouter>
        <UpgradeCard limit="dailyGoals" />
      </MemoryRouter>,
    )

    expect(screen.getByText(/5 objetivos diarios/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Ver Premium/ })).toHaveAttribute('href', '/premium')
    expect(trackSpy).toHaveBeenCalledWith({ name: 'limit_reached', limit: 'dailyGoals' })
  })

  it('registra el click del CTA', async () => {
    const trackSpy = vi.spyOn(analytics, 'track')
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <UpgradeCard limit="habits" />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('link', { name: /Ver Premium/ }))
    expect(trackSpy).toHaveBeenCalledWith({ name: 'upgrade_cta_clicked', from: 'habits' })
  })

  it('permite sobrescribir el título', () => {
    render(
      <MemoryRouter>
        <UpgradeCard limit="weeklyGoals" title="Título propio" />
      </MemoryRouter>,
    )
    expect(screen.getByText('Título propio')).toBeInTheDocument()
  })
})
