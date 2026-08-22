import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../App'
import { createInitialData } from '../domain/defaults'
import { AppProvider } from '../state/AppProvider'
import { createLocalStorageRepository } from '../storage/localStorageRepository'

vi.mock('../auth/supabaseAuth', () => ({ signOut: vi.fn() }))

function renderFreshApp() {
  const repository = createLocalStorageRepository()
  return {
    repository,
    ...render(
      <AppProvider repository={repository}>
        <App />
      </AppProvider>,
    ),
  }
}

function renderExistingApp() {
  const repository = createLocalStorageRepository()
  void repository.save(createInitialData('2026-08-18T10:00:00.000Z'))
  return {
    repository,
    ...render(
      <AppProvider repository={repository}>
        <App />
      </AppProvider>,
    ),
  }
}

describe('Onboarding', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('una cuenta nueva ve el wizard, no la app', async () => {
    renderFreshApp()

    expect(await screen.findByText('¿Qué querés mejorar?')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Hoy' })).not.toBeInTheDocument()
  })

  it('elegir áreas filtra las sugerencias del paso 2', async () => {
    const user = userEvent.setup()
    renderFreshApp()
    await screen.findByText('¿Qué querés mejorar?')

    await user.click(screen.getByRole('button', { name: 'Salud' }))
    await user.click(screen.getByRole('button', { name: 'Productividad' }))
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(await screen.findByText('¿Qué querés lograr?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dormir 8 horas' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Trabajar sin distracciones' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Registrar los gastos del día' })).not.toBeInTheDocument()
  })

  it('permite agregar un objetivo propio', async () => {
    const user = userEvent.setup()
    renderFreshApp()
    await screen.findByText('¿Qué querés mejorar?')

    await user.click(screen.getByRole('button', { name: 'Salud' }))
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await screen.findByText('¿Qué querés lograr?')

    await user.type(screen.getByLabelText('Agregar un objetivo propio'), 'Practicar guitarra')
    await user.click(screen.getByRole('button', { name: 'Agregar' }))

    expect(screen.getByText('Practicar guitarra')).toBeInTheDocument()
  })

  it('avisa (sin bloquear) al elegir muchos objetivos', async () => {
    const user = userEvent.setup()
    renderFreshApp()
    await screen.findByText('¿Qué querés mejorar?')

    for (const area of ['Salud', 'Productividad', 'Desarrollo personal']) {
      await user.click(screen.getByRole('button', { name: area }))
    }
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await screen.findByText('¿Qué querés lograr?')

    for (const suggestion of screen.getAllByRole('button').filter((b) =>
      ['Dormir 8 horas', 'Hacer ejercicio', 'Tomar agua', 'Comer saludable', 'Caminar',
        'Trabajar sin distracciones', 'Planificar el día', 'Reducir uso del celular',
        'Leer', 'Estudiar', 'Aprender algo nuevo'].includes(b.textContent ?? ''),
    )) {
      await user.click(suggestion)
    }

    expect(
      await screen.findByText(/Elegiste bastantes objetivos para arrancar/),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeEnabled()
  })

  it('crea las categorías y objetivos con el peso del tier elegido, y entra a la app', async () => {
    const user = userEvent.setup()
    const { repository } = renderFreshApp()
    await screen.findByText('¿Qué querés mejorar?')

    await user.click(screen.getByRole('button', { name: 'Salud' }))
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await screen.findByText('¿Qué querés lograr?')

    await user.click(screen.getByRole('button', { name: 'Dormir 8 horas' }))
    await user.click(screen.getByRole('button', { name: 'Tomar agua' }))
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await screen.findByText('¿Qué tan importante es cada objetivo?')

    const dormirGroup = screen.getByRole('group', { name: 'Importancia de Dormir 8 horas' })
    await user.click(within(dormirGroup).getByRole('button', { name: /Alta/ }))

    await user.click(screen.getByRole('button', { name: 'Crear mis objetivos' }))
    await screen.findByText('Ya está. Mañana empiezo.')

    await waitFor(async () => {
      const stored = await repository.load()
      expect(stored?.categories.map((c) => c.name)).toEqual(['Salud'])
      const dormir = stored?.goals.find((g) => g.name === 'Dormir 8 horas')
      const agua = stored?.goals.find((g) => g.name === 'Tomar agua')
      expect(dormir?.weight).toBe(4) // alta
      expect(agua?.weight).toBe(2) // media (default)
      expect(dormir?.categoryId).toBe('salud')
    })

    await user.click(screen.getByRole('button', { name: 'Entrar a Mi Progreso' }))
    expect(await screen.findByRole('button', { name: 'Hoy' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Dormir 8 horas ×4' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Tomar agua ×2' })).toBeInTheDocument()
  })

  it('cerrar antes de terminar no persiste nada: al reabrir arranca de cero', async () => {
    const user = userEvent.setup()
    const { unmount, repository } = renderFreshApp()
    await screen.findByText('¿Qué querés mejorar?')

    await user.click(screen.getByRole('button', { name: 'Salud' }))
    expect(screen.getByRole('button', { name: 'Salud' })).toHaveAttribute('aria-pressed', 'true')

    unmount()
    await waitFor(async () => {
      const stored = await repository.load()
      expect(stored?.categories ?? []).toHaveLength(0)
    })

    renderFreshApp()
    expect(await screen.findByText('¿Qué querés mejorar?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salud' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('una cuenta existente nunca ve el wizard', async () => {
    renderExistingApp()

    expect(await screen.findByText('Objetivos de hoy')).toBeInTheDocument()
    expect(screen.queryByText('¿Qué querés mejorar?')).not.toBeInTheDocument()
  })

  it('"Borrar todos los datos" en Ajustes vuelve a mostrar el wizard', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderExistingApp()
    await screen.findByText('Objetivos de hoy')

    await user.click(screen.getByRole('button', { name: 'Ajustes' }))
    await user.click(screen.getByRole('button', { name: 'Borrar todos los datos' }))

    expect(await screen.findByText('¿Qué querés mejorar?')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Hoy' })).not.toBeInTheDocument()
  })

  it('permite empezar con objetivos de ejemplo, saltando el wizard', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderFreshApp()
    await screen.findByText('¿Qué querés mejorar?')

    await user.click(screen.getByRole('button', { name: 'Prefiero empezar con objetivos de ejemplo' }))

    expect(await screen.findByText('Objetivos de hoy')).toBeInTheDocument()
    expect(screen.getAllByRole('checkbox')).toHaveLength(11)
  })
})
