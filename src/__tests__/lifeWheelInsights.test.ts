import { describe, expect, it } from 'vitest'
import { areaDetail } from '../domain/lifeWheelInsights'
import type { DayRecord, Goal, GoalSnapshot, LifeGoal } from '../domain/types'

const today = '2026-08-25'

function habit(overrides: Partial<Goal> & Pick<Goal, 'id' | 'name' | 'categoryId'>): Goal {
  return {
    weight: 1,
    active: true,
    period: 'daily',
    order: 0,
    createdAt: '2026-08-01T00:00:00.000Z',
    kind: 'boolean',
    trackingKind: 'habit',
    ...overrides,
  }
}

function lifeGoal(overrides: Partial<LifeGoal> & Pick<LifeGoal, 'id' | 'categoryId'>): LifeGoal {
  return {
    name: 'Meta',
    scope: 'personal',
    priority: 'medium',
    progress: 0,
    status: 'active',
    subGoals: [],
    linkedHabitIds: [],
    order: 0,
    createdAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('areaDetail', () => {
  it('sin hábitos ni metas: sugerencia genérica según el puntaje', () => {
    const low = areaDetail('salud', 4, [], [], {}, today)
    expect(low.habits).toEqual([])
    expect(low.goalsProgress).toBeNull()
    expect(low.suggestion).toMatch(/podría ayudar/)

    const high = areaDetail('salud', 8, [], [], {}, today)
    expect(high.suggestion).toMatch(/todavía/)
  })

  it('marca doneToday según el registro real del día', () => {
    const snapshot: GoalSnapshot = {
      goalId: 'h1',
      name: 'Actividad física',
      categoryId: 'salud',
      categoryName: 'Salud',
      weight: 1,
      kind: 'boolean',
      trackingKind: 'habit',
    }
    const days: Record<string, DayRecord> = {
      [today]: { date: today, goals: [snapshot], goalProgress: { h1: true }, closed: false },
    }
    const goals = [habit({ id: 'h1', name: 'Actividad física', categoryId: 'salud' })]

    const detail = areaDetail('salud', 8, goals, [], days, today)
    expect(detail.habits).toEqual([{ id: 'h1', name: 'Actividad física', doneToday: true }])
    expect(detail.suggestion).toMatch(/al día/)
  })

  it('puntaje bajo con hábitos pendientes menciona cuáles', () => {
    const snapshot: GoalSnapshot = {
      goalId: 'h2',
      name: 'Dormir bien',
      categoryId: 'salud',
      categoryName: 'Salud',
      weight: 1,
      kind: 'boolean',
      trackingKind: 'habit',
    }
    const days: Record<string, DayRecord> = {
      [today]: { date: today, goals: [snapshot], goalProgress: {}, closed: false },
    }
    const goals = [habit({ id: 'h2', name: 'Dormir bien', categoryId: 'salud' })]

    const detail = areaDetail('salud', 5, goals, [], days, today)
    expect(detail.habits).toEqual([{ id: 'h2', name: 'Dormir bien', doneToday: false }])
    expect(detail.suggestion).toContain('Dormir bien')
  })

  it('ignora hábitos inactivos o de otra categoría', () => {
    const goals = [
      habit({ id: 'h1', name: 'De otra área', categoryId: 'trabajo' }),
      habit({ id: 'h2', name: 'Inactivo', categoryId: 'salud', active: false }),
    ]
    expect(areaDetail('salud', 5, goals, [], {}, today).habits).toEqual([])
  })

  it('promedia el progreso de las metas activas de la categoría, ignora otras/abandonadas', () => {
    const lifeGoals = [
      lifeGoal({ id: 'g1', categoryId: 'salud', progress: 40, status: 'active' }),
      lifeGoal({ id: 'g2', categoryId: 'salud', progress: 80, status: 'active' }),
      lifeGoal({ id: 'g3', categoryId: 'salud', progress: 100, status: 'abandoned' }),
      lifeGoal({ id: 'g4', categoryId: 'trabajo', progress: 10, status: 'active' }),
    ]
    expect(areaDetail('salud', 5, [], lifeGoals, {}, today).goalsProgress).toBe(60)
  })
})
