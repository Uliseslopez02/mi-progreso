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
    { status: 'loading', data: null, today: TODAY },
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
      { status: 'loading', data: null, today: TODAY },
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
      { status: 'loading', data: null, today: TODAY },
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
