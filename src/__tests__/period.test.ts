import { describe, expect, it } from 'vitest'
import {
  closePastPeriods,
  ensurePeriod,
  periodKey,
  periodStartFor,
  snapshotPeriodGoals,
  togglePeriodGoal,
} from '../domain/period'
import { createInitialData } from '../domain/defaults'
import type { Goal } from '../domain/types'

const TODAY = '2026-08-18' // martes de la semana que arranca el 17/08

function withGoal(period: 'weekly' | 'monthly'): Goal {
  return {
    id: `g-${period}`,
    name: period === 'weekly' ? 'Revisar la semana' : 'Cerrar el mes',
    categoryId: 'productividad',
    weight: 1,
    active: true,
    period,
    order: 0,
    createdAt: '2026-08-01T10:00:00.000Z',
    kind: 'boolean',
  }
}

describe('periodStartFor / periodKey', () => {
  it('la semana arranca el lunes y el mes el día 1', () => {
    expect(periodStartFor(TODAY, 'weekly')).toBe('2026-08-17')
    expect(periodStartFor(TODAY, 'monthly')).toBe('2026-08-01')
  })

  it('combina tipo y arranque en la clave', () => {
    expect(periodKey('weekly', '2026-08-17')).toBe('weekly:2026-08-17')
  })
})

describe('snapshotPeriodGoals', () => {
  it('sólo toma los objetivos activos de ese período', () => {
    const data = createInitialData('2026-08-01T10:00:00.000Z')
    data.goals = [...data.goals, withGoal('weekly'), { ...withGoal('monthly'), active: false }]

    expect(snapshotPeriodGoals(data.goals, data.categories, 'weekly')).toHaveLength(1)
    expect(snapshotPeriodGoals(data.goals, data.categories, 'monthly')).toHaveLength(0)
  })
})

describe('ensurePeriod', () => {
  it('no crea nada si no hay objetivos de ese tipo', () => {
    const data = createInitialData('2026-08-01T10:00:00.000Z')
    const next = ensurePeriod(data, 'weekly', TODAY)
    expect(next).toBe(data)
    expect(next.periods).toEqual({})
  })

  it('crea el registro de la semana vigente cuando hay un objetivo semanal', () => {
    const data = createInitialData('2026-08-01T10:00:00.000Z')
    data.goals = [...data.goals, withGoal('weekly')]

    const next = ensurePeriod(data, 'weekly', TODAY)
    const record = next.periods['weekly:2026-08-17']

    expect(record).toBeDefined()
    expect(record.goals.map((g) => g.goalId)).toEqual(['g-weekly'])
    expect(record.goalProgress).toEqual({})
    expect(record.closed).toBe(false)
  })

  it('mantiene lo marcado si se vuelve a ensurar la misma semana', () => {
    let data = createInitialData('2026-08-01T10:00:00.000Z')
    data.goals = [...data.goals, withGoal('weekly')]
    data = ensurePeriod(data, 'weekly', TODAY)

    const key = 'weekly:2026-08-17'
    data = {
      ...data,
      periods: { ...data.periods, [key]: togglePeriodGoal(data.periods[key], 'g-weekly') },
    }

    const again = ensurePeriod(data, 'weekly', TODAY)
    expect(again.periods[key].goalProgress).toEqual({ 'g-weekly': true })
  })

  it('un objetivo semanal que se agrega a mitad de semana entra al registro vigente', () => {
    let data = createInitialData('2026-08-01T10:00:00.000Z')
    data = ensurePeriod(data, 'weekly', TODAY)
    expect(data.periods).toEqual({})

    data = { ...data, goals: [...data.goals, withGoal('weekly')] }
    const next = ensurePeriod(data, 'weekly', TODAY)
    expect(next.periods['weekly:2026-08-17'].goals).toHaveLength(1)
  })

  it('al pasar de semana, la vieja queda cerrada y se abre una nueva', () => {
    let data = createInitialData('2026-08-01T10:00:00.000Z')
    data.goals = [...data.goals, withGoal('weekly')]
    data = ensurePeriod(data, 'weekly', TODAY)
    data = closePastPeriods(data, '2026-08-25') // martes de la semana siguiente

    const next = ensurePeriod(data, 'weekly', '2026-08-25')
    expect(next.periods['weekly:2026-08-17'].closed).toBe(true)
    expect(next.periods['weekly:2026-08-24']).toMatchObject({ closed: false, goalProgress: {} })
  })
})

describe('closePastPeriods', () => {
  it('cierra semana y mes que ya no son los vigentes', () => {
    let data = createInitialData('2026-08-01T10:00:00.000Z')
    data.goals = [...data.goals, withGoal('weekly'), withGoal('monthly')]
    data = ensurePeriod(ensurePeriod(data, 'weekly', TODAY), 'monthly', TODAY)

    const closed = closePastPeriods(data, '2026-09-01')
    expect(closed.periods['weekly:2026-08-17'].closed).toBe(true)
    expect(closed.periods['monthly:2026-08-01'].closed).toBe(true)
  })

  it('no toca el período que sigue vigente', () => {
    let data = createInitialData('2026-08-01T10:00:00.000Z')
    data.goals = [...data.goals, withGoal('weekly')]
    data = ensurePeriod(data, 'weekly', TODAY)

    const sameWeek = closePastPeriods(data, '2026-08-19')
    expect(sameWeek).toBe(data)
  })
})

describe('togglePeriodGoal', () => {
  it('marca y desmarca', () => {
    let data = createInitialData('2026-08-01T10:00:00.000Z')
    data.goals = [...data.goals, withGoal('weekly')]
    data = ensurePeriod(data, 'weekly', TODAY)

    let record = data.periods['weekly:2026-08-17']
    record = togglePeriodGoal(record, 'g-weekly')
    expect(record.goalProgress).toEqual({ 'g-weekly': true })

    record = togglePeriodGoal(record, 'g-weekly')
    expect(record.goalProgress).toEqual({ 'g-weekly': false })
  })
})
