import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../App'
import * as supabaseAuth from '../auth/supabaseAuth'
import { todayKey } from '../domain/date'
import { createInitialData } from '../domain/defaults'
import { AppProvider } from '../state/AppProvider'
import { serializeBackup } from '../storage/backup'
import { STORAGE_KEY, createLocalStorageRepository } from '../storage/localStorageRepository'

vi.mock('../auth/supabaseAuth', () => ({ signOut: vi.fn(), getSession: vi.fn().mockResolvedValue(null) }))

function renderApp() {
  const repository = createLocalStorageRepository()
  // AppProvider ya no siembra createInitialData() por defecto (eso ahora lo
  // hace el onboarding) — para probar la app "normal" hay que sembrar acá, pero
  // sólo si todavía no hay nada guardado: algunos tests llaman a renderApp()
  // dos veces sobre el mismo localStorage para simular "cerrar y reabrir", y
  // resembrar pisaría el estado real ya guardado.
  if (!window.localStorage.getItem(STORAGE_KEY)) {
    void repository.save(createInitialData('2026-08-18T10:00:00.000Z'))
  }
  return {
    repository,
    ...render(
      <AppProvider repository={repository}>
        <App />
      </AppProvider>,
    ),
  }
}

const ringPercent = () => screen.getByTestId('ring-percent').textContent

describe('Mi Progreso', () => {
  beforeEach(() => {
    window.localStorage.clear()
    // BrowserRouter lee el location real de jsdom, que sobrevive entre tests
    // del mismo archivo: si un test anterior navegó a otra tab, el siguiente
    // arrancaría ahí en vez de en "Hoy".
    window.history.pushState({}, '', '/')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('si la carga inicial falla, muestra un error con reintentar en vez de quedar trabada', async () => {
    let attempt = 0
    const repository = {
      load: vi.fn().mockImplementation(() => {
        attempt += 1
        if (attempt === 1) return Promise.reject(new Error('network down'))
        return Promise.resolve(createInitialData('2026-08-18T10:00:00.000Z'))
      }),
      save: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
      getUserPlan: vi.fn().mockResolvedValue('free'),
    }

    render(
      <AppProvider repository={repository as never}>
        <App />
      </AppProvider>,
    )

    const retryButton = await screen.findByRole('button', { name: 'Reintentar' })
    expect(screen.getByRole('alert')).toHaveTextContent(/no pudimos/i)

    const user = userEvent.setup()
    await user.click(retryButton)

    expect(await screen.findByTestId('ring-percent')).toBeInTheDocument()
    expect(repository.load).toHaveBeenCalledTimes(2)
  })

  it('arranca el día en 0% con los objetivos por defecto', async () => {
    renderApp()

    expect(await screen.findByText('Objetivos de hoy')).toBeInTheDocument()
    expect(ringPercent()).toBe('0%')
    expect(screen.getByText('0 / 10')).toBeInTheDocument()
    expect(screen.getByText('0 de 11 objetivos completados')).toBeInTheDocument()
    expect(screen.getAllByRole('checkbox')).toHaveLength(11)
  })

  it('marcar un objetivo mueve el porcentaje y la nota de verdad', async () => {
    const user = userEvent.setup()
    renderApp()
    await screen.findByText('Objetivos de hoy')

    await user.click(screen.getByRole('checkbox', { name: '📖 Leer 20 minutos ×8' }))

    expect(ringPercent()).toBe('8%')
    expect(screen.getByText('0,8 / 10')).toBeInTheDocument()
    expect(screen.getByText('1 de 11 objetivos completados')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: '📖 Leer 20 minutos ×8' })).toHaveAttribute(
      'aria-checked',
      'true',
    )

    await user.click(screen.getByRole('checkbox', { name: '📖 Leer 20 minutos ×8' }))
    expect(ringPercent()).toBe('0%')
    expect(screen.getByRole('checkbox', { name: '📖 Leer 20 minutos ×8' })).toHaveAttribute(
      'aria-checked',
      'false',
    )
  })

  it('completar todo llega a 100%, nota 10 y mensaje de excelente día', async () => {
    const user = userEvent.setup()
    renderApp()
    await screen.findByText('Objetivos de hoy')

    for (const checkbox of screen.getAllByRole('checkbox')) {
      await user.click(checkbox)
    }

    expect(ringPercent()).toBe('100%')
    expect(screen.getByText('10 / 10')).toBeInTheDocument()
    expect(screen.getByText('Excelente día. Estás construyendo una gran consistencia.')).toBeInTheDocument()
  })

  it('lo marcado sobrevive a cerrar y volver a abrir la app', async () => {
    const user = userEvent.setup()
    const { unmount, repository } = renderApp()
    await screen.findByText('Objetivos de hoy')

    await user.click(screen.getByRole('checkbox', { name: '💊 Tomar creatina ×9' }))
    await waitFor(async () => {
      const stored = await repository.load()
      expect(stored?.days[todayKey()].goalProgress).toEqual({ 'salud-creatina': true })
    })

    unmount()
    renderApp()

    await screen.findByText('Objetivos de hoy')
    expect(screen.getByRole('checkbox', { name: '💊 Tomar creatina ×9' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(ringPercent()).toBe('9%')
  })

  it('un objetivo creado en Ajustes aparece hoy', async () => {
    const user = userEvent.setup()
    renderApp()
    await screen.findByText('Objetivos de hoy')

    await user.click(screen.getByRole('button', { name: 'Ajustes' }))
    await user.type(screen.getByLabelText('Nuevo objetivo'), 'Meditar 10 minutos')
    await user.click(screen.getByRole('button', { name: 'Agregar' }))

    await user.click(screen.getByRole('button', { name: 'Hoy' }))
    expect(await screen.findByRole('checkbox', { name: 'Meditar 10 minutos' })).toBeInTheDocument()
    expect(screen.getByText('0 de 12 objetivos completados')).toBeInTheDocument()
  })

  it('Ajustes muestra el plan de la cuenta (Free por defecto sin Supabase)', async () => {
    const user = userEvent.setup()
    renderApp()
    await screen.findByText('Objetivos de hoy')

    await user.click(screen.getByRole('button', { name: 'Ajustes' }))
    expect(await screen.findByText('Free')).toBeInTheDocument()
  })

  it('eliminar un objetivo en Ajustes lo saca del día', async () => {
    const user = userEvent.setup()
    renderApp()
    await screen.findByText('Objetivos de hoy')

    await user.click(screen.getByRole('button', { name: 'Ajustes' }))
    await user.click(screen.getByRole('button', { name: 'Eliminar 📖 Leer 20 minutos' }))

    await user.click(screen.getByRole('button', { name: 'Hoy' }))
    expect(await screen.findByText('0 de 10 objetivos completados')).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: /📖 Leer 20 minutos/ })).not.toBeInTheDocument()
  })

  it('el peso configurado cambia cuánto suma cada objetivo', async () => {
    const user = userEvent.setup()
    renderApp()
    await screen.findByText('Objetivos de hoy')

    await user.click(screen.getByRole('button', { name: 'Ajustes' }))
    fireEvent.change(screen.getByLabelText('Peso de 💊 Tomar creatina'), {
      target: { value: '30' },
    })

    await user.click(screen.getByRole('button', { name: 'Hoy' }))
    await user.click(await screen.findByRole('checkbox', { name: '💊 Tomar creatina ×30' }))

    // 30 puntos sobre 121 de peso total (100 - 9 + 30) = 25%, aunque sea 1 de 11 objetivos.
    expect(ringPercent()).toBe('25%')
    expect(screen.getByText('1 de 11 objetivos completados')).toBeInTheDocument()
  })

  it('el calendario no deja avanzar al futuro y abre el detalle del día', async () => {
    const user = userEvent.setup()
    renderApp()
    await screen.findByText('Objetivos de hoy')

    await user.click(screen.getByRole('button', { name: 'Historial' }))
    await user.click(screen.getByRole('button', { name: 'Calendario' }))

    expect(await screen.findByRole('button', { name: 'Mes siguiente' })).toBeDisabled()
    expect(screen.getByText(/0 de 11 objetivos/)).toBeInTheDocument()
  })

  it('el historial muestra el gráfico y las estadísticas', async () => {
    const user = userEvent.setup()
    renderApp()
    await screen.findByText('Objetivos de hoy')

    await user.click(screen.getByRole('button', { name: 'Historial' }))

    expect(await screen.findByText('Progreso diario (%)')).toBeInTheDocument()
    expect(screen.getByText('Días consecutivos')).toBeInTheDocument()
    expect(screen.getAllByText('Mejor día').length).toBeGreaterThan(0)
    expect(screen.getByRole('img', { name: /Progreso diario de los últimos 14 días/ })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '30 días' }))
    expect(
      await screen.findByRole('img', { name: /Progreso diario de los últimos 30 días/ }),
    ).toBeInTheDocument()
  })

  it('el historial muestra la constancia de cada objetivo', async () => {
    const user = userEvent.setup()
    renderApp()
    await screen.findByText('Objetivos de hoy')

    await user.click(screen.getByRole('checkbox', { name: '📖 Leer 20 minutos ×8' }))
    await user.click(screen.getByRole('button', { name: 'Historial' }))

    expect(await screen.findByText('Constancia por objetivo')).toBeInTheDocument()
    const leer = screen
      .getByText('📖 Leer 20 minutos', { selector: '.consistency__name' })
      .closest('li')!
    expect(leer).toHaveTextContent('100%')
    expect(leer).toHaveTextContent('1/1')

    const entrenar = screen
      .getByText('Hacer actividad física', { selector: '.consistency__name' })
      .closest('li')!
    expect(entrenar).toHaveTextContent('0%')
  })

  it('importar un respaldo reemplaza los datos', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderApp()
    await screen.findByText('Objetivos de hoy')

    const backup = createInitialData('2026-01-01T10:00:00.000Z')
    backup.settings.appName = 'Disciplina'
    backup.goals = [
      {
        id: 'importado',
        name: 'Objetivo importado',
        categoryId: 'salud',
        weight: 1,
        active: true,
        period: 'daily',
        order: 0,
        createdAt: '2026-01-01T10:00:00.000Z',
        kind: 'boolean',
      },
    ]
    const file = new File(
      [serializeBackup(backup, '2026-08-18T12:00:00.000Z')],
      'mi-progreso-2026-08-18.json',
      { type: 'application/json' },
    )

    await user.click(screen.getByRole('button', { name: 'Ajustes' }))
    await user.upload(screen.getByLabelText('Archivo de respaldo'), file)

    expect(await screen.findByRole('heading', { level: 1, name: 'Disciplina' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Hoy' }))
    expect(await screen.findByRole('checkbox', { name: 'Objetivo importado' })).toBeInTheDocument()
    expect(screen.getByText('0 de 1 objetivo completado')).toBeInTheDocument()
  })

  it('avisa cuando el archivo importado no sirve', async () => {
    const user = userEvent.setup()
    renderApp()
    await screen.findByText('Objetivos de hoy')

    await user.click(screen.getByRole('button', { name: 'Ajustes' }))
    await user.upload(
      screen.getByLabelText('Archivo de respaldo'),
      new File(['{}'], 'roto.json', { type: 'application/json' }),
    )

    expect(await screen.findByRole('status')).toHaveTextContent(
      'El archivo no tiene datos de Mi Progreso.',
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Mi Progreso' })).toBeInTheDocument()
  })

  it('un objetivo semanal creado en Ajustes aparece en Hoy y se puede marcar', async () => {
    const user = userEvent.setup()
    renderApp()
    await screen.findByText('Objetivos de hoy')

    await user.click(screen.getByRole('button', { name: 'Ajustes' }))
    await user.type(screen.getByLabelText('Nuevo objetivo'), 'Planificar la semana')
    await user.selectOptions(screen.getByLabelText('Frecuencia'), 'Semanal')
    await user.click(screen.getByRole('button', { name: 'Agregar' }))

    await user.click(screen.getByRole('button', { name: 'Hoy' }))
    expect(await screen.findByText('Objetivos de la semana')).toBeInTheDocument()
    expect(screen.queryByText('Objetivos del mes')).not.toBeInTheDocument()

    const checkbox = screen.getByRole('checkbox', { name: 'Planificar la semana' })
    expect(checkbox).toHaveAttribute('aria-checked', 'false')

    await user.click(checkbox)
    expect(checkbox).toHaveAttribute('aria-checked', 'true')

    // El objetivo semanal no se mezcla con el cálculo del día.
    expect(ringPercent()).toBe('0%')
  })

  it('un objetivo cuantitativo se crea desde Ajustes, se puede cargar progreso y persiste', async () => {
    const user = userEvent.setup()
    const { repository } = renderApp()
    await screen.findByText('Objetivos de hoy')

    await user.click(screen.getByRole('button', { name: 'Ajustes' }))
    await user.type(screen.getByLabelText('Nuevo objetivo'), 'Tomar agua')
    await user.selectOptions(screen.getByLabelText('Tipo'), 'Cantidad')
    fireEvent.change(screen.getByLabelText('Meta'), { target: { value: '2' } })
    await user.type(screen.getByLabelText('Unidad'), 'L')
    await user.click(screen.getByRole('button', { name: 'Agregar' }))

    await user.click(screen.getByRole('button', { name: 'Hoy' }))
    const input = await screen.findByLabelText('Tomar agua')
    expect(input).toHaveValue(0)

    fireEvent.change(input, { target: { value: '1.5' } })

    await waitFor(async () => {
      const stored = await repository.load()
      const progress = Object.values(stored?.days[todayKey()].goalProgress ?? {})
      expect(progress).toContain(1.5)
    })

    // 1.5 de 2L = 75% del peso de este objetivo, que entra a la ponderación general.
    expect(screen.getByText(/1\.5\/2 L/)).toBeInTheDocument()
  })

  it('Cerrar sesión en Ajustes llama a signOut', async () => {
    const user = userEvent.setup()
    renderApp()
    await screen.findByText('Objetivos de hoy')

    await user.click(screen.getByRole('button', { name: 'Ajustes' }))
    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

    expect(supabaseAuth.signOut).toHaveBeenCalledTimes(1)
  })

  it('una meta se crea desde Metas, admite subobjetivos y progreso, y persiste', async () => {
    const user = userEvent.setup()
    const { repository } = renderApp()
    await screen.findByText('Objetivos de hoy')

    await user.click(screen.getByRole('button', { name: 'Objetivos' }))
    await user.click(screen.getByRole('button', { name: 'Metas' }))
    await user.type(screen.getByLabelText('Nombre'), 'Mejorar mi condición física')
    await user.selectOptions(screen.getByLabelText('Ámbito'), 'Personal')
    await user.click(screen.getByRole('button', { name: 'Crear meta' }))

    expect(await screen.findByDisplayValue('Mejorar mi condición física')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Nuevo subobjetivo'), 'Entrenar 4 veces por semana')
    await user.click(screen.getByRole('button', { name: 'Agregar subobjetivo' }))
    const subGoalCheckbox = await screen.findByRole('checkbox', { name: 'Entrenar 4 veces por semana' })
    await user.click(subGoalCheckbox)
    expect(subGoalCheckbox).toBeChecked()

    fireEvent.change(screen.getByLabelText('Ajustar progreso'), { target: { value: '35' } })
    expect(screen.getByText('35%')).toBeInTheDocument()

    await waitFor(async () => {
      const stored = await repository.load()
      expect(stored?.lifeGoals).toHaveLength(1)
      expect(stored?.lifeGoals[0]).toMatchObject({
        name: 'Mejorar mi condición física',
        scope: 'personal',
        progress: 35,
        subGoals: [{ text: 'Entrenar 4 veces por semana', done: true }],
      })
    })
  })

  it('una meta tipo Dinero deriva el progreso de Actual/Meta y persiste', async () => {
    const user = userEvent.setup()
    const { repository } = renderApp()
    await screen.findByText('Objetivos de hoy')

    await user.click(screen.getByRole('button', { name: 'Objetivos' }))
    await user.click(screen.getByRole('button', { name: 'Metas' }))
    await user.type(screen.getByLabelText('Nombre'), 'Ahorrar para el viaje')
    await user.selectOptions(screen.getByLabelText('Tipo'), 'Dinero')
    fireEvent.change(screen.getByLabelText('Meta'), { target: { value: '10000' } })
    await user.click(screen.getByRole('button', { name: 'Crear meta' }))

    await screen.findByDisplayValue('Ahorrar para el viaje')
    fireEvent.change(screen.getByLabelText('Actual'), { target: { value: '6500' } })
    expect(screen.getByText('65%')).toBeInTheDocument()

    await waitFor(async () => {
      const stored = await repository.load()
      const goal = stored?.lifeGoals.find((g) => g.name === 'Ahorrar para el viaje')
      expect(goal).toMatchObject({ kind: 'money', currentValue: 6500, targetValue: 10000, progress: 65 })
    })
  })

  it('una meta tipo Hitos deriva el progreso de los hitos cumplidos y persiste', async () => {
    const user = userEvent.setup()
    const { repository } = renderApp()
    await screen.findByText('Objetivos de hoy')

    await user.click(screen.getByRole('button', { name: 'Objetivos' }))
    await user.click(screen.getByRole('button', { name: 'Metas' }))
    await user.type(screen.getByLabelText('Nombre'), 'Lanzar el sitio web')
    await user.selectOptions(screen.getByLabelText('Tipo'), 'Hitos')
    await user.click(screen.getByRole('button', { name: 'Crear meta' }))

    await screen.findByDisplayValue('Lanzar el sitio web')
    await user.type(screen.getByLabelText('Nuevo hito'), 'Diseño aprobado')
    await user.click(screen.getByRole('button', { name: 'Agregar hito' }))
    await user.type(screen.getByLabelText('Nuevo hito'), 'Publicado')
    await user.click(screen.getByRole('button', { name: 'Agregar hito' }))

    const primerHito = await screen.findByRole('checkbox', { name: 'Diseño aprobado' })
    await user.click(primerHito)
    expect(screen.getByText('50%')).toBeInTheDocument()
    expect(screen.getByText('Próximo hito: Publicado')).toBeInTheDocument()

    await waitFor(async () => {
      const stored = await repository.load()
      const goal = stored?.lifeGoals.find((g) => g.name === 'Lanzar el sitio web')
      expect(goal?.progress).toBe(50)
      expect(goal?.milestones).toEqual([
        { id: expect.any(String), name: 'Diseño aprobado', done: true },
        { id: expect.any(String), name: 'Publicado', done: false },
      ])
    })
  })

  it('una tarea se crea desde el Planificador, se puede marcar y persiste', async () => {
    const user = userEvent.setup()
    const { repository } = renderApp()
    await screen.findByText('Objetivos de hoy')

    await user.click(screen.getByRole('button', { name: 'Agenda' }))
    await user.click(screen.getByRole('button', { name: 'Planificador' }))
    await user.type(screen.getByLabelText('Título'), 'Revisar propuesta')
    await user.selectOptions(screen.getByLabelText('Prioridad'), 'Alta')
    await user.click(screen.getByRole('button', { name: 'Agregar' }))

    const checkbox = await screen.findByRole('checkbox', { name: 'Revisar propuesta' })
    await user.click(checkbox)
    expect(checkbox).toBeChecked()

    await waitFor(async () => {
      const stored = await repository.load()
      expect(stored?.plannerItems).toHaveLength(1)
      expect(stored?.plannerItems[0]).toMatchObject({
        title: 'Revisar propuesta',
        date: todayKey(),
        priority: 'high',
        category: 'personal',
        type: 'task',
        done: true,
      })
    })
  })

  it('un ítem con hora se crea desde la Agenda (vista Día) y persiste con horario', async () => {
    const user = userEvent.setup()
    const { repository } = renderApp()
    await screen.findByText('Objetivos de hoy')

    await user.click(screen.getByRole('button', { name: 'Agenda' }))
    expect(await screen.findByText('Agenda del día')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Título'), 'Entrenar')
    fireEvent.change(screen.getByLabelText('Hora (opcional)'), { target: { value: '08:00' } })
    await user.selectOptions(screen.getByLabelText('Duración'), '45 min')
    await user.click(screen.getByRole('button', { name: 'Agregar' }))

    expect(await screen.findByRole('checkbox', { name: 'Entrenar' })).toBeInTheDocument()
    expect(screen.getByText('8:00–8:45')).toBeInTheDocument()

    await waitFor(async () => {
      const stored = await repository.load()
      const item = stored?.plannerItems.find((i) => i.title === 'Entrenar')
      expect(item).toMatchObject({ date: todayKey(), startTime: '08:00', durationMinutes: 45 })
    })
  })

  it('un ítem con Repetir "Semanal" crea 8 instancias', async () => {
    const user = userEvent.setup()
    const { repository } = renderApp()
    await screen.findByText('Objetivos de hoy')

    await user.click(screen.getByRole('button', { name: 'Agenda' }))
    await user.type(screen.getByLabelText('Título'), 'Reunión semanal')
    await user.selectOptions(screen.getByLabelText('Repetir'), 'Semanal (8 semanas)')
    await user.click(screen.getByRole('button', { name: 'Agregar' }))

    await waitFor(async () => {
      const stored = await repository.load()
      const matches = stored?.plannerItems.filter((i) => i.title === 'Reunión semanal') ?? []
      expect(matches).toHaveLength(8)
    })
  })

  it('un ítem vinculado a un hábito en modo Auto lo marca cumplido al completarlo', async () => {
    const user = userEvent.setup()
    const { repository } = renderApp()
    await screen.findByText('Objetivos de hoy')

    await user.click(screen.getByRole('button', { name: 'Ajustes' }))
    await user.type(screen.getByLabelText('Nuevo hábito'), 'Meditar')
    await user.click(screen.getByRole('button', { name: 'Agregar hábito' }))

    await user.click(screen.getByRole('button', { name: 'Agenda' }))
    await user.type(screen.getByLabelText('Título'), 'Sesión de meditación')
    await user.selectOptions(screen.getByLabelText('Vincular a hábito'), 'Meditar')
    await user.click(screen.getByRole('button', { name: 'Agregar' }))

    const checkbox = await screen.findByRole('checkbox', { name: 'Sesión de meditación' })
    await user.click(checkbox)

    await waitFor(async () => {
      const stored = await repository.load()
      const habit = stored?.goals.find((g) => g.name === 'Meditar')
      expect(habit).toBeTruthy()
      expect(stored?.days[todayKey()].goalProgress[habit!.id]).toBe(true)
    })
  })

  it('la vista Mes de la Agenda navega a un día con ítems', async () => {
    const user = userEvent.setup()
    const { container } = renderApp()
    await screen.findByText('Objetivos de hoy')

    await user.click(screen.getByRole('button', { name: 'Agenda' }))
    await user.type(screen.getByLabelText('Título'), 'Ver mes')
    await user.click(screen.getByRole('button', { name: 'Agregar' }))
    await screen.findByRole('checkbox', { name: 'Ver mes' })

    await user.click(screen.getByRole('button', { name: 'Mes' }))
    const todayCell = container.querySelector('.calendar__day--today')
    expect(todayCell).toBeTruthy()
    await user.click(todayCell as HTMLElement)

    expect(await screen.findByText('Agenda del día')).toBeInTheDocument()
    expect(await screen.findByRole('checkbox', { name: 'Ver mes' })).toBeInTheDocument()
  })

  it('una rutina se crea con un paso, se puede marcar y persiste', async () => {
    const user = userEvent.setup()
    const { repository } = renderApp()
    await screen.findByText('Objetivos de hoy')

    await user.click(screen.getByRole('button', { name: 'Objetivos' }))
    await user.click(screen.getByRole('button', { name: 'Rutinas' }))
    await user.type(screen.getByLabelText('Nombre'), 'Ritual matutino')
    await user.click(screen.getByRole('button', { name: 'Crear rutina' }))

    expect(await screen.findByDisplayValue('Ritual matutino')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Nuevo paso'), 'Tomar agua')
    await user.click(screen.getByRole('button', { name: 'Agregar paso' }))

    const checkbox = await screen.findByRole('checkbox', { name: 'Tomar agua' })
    await user.click(checkbox)
    expect(checkbox).toBeChecked()

    await waitFor(async () => {
      const stored = await repository.load()
      expect(stored?.routines).toHaveLength(1)
      expect(stored?.routines[0]).toMatchObject({
        name: 'Ritual matutino',
        steps: [{ text: 'Tomar agua' }],
      })
      const runs = Object.values(stored?.routineRuns ?? {})
      expect(runs).toHaveLength(1)
      expect(runs[0]).toMatchObject({ routineId: stored?.routines[0].id, date: todayKey() })
      expect(runs[0].completedStepIds).toHaveLength(1)
    })
  })

  it('una sesión de enfoque se inicia, se detiene y queda en el historial', async () => {
    const user = userEvent.setup()
    const { repository } = renderApp()
    await screen.findByText('Objetivos de hoy')

    await user.click(screen.getByRole('button', { name: 'Agenda' }))
    await user.click(screen.getByRole('button', { name: 'Enfoque' }))
    await user.click(screen.getByRole('button', { name: 'Iniciar' }))

    expect(await screen.findByRole('button', { name: 'Detener' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Detener' }))

    expect(await screen.findByRole('button', { name: 'Iniciar' })).toBeInTheDocument()
    expect(screen.getByText(/Detenida/)).toBeInTheDocument()

    await waitFor(async () => {
      const sessions = await repository.loadFocusSessions()
      expect(sessions).toHaveLength(1)
      expect(sessions[0]).toMatchObject({ type: 'focus', status: 'stopped', plannedMinutes: 25 })
    })
  })

  it('un snapshot de la Rueda de la vida se crea con los puntajes por categoría y persiste', async () => {
    const user = userEvent.setup()
    const { repository } = renderApp()
    await screen.findByText('Objetivos de hoy')

    await user.click(screen.getByRole('button', { name: 'Objetivos' }))
    await user.click(screen.getByRole('button', { name: 'Rueda de la vida' }))
    fireEvent.change(screen.getByLabelText('Salud'), { target: { value: '8' } })
    await user.type(screen.getByLabelText('Notas (opcional)'), 'Primer registro')
    await user.click(screen.getByRole('button', { name: 'Guardar snapshot' }))

    expect(await screen.findByText(/Promedio/)).toBeInTheDocument()

    await waitFor(async () => {
      const stored = await repository.load()
      expect(stored?.lifeWheelSnapshots).toHaveLength(1)
      const snapshot = stored!.lifeWheelSnapshots[0]
      expect(snapshot.date).toBe(todayKey())
      expect(snapshot.notes).toBe('Primer registro')
      expect(snapshot.areas.find((a) => a.categoryName === 'Salud')).toMatchObject({ score: 8 })
    })

    await user.click(screen.getByRole('button', { name: /Eliminar snapshot del/ }))
    await waitFor(async () => {
      const stored = await repository.load()
      expect(stored?.lifeWheelSnapshots).toHaveLength(0)
    })
  })

  // Momento Mori se sacó de la navegación comercial (Fase 1 del roadmap de producto);
  // `MomentoMoriPage`/`domain/momentoMori.ts` siguen en el repo sin ruta que los monte,
  // ver plan `drifting-hugging-crystal.md`. Cobertura de esa pantalla queda sin test
  // mientras no tenga una entrada en la UI.

  it('el dashboard muestra la prioridad principal del día y los accesos rápidos navegan', async () => {
    const user = userEvent.setup()
    renderApp()
    await screen.findByText('Objetivos de hoy')

    await user.click(screen.getByRole('button', { name: 'Agenda' }))
    await user.click(screen.getByRole('button', { name: 'Planificador' }))
    await user.type(screen.getByLabelText('Título'), 'Revisar propuesta')
    await user.selectOptions(screen.getByLabelText('Prioridad'), 'Alta')
    await user.click(screen.getByRole('button', { name: 'Agregar' }))
    await screen.findByRole('checkbox', { name: 'Revisar propuesta' })

    await user.click(screen.getByRole('button', { name: 'Hoy' }))
    expect(await screen.findByText('Revisar propuesta')).toBeInTheDocument()
    expect(screen.getByText('Alta')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Iniciar rutina' }))
    expect(await screen.findByText('Nueva rutina')).toBeInTheDocument()
  })

  it('cambiar el nombre de la aplicación se refleja en el encabezado', async () => {
    const user = userEvent.setup()
    renderApp()
    await screen.findByText('Objetivos de hoy')

    await user.click(screen.getByRole('button', { name: 'Ajustes' }))
    const nameInput = screen.getByLabelText('Nombre de la aplicación')
    await user.clear(nameInput)
    await user.type(nameInput, 'Disciplina')

    expect(screen.getByRole('heading', { level: 1, name: 'Disciplina' })).toBeInTheDocument()
  })
})
