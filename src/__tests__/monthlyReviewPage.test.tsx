import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../App'
import { formatLongDate, todayKey } from '../domain/date'
import { createInitialData } from '../domain/defaults'
import { MONTHLY_REVIEW_PROMPTS } from '../domain/reflection'
import { AppProvider } from '../state/AppProvider'
import { createLocalStorageRepository } from '../storage/localStorageRepository'

vi.mock('../auth/supabaseAuth', () => ({ signOut: vi.fn(), getSession: vi.fn().mockResolvedValue(null) }))

function renderApp() {
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

async function goToReview(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByText('Objetivos de hoy')
  await user.click(screen.getByRole('button', { name: 'Informes' }))
  await user.click(screen.getByRole('button', { name: 'Revisión mensual' }))
  await screen.findByText('¿Cómo estuvo el mes?')
}

async function answerQuestions(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  await screen.findByText('Reflexioná sobre el mes')
  for (const prompt of MONTHLY_REVIEW_PROMPTS) {
    await user.type(screen.getByLabelText(prompt), `Respuesta a: ${prompt}`)
  }
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  await screen.findByText('Resumen y prioridades')
}

describe('Revisión mensual guiada', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.history.pushState({}, '', '/')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('muestra la sub-nav de Informes con Resumen y Revisión mensual', async () => {
    const user = userEvent.setup()
    renderApp()
    await screen.findByText('Objetivos de hoy')

    await user.click(screen.getByRole('button', { name: 'Informes' }))
    expect(await screen.findByRole('button', { name: 'Resumen' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Informes' })).toHaveAttribute('aria-current', 'page')

    await user.click(screen.getByRole('button', { name: 'Revisión mensual' }))
    expect(await screen.findByText('¿Cómo estuvo el mes?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Revisión mensual' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Informes' })).toHaveAttribute('aria-current', 'page')
  })

  it('avanza y retrocede los pasos sin perder el texto tipeado', async () => {
    const user = userEvent.setup()
    renderApp()
    await goToReview(user)

    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await screen.findByText('Reflexioná sobre el mes')

    await user.type(screen.getByLabelText(MONTHLY_REVIEW_PROMPTS[0]), 'Salió bien dormir mejor')

    await user.click(screen.getByRole('button', { name: 'Atrás' }))
    await screen.findByText('¿Cómo estuvo el mes?')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await screen.findByText('Reflexioná sobre el mes')

    expect(screen.getByLabelText(MONTHLY_REVIEW_PROMPTS[0])).toHaveValue('Salió bien dormir mejor')
  })

  it(
    'completa la revisión y persiste las 6 respuestas',
    async () => {
      const user = userEvent.setup()
      const { repository } = renderApp()
      await goToReview(user)
      await answerQuestions(user)

      await user.type(screen.getByLabelText('Prioridades del próximo mes'), 'Dormir más, leer más')
      await user.click(screen.getByRole('button', { name: 'Continuar' }))
      await screen.findByText('Todo listo para guardar')

      await user.click(screen.getByRole('button', { name: 'Guardar revisión' }))
      await screen.findByText('Revisión guardada')

      await waitFor(async () => {
        const stored = await repository.load()
        const reviewReflections = stored?.reflections.filter((r) => r.date === todayKey()) ?? []
        expect(reviewReflections).toHaveLength(6)
        expect(reviewReflections.map((r) => r.prompt)).toEqual(
          expect.arrayContaining([...MONTHLY_REVIEW_PROMPTS, 'Prioridades del próximo mes']),
        )
      })

      expect(await screen.findByText('Dormir más, leer más')).toBeInTheDocument()
    },
    10000,
  )

  it('no persiste respuestas en blanco', async () => {
    const user = userEvent.setup()
    const { repository } = renderApp()
    await goToReview(user)

    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await screen.findByText('Reflexioná sobre el mes')
    await user.type(screen.getByLabelText(MONTHLY_REVIEW_PROMPTS[0]), 'Única respuesta')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await screen.findByText('Resumen y prioridades')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await screen.findByText('Todo listo para guardar')

    await user.click(screen.getByRole('button', { name: 'Guardar revisión' }))
    await screen.findByText('Revisión guardada')

    await waitFor(async () => {
      const stored = await repository.load()
      expect(stored?.reflections).toHaveLength(1)
      expect(stored?.reflections[0]).toMatchObject({ prompt: MONTHLY_REVIEW_PROMPTS[0], answer: 'Única respuesta' })
    })
  })

  it(
    'lista las revisiones anteriores agrupadas por fecha y permite borrar una respuesta puntual',
    async () => {
      const user = userEvent.setup()
      const { repository } = renderApp()
      await goToReview(user)
      await answerQuestions(user)
      await user.click(screen.getByRole('button', { name: 'Continuar' }))
      await screen.findByText('Todo listo para guardar')
      await user.click(screen.getByRole('button', { name: 'Guardar revisión' }))
      await screen.findByText('Revisión guardada')

      expect(await screen.findByText('Revisiones anteriores')).toBeInTheDocument()
      for (const prompt of MONTHLY_REVIEW_PROMPTS) {
        expect(screen.getByText(prompt)).toBeInTheDocument()
        expect(screen.getByText(`Respuesta a: ${prompt}`)).toBeInTheDocument()
      }

      const todayLabel = formatLongDate(todayKey())
      await user.click(
        screen.getByRole('button', { name: `Eliminar respuesta a "${MONTHLY_REVIEW_PROMPTS[0]}" del ${todayLabel}` }),
      )

      await waitFor(async () => {
        const stored = await repository.load()
        expect(stored?.reflections.find((r) => r.prompt === MONTHLY_REVIEW_PROMPTS[0])).toBeUndefined()
        expect(stored?.reflections).toHaveLength(MONTHLY_REVIEW_PROMPTS.length - 1)
      })
      expect(screen.queryByText(MONTHLY_REVIEW_PROMPTS[0])).not.toBeInTheDocument()
      expect(screen.getByText(MONTHLY_REVIEW_PROMPTS[1])).toBeInTheDocument()
    },
    10000,
  )
})
