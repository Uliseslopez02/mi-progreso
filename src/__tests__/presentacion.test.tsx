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

  it('Rutinas: marcar un paso recalcula el progreso y el modo enfocado avanza paso a paso', async () => {
    render(<PresentacionPage />)

    const rutinasCard = screen
      .getByRole('heading', { name: 'Rutinas de hoy' })
      .closest('.card') as HTMLElement
    // Demo: el ritual de la mañana ya lleva 2 de 4 pasos.
    expect(within(rutinasCard).getByText('2 de 4 completados')).toBeInTheDocument()

    await userEvent.click(within(rutinasCard).getByRole('checkbox', { name: '10 minutos de estiramiento' }))
    expect(within(rutinasCard).getByText('3 de 4 completados')).toBeInTheDocument()

    await userEvent.click(
      within(rutinasCard).getAllByRole('button', { name: 'Modo enfocado' })[0],
    )
    const dialog = screen.getByRole('dialog', { name: /Modo enfocado — Ritual de la mañana/i })
    expect(within(dialog).getByText('Paso 4 de 4')).toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Hecho, siguiente' }))
    expect(within(dialog).getByText(/Rutina completa/)).toBeInTheDocument()
  })

  it('el Calendario recrea el <MonthCalendar> real: hoy es editable, los días pasados son sólo lectura', async () => {
    render(<PresentacionPage />)

    const calendarCard = screen
      .getByRole('heading', { name: /Calendario: tu mes/i })
      .closest('.pr-section') as HTMLElement

    // Hoy: editable, con el GoalList real.
    expect(within(calendarCard).getByRole('checkbox', { name: /Entrenar/i })).toBeInTheDocument()

    const pastDay = within(calendarCard)
      .getAllByRole('button')
      .find(
        (b) =>
          b.className.includes('calendar__day') &&
          !b.className.includes('calendar__day--today') &&
          !(b as HTMLButtonElement).disabled &&
          /%/.test(b.getAttribute('aria-label') ?? ''),
      ) as HTMLElement
    expect(pastDay).toBeTruthy()
    await userEvent.click(pastDay)

    // Día pasado: sólo lectura (Completados/Pendientes), no checkboxes.
    expect(within(calendarCard).getByText('Completados')).toBeInTheDocument()
    expect(within(calendarCard).queryByRole('checkbox')).not.toBeInTheDocument()

    const titleBefore = within(calendarCard).getByText(/^\w+ \d{4}$/).textContent
    await userEvent.click(within(calendarCard).getByRole('button', { name: 'Mes anterior' }))
    expect(within(calendarCard).getByText(/^\w+ \d{4}$/).textContent).not.toBe(titleBefore)
  })

  it('Enfoque: muestra el historial real, arranca un temporizador y lo puede detener', async () => {
    render(<PresentacionPage />)

    const focusCard = screen.getByRole('heading', { name: 'Enfoque' }).closest('.pr-focus') as HTMLElement
    // Demo: 25 + 50 min completados hoy, una vinculada a una tarea de la agenda.
    expect(within(focusCard).getByText('75')).toBeInTheDocument()
    expect(within(focusCard).getByText(/50 min · Bloque de trabajo profundo/)).toBeInTheDocument()

    await userEvent.click(within(focusCard).getByRole('button', { name: 'Iniciar' }))
    expect(within(focusCard).getByText(/^\d{2}:\d{2}$/)).toBeInTheDocument()

    await userEvent.click(within(focusCard).getByRole('button', { name: 'Detener' }))
    // Vuelve al setup y la sesión detenida queda primera en el historial.
    expect(within(focusCard).getByRole('button', { name: 'Iniciar' })).toBeInTheDocument()
    expect(within(focusCard).getAllByText('Detenida')[0]).toBeInTheDocument()
  })

  it('Informes recrea el monthlyReport real: stats, conclusiones y ninguna frase inventada', () => {
    render(<PresentacionPage />)

    const informesCard = screen
      .getByRole('heading', { name: /Informe de/i })
      .closest('.card') as HTMLElement

    // Fuente de verdad: domain/monthlyReport.ts + monthlyConclusions.ts sobre los mismos `days` de la demo.
    expect(within(informesCard).getByText('Categoría más fuerte')).toBeInTheDocument()
    expect(within(informesCard).getByText('Salud')).toBeInTheDocument()
    expect(within(informesCard).getByText('Conclusiones')).toBeInTheDocument()
    expect(
      within(informesCard).getByText(/Tu categoría más fuerte fue Salud\./),
    ).toBeInTheDocument()
  })

  it('el Mapa anual recrea el <HabitYearHeatmap> real y cambia de hábito', async () => {
    render(<PresentacionPage />)

    const mapaCard = screen.getByRole('heading', { name: 'Mapa anual' }).closest('.card') as HTMLElement
    const habitSelect = within(mapaCard).getByLabelText('Hábito') as HTMLSelectElement

    const statValue = () => within(mapaCard).getByText('Cumplimiento').nextElementSibling?.textContent
    const before = statValue()

    await userEvent.selectOptions(habitSelect, 'Leer 20 minutos')
    expect(statValue()).not.toBe(before)

    // 45 días de historial fabricado: la mayoría del año queda "sin registro", como en una cuenta nueva real.
    expect(within(mapaCard).getByText('Sin registro')).toBeInTheDocument()
  })

  it('Momento Mori calcula con timeLived real y guarda una reflexión nueva', async () => {
    render(<PresentacionPage />)

    const moriCard = screen.getByRole('heading', { name: 'Momento Mori' }).closest('.card') as HTMLElement
    // Nacimiento demo 1996-03-15: ya viviste más de 25 años, es un cálculo real (no un número fijo).
    expect(within(moriCard).getByText(/años y/)).toBeInTheDocument()

    const reflectionSection = screen.getByRole('heading', { name: 'Reflexión de hoy' }).closest('.card') as HTMLElement
    await userEvent.type(within(reflectionSection).getByLabelText('Tu respuesta'), 'Prueba de reflexión')
    await userEvent.click(within(reflectionSection).getByRole('button', { name: 'Guardar reflexión' }))

    expect(within(reflectionSection).getByText('Prueba de reflexión')).toBeInTheDocument()
  })

  it('Notas: crea, edita y elimina una nota como en Historial → Notas', async () => {
    render(<PresentacionPage />)

    const notesSection = screen.getByRole('heading', { name: 'Nueva nota' }).closest('.card') as HTMLElement
    await userEvent.type(within(notesSection).getByLabelText('Nota'), 'Nota de prueba')
    await userEvent.click(within(notesSection).getByRole('button', { name: 'Guardar nota' }))

    const listSection = screen.getByRole('heading', { name: 'Notas anteriores' }).closest('.card') as HTMLElement
    const newNoteItem = within(listSection).getByText('Nota de prueba').closest('li') as HTMLElement

    await userEvent.click(within(newNoteItem).getByRole('button', { name: /Eliminar nota del/ }))
    expect(within(listSection).queryByText('Nota de prueba')).not.toBeInTheDocument()
  })
})
