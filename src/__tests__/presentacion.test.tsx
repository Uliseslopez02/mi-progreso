import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { PresentacionPage } from '../presentacion/PresentacionPage'

describe('PresentacionPage', () => {
  it('renderiza la narrativa comercial completa', () => {
    render(<PresentacionPage />)

    expect(
      screen.getByRole('heading', { name: /Dejá de adivinar si estás progresando/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Hacés cosas todos los días/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Mi Progreso conecta lo que hacés/i })).toBeInTheDocument()
    expect(screen.getByText(/Para lo que no es diario/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /¿Qué significa realmente ese número\?/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /De elegir qué te importa/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Tu progreso ya está pasando/i })).toBeInTheDocument()
    expect(document.title).toMatch(/Mi Progreso/)
  })

  it('la recreación de "Hoy" usa el mismo cálculo que la app al marcar un objetivo', async () => {
    render(<PresentacionPage />)

    const dayCard = screen
      .getByText('Así se ve tu progreso, todos los días.')
      .closest('.pr-section') as HTMLElement
    // El día arranca a medias: faltan Bloque de trabajo profundo (30) y Bandeja (20).
    expect(within(dayCard).getByTestId('ring-percent')).toHaveTextContent('50%')

    await userEvent.click(within(dayCard).getByRole('checkbox', { name: /Bloque de trabajo profundo/i }))

    // 50 + 30 = 80% → nota 8, "Muy buen día" (mismo labelForPercent que la app).
    expect(within(dayCard).getByTestId('ring-percent')).toHaveTextContent('80%')
    expect(within(dayCard).getByText(/Nota del día ·\s*Muy buen día/)).toBeInTheDocument()
  })

  it('el editor de peso recalcula el % igual que Objetivos → Editar', async () => {
    render(<PresentacionPage />)

    const percentCard = screen
      .getByRole('heading', { name: /¿Qué significa realmente ese número\?/i })
      .closest('.pr-section') as HTMLElement

    const pctOf = () => {
      const stat = within(percentCard).getByText('del día').closest('button') as HTMLElement
      return Number(within(stat).getByText(/%$/).textContent!.replace('%', ''))
    }

    const weightInput = within(percentCard).getByLabelText('Peso de Entrenar') as HTMLInputElement
    expect(weightInput.value).toBe('25')
    const before = pctOf()

    // "Entrenar" está cumplido hoy: subir su peso sube el % del día al instante.
    fireEvent.change(weightInput, { target: { value: '80' } })

    expect(weightInput.value).toBe('80')
    expect(pctOf()).toBeGreaterThan(before)
  })

  it('muestra la racha del día como en "Esta semana", con el umbral configurable', () => {
    render(<PresentacionPage />)
    const progressCard = screen
      .getByText(/No es un solo día\./)
      .closest('.pr-section') as HTMLElement
    // Texto textual de WeekCard, la fuente de verdad de la racha del día.
    expect(within(progressCard).getByText(/Días seguidos con 70% o más/)).toBeInTheDocument()
    expect(within(progressCard).getByText(/Con 70% o más/)).toBeInTheDocument()
  })

  it('la Agenda recrea el <DayTimeline> real con los ítems de la demo', () => {
    render(<PresentacionPage />)
    const agendaCard = screen.getByRole('heading', { name: 'Agenda del día' }).closest('.card') as HTMLElement
    expect(within(agendaCard).getByText('Llamar al banco')).toBeInTheDocument()
    expect(within(agendaCard).getByText('Bloque de trabajo profundo')).toBeInTheDocument()
    // Ítem vinculado a un hábito muestra el link real.
    expect(within(agendaCard).getByText(/Caminar 30 minutos/)).toBeInTheDocument()
  })

  it('marcar el hábito vinculado en Hábitos sube el % de la meta en Metas', async () => {
    render(<PresentacionPage />)

    const habitsCard = screen
      .getByText(/Los hábitos no puntúan tu día/)
      .closest('.pr-section') as HTMLElement
    const metasCard = screen
      .getByRole('heading', { name: 'Objetivos y metas' })
      .closest('.card') as HTMLElement

    const goalCard = within(metasCard)
      .getByText('Correr 10 km sin parar')
      .closest('.lifegoal-card') as HTMLElement
    const before = Number(within(goalCard).getByText(/%$/).textContent!.replace('%', ''))

    await userEvent.click(within(habitsCard).getByRole('checkbox', { name: /Caminar 30 minutos/i }))

    const after = Number(within(goalCard).getByText(/%$/).textContent!.replace('%', ''))
    expect(after).not.toBe(before)
  })
})
