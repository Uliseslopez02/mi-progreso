import { describe, expect, it } from 'vitest'
import { createInitialData } from '../domain/defaults'
import { createId } from '../domain/id'
import { reducer } from '../state/reducer'
import type { AppState } from '../state/reducer'

const TODAY = '2026-08-18'

function hydrated(): AppState {
  const data = createInitialData('2026-08-01T10:00:00.000Z')
  data.goals = [
    ...data.goals,
    {
      id: 'weekly-goal',
      name: 'Planificar la semana',
      categoryId: 'productividad',
      weight: 1,
      active: true,
      period: 'weekly',
      order: 99,
      createdAt: '2026-08-01T10:00:00.000Z',
      kind: 'boolean',
    },
  ]
  return reducer(
    { status: 'loading', data: null, today: TODAY, error: null, plan: 'free' },
    { type: 'hydrate', data, today: TODAY },
  )
}

describe('reducer: objetivos semanales', () => {
  it('al hidratar, crea el registro de la semana vigente', () => {
    const state = hydrated()
    const record = state.data?.periods['weekly:2026-08-17']
    expect(record).toBeDefined()
    expect(record?.goals.map((g) => g.goalId)).toEqual(['weekly-goal'])
  })

  it('togglePeriodGoal marca y desmarca el objetivo de la semana', () => {
    let state = hydrated()
    state = reducer(state, { type: 'togglePeriodGoal', period: 'weekly', goalId: 'weekly-goal' })
    expect(state.data?.periods['weekly:2026-08-17'].goalProgress).toEqual({ 'weekly-goal': true })

    state = reducer(state, { type: 'togglePeriodGoal', period: 'weekly', goalId: 'weekly-goal' })
    expect(state.data?.periods['weekly:2026-08-17'].goalProgress).toEqual({ 'weekly-goal': false })
  })

  it('ignora el toggle si el período todavía no existe', () => {
    const state = reducer(
      { status: 'loading', data: null, today: TODAY, error: null, plan: 'free' },
      { type: 'hydrate', data: createInitialData('2026-08-01T10:00:00.000Z'), today: TODAY },
    )
    const next = reducer(state, {
      type: 'togglePeriodGoal',
      period: 'weekly',
      goalId: 'no-existe',
    })
    expect(next).toBe(state)
  })

  it('un objetivo semanal creado desde Ajustes entra a la semana vigente', () => {
    let state = reducer(
      { status: 'loading', data: null, today: TODAY, error: null, plan: 'free' },
      { type: 'hydrate', data: createInitialData('2026-08-01T10:00:00.000Z'), today: TODAY },
    )
    state = reducer(state, {
      type: 'addGoal',
      goal: {
        id: createId('goal'),
        name: 'Revisar finanzas',
        categoryId: 'finanzas',
        weight: 1,
        active: true,
        period: 'weekly',
        order: 0,
        createdAt: '2026-08-18T10:00:00.000Z',
        kind: 'boolean',
      },
    })
    const record = state.data?.periods['weekly:2026-08-17']
    expect(record?.goals.map((g) => g.name)).toEqual(['Revisar finanzas'])
  })

  it('avanzar de semana cierra la anterior y abre la nueva al cambiar el día', () => {
    let state = hydrated()
    state = reducer(state, { type: 'togglePeriodGoal', period: 'weekly', goalId: 'weekly-goal' })
    state = reducer(state, { type: 'setToday', today: '2026-08-25' })

    expect(state.data?.periods['weekly:2026-08-17'].closed).toBe(true)
    expect(state.data?.periods['weekly:2026-08-17'].goalProgress).toEqual({ 'weekly-goal': true })
    expect(state.data?.periods['weekly:2026-08-24']).toMatchObject({
      closed: false,
      goalProgress: {},
    })
  })
})

describe('reducer: error de carga inicial', () => {
  it('hydrateError pasa a status error sin datos y con el mensaje', () => {
    const state = reducer(
      { status: 'loading', data: null, today: TODAY, error: null, plan: 'free' },
      { type: 'hydrateError', message: 'No pudimos conectarnos.' },
    )
    expect(state).toEqual({
      status: 'error',
      data: null,
      today: TODAY,
      error: 'No pudimos conectarnos.',
      plan: 'free',
    })
  })

  it('hydrateRetry vuelve a loading y limpia el error', () => {
    const errored = reducer(
      { status: 'loading', data: null, today: TODAY, error: null, plan: 'free' },
      { type: 'hydrateError', message: 'falló' },
    )
    const state = reducer(errored, { type: 'hydrateRetry' })
    expect(state).toEqual({ status: 'loading', data: null, today: TODAY, error: null, plan: 'free' })
  })

  it('un hydrate exitoso después de un error limpia el estado de error', () => {
    const errored = reducer(
      { status: 'loading', data: null, today: TODAY, error: null, plan: 'free' },
      { type: 'hydrateError', message: 'falló' },
    )
    const retried = reducer(errored, { type: 'hydrateRetry' })
    const data = createInitialData('2026-08-01T10:00:00.000Z')
    const state = reducer(retried, { type: 'hydrate', data, today: TODAY })
    expect(state.status).toBe('ready')
    expect(state.error).toBeNull()
  })
})

describe('reducer: proyectos', () => {
  const CREATED_AT = '2026-08-18T10:00:00.000Z'

  function withProject(state: AppState, name = 'Mudanza') {
    const order = state.data?.projects.length ?? 0
    return reducer(state, {
      type: 'addProject',
      project: { id: createId('proyecto'), name, status: 'active', order, createdAt: CREATED_AT },
    })
  }

  it('addProject agrega a data.projects', () => {
    const state = withProject(hydrated())
    expect(state.data?.projects.map((p) => p.name)).toEqual(['Mudanza'])
  })

  it('moveProject intercambia el order entre proyectos adyacentes', () => {
    let state = hydrated()
    state = withProject(state, 'Uno')
    state = withProject(state, 'Dos')
    const [uno, dos] = state.data!.projects
    expect(uno.order).toBe(0)
    expect(dos.order).toBe(1)

    state = reducer(state, { type: 'moveProject', id: uno.id, direction: 1 })
    const ordered = [...state.data!.projects].sort((a, b) => a.order - b.order)
    expect(ordered[0].id).toBe(dos.id)
    expect(ordered[1].id).toBe(uno.id)
  })

  it('removeProject elimina el proyecto y sus tareas, sin tocar las de otro proyecto', () => {
    let state = withProject(hydrated())
    const projectId = state.data!.projects[0].id
    state = withProject(state, 'Otro proyecto')
    const otherProjectId = state.data!.projects[1].id

    state = reducer(state, {
      type: 'addProjectTask',
      task: { id: createId('tarea'), projectId, title: 'Empacar', status: 'todo', order: 0, createdAt: CREATED_AT },
    })
    state = reducer(state, {
      type: 'addProjectTask',
      task: {
        id: createId('tarea'),
        projectId: otherProjectId,
        title: 'Ajena',
        status: 'todo',
        order: 0,
        createdAt: CREATED_AT,
      },
    })

    state = reducer(state, { type: 'removeProject', id: projectId })

    expect(state.data?.projects.map((p) => p.id)).toEqual([otherProjectId])
    expect(state.data?.projectTasks.map((t) => t.title)).toEqual(['Ajena'])
  })

  it('addProjectTask/updateProjectTask/removeProjectTask operan sobre data.projectTasks', () => {
    let state = withProject(hydrated())
    const projectId = state.data!.projects[0].id
    const taskId = createId('tarea')

    state = reducer(state, {
      type: 'addProjectTask',
      task: { id: taskId, projectId, title: 'Empacar', status: 'todo', order: 0, createdAt: CREATED_AT },
    })
    expect(state.data?.projectTasks[0]).toMatchObject({ title: 'Empacar', status: 'todo' })

    state = reducer(state, { type: 'updateProjectTask', id: taskId, patch: { title: 'Empacar cajas' } })
    expect(state.data?.projectTasks[0].title).toBe('Empacar cajas')

    state = reducer(state, { type: 'removeProjectTask', id: taskId })
    expect(state.data?.projectTasks).toHaveLength(0)
  })

  it('reorderProjectTasks mueve una tarea de columna sin afectar tareas de otros proyectos ni ids ausentes', () => {
    let state = withProject(hydrated())
    const projectId = state.data!.projects[0].id
    state = withProject(state, 'Otro proyecto')
    const otherProjectId = state.data!.projects[1].id

    const taskA = createId('tarea')
    const taskB = createId('tarea')
    const otherTask = createId('tarea')
    state = reducer(state, {
      type: 'addProjectTask',
      task: { id: taskA, projectId, title: 'A', status: 'todo', order: 0, createdAt: CREATED_AT },
    })
    state = reducer(state, {
      type: 'addProjectTask',
      task: { id: taskB, projectId, title: 'B', status: 'todo', order: 1, createdAt: CREATED_AT },
    })
    state = reducer(state, {
      type: 'addProjectTask',
      task: {
        id: otherTask,
        projectId: otherProjectId,
        title: 'Ajena',
        status: 'todo',
        order: 0,
        createdAt: CREATED_AT,
      },
    })

    state = reducer(state, {
      type: 'reorderProjectTasks',
      updates: [{ id: taskA, status: 'doing', order: 0 }],
    })

    const byId = new Map(state.data!.projectTasks.map((t) => [t.id, t]))
    expect(byId.get(taskA)).toMatchObject({ status: 'doing', order: 0 })
    expect(byId.get(taskB)).toMatchObject({ status: 'todo', order: 1 })
    expect(byId.get(otherTask)).toMatchObject({ status: 'todo', order: 0 })
  })
})

describe('reducer: notas', () => {
  const CREATED_AT = '2026-08-18T10:00:00.000Z'

  function withNote(state: AppState, body = 'Primera nota') {
    return reducer(state, {
      type: 'addNote',
      note: { id: createId('nota'), date: TODAY, title: undefined, body, createdAt: CREATED_AT },
    })
  }

  it('addNote agrega a data.notes', () => {
    const state = withNote(hydrated())
    expect(state.data?.notes.map((n) => n.body)).toEqual(['Primera nota'])
  })

  it('updateNote actualiza título y cuerpo por id', () => {
    let state = withNote(hydrated())
    const id = state.data!.notes[0].id
    state = reducer(state, { type: 'updateNote', id, patch: { title: 'Editado', body: 'Cuerpo nuevo' } })
    expect(state.data?.notes[0]).toMatchObject({ title: 'Editado', body: 'Cuerpo nuevo' })
  })

  it('removeNote elimina la nota por id, sin tocar otras', () => {
    let state = withNote(hydrated())
    state = withNote(state, 'Segunda nota')
    const idToRemove = state.data!.notes[0].id
