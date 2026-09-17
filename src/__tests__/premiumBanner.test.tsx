import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../App'
import { isPremiumBannerDismissed } from '../components/premiumBannerStatus'
import { createInitialData } from '../domain/defaults'
import { AppProvider } from '../state/AppProvider'
import { STORAGE_KEY, createLocalStorageRepository } from '../storage/localStorageRepository'
import type { ProgressRepository } from '../storage/repository'

vi.mock('../auth/supabaseAuth', () => ({ signOut: vi.fn(), getSession: vi.fn().mockResolvedValue(null) }))

const BANNER_TEXT = /Sumale un poco de IA a tu progreso/

function renderApp(plan: 'free' | 'premium' = 'free') {
  const base = createLocalStorageRepository()
  if (!window.localStorage.getItem(STORAGE_KEY)) {
    void base.save(createInitialData('2026-08-18T10:00:00.000Z'))
  }
  const repository: ProgressRepository = { ...base, getUserPlan: async () => plan }
  return render(
    <AppProvider repository={repository}>
      <App />
    </AppProvider>,
  )
}

describe('PremiumBanner en el dashboard', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.history.pushState({}, '', '/')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('se muestra a un usuario free, con un CTA que lleva a /premium', async () => {
    renderApp('free')
    await screen.findByText('Objetivos de hoy')

    expect(screen.getByText(BANNER_TEXT)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Conocer Premium' })).toHaveAttribute('href', '/premium')
  })

  it('no se muestra a un usuario Premium', async () => {
    renderApp('premium')
    await screen.findByText('Objetivos de hoy')

    expect(screen.queryByText(BANNER_TEXT)).not.toBeInTheDocument()
  })

  it('al cerrarlo desaparece y queda descartado (no vuelve a aparecer de inmediato)', async () => {
    const user = userEvent.setup()
    renderApp('free')
    await screen.findByText('Objetivos de hoy')

    await user.click(screen.getByRole('button', { name: 'Cerrar aviso de Premium' }))

    expect(screen.queryByText(BANNER_TEXT)).not.toBeInTheDocument()
    expect(isPremiumBannerDismissed()).toBe(true)
  })

  it('sigue descartado tras recargar mientras dure el enfriamiento', async () => {
    renderApp('free')
    await screen.findByText('Objetivos de hoy')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Cerrar aviso de Premium' }))

    renderApp('free')
    await screen.findByText('Objetivos de hoy')
    await waitFor(() => expect(screen.queryByText(BANNER_TEXT)).not.toBeInTheDocument())
  })
})
