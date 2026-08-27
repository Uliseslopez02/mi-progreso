import { describe, expect, it } from 'vitest'
import { computeLifeGoalProgress, nextMilestone, pace } from '../domain/lifeGoalProgress'
import type { DayRecord, LifeGoal } from '../domain/types'

function baseGoal(overrides: Partial<LifeGoal> = {}): LifeGoal {
  return {
    id: 'g1',
    name: 'Meta de prueba',
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

describe('computeLifeGoalProgress', () => {
  it('percentage: devuelve progress tal cual (default sin kind)', () => {
    expect(computeLifeGoalProgress(baseGoal({ progress: 42 }))).toBe(42)
    expect(computeLifeGoalProgress(baseGoal({ kind: 'percentage', progress: 42 }))).toBe(42)
  })

  it('quantity/money/hours/sessions: current/target', () => {
    const goal = baseGoal({ kind: 'money', currentValue: 6500, targetValue: 10000 })
    expect(computeLifeGoalProgress(goal)).toBe(65)
  })

  it('sin target o target 0 da 0, nunca divide por cero', () => {
    expect(computeLifeGoalProgress(baseGoal({ kind: 'quantity', currentValue: 5 }))).toBe(0)
    expect(computeLifeGoalProgress(baseGoal({ kind: 'quantity', currentValue: 5, targetValue: 0 }))).toBe(0)
  })

  it('quantity se clampea a 100 aunque currentValue supere el target', () => {
    expect(computeLifeGoalProgress(baseGoal({ kind: 'hours', currentValue: 150, targetValue: 100 }))).toBe(100)
  })

  it('checklist: proporción de subGoals completados', () => {
    const goal = baseGoal({
      kind: 'checklist',
      subGoals: [
        { id: 's1', text: 'a', done: true },
        { id: 's2', text: 'b', done: true },
        { id: 's3', text: 'c', done: false },
        { id: 's4', text: 'd', done: false },
      ],
    })
    expect(computeLifeGoalProgress(goal)).toBe(50)
  })

  it('checklist sin subGoals da 0', () => {
    expect(computeLifeGoalProgress(baseGoal({ kind: 'checklist' }))).toBe(0)
  })

  it('milestones: proporción de hitos cumplidos', () => {
    const goal = baseGoal({
      kind: 'milestones',
      milestones: [
        { id: 'm1', name: 'Primero', done: true },
        { id: 'm2', name: 'Segundo', done: false },
      ],
    })
    expect(computeLifeGoalProgress(goal)).toBe(50)
  })

  describe('habits: promedio de cumplimiento de los hábitos vinculados', () => {
    const habitSnapshot: DayRecord['goals'][number] = {
      goalId: 'h1',
      name: 'Meditar',
      categoryId: 'c1',
      categoryName: 'Salud',
      weight: 1,
      kind: 'boolean',
      trackingKind: 'habit',
    }
    const days: Record<string, DayRecord> = {
      '2026-08-20': { date: '2026-08-20', goals: [habitSnapshot], goalProgress: { h1: true }, closed: true },
      '2026-08-21': { date: '2026-08-21', goals: [habitSnapshot], goalProgress: { h1: false }, closed: true },
    }

    it('promedia días cumplidos vs. presentes de los hábitos vinculados', () => {
      const goal = baseGoal({ kind: 'habits', linkedHabitIds: ['h1'], createdAt: '2026-08-01T00:00:00.000Z' })
      expect(computeLifeGoalProgress(goal, days, '2026-08-21')).toBe(50)
    })

    it('sin hábitos vinculados da 0', () => {
      const goal = baseGoal({ kind: 'habits', linkedHabitIds: [] })
      expect(computeLifeGoalProgress(goal, days, '2026-08-21')).toBe(0)
    })

    it('un hábito sin historial en el rango da 0, no divide por cero', () => {
      const goal = baseGoal({ kind: 'habits', linkedHabitIds: ['h-nuevo'] })
      expect(computeLifeGoalProgress(goal, days, '2026-08-21')).toBe(0)
    })
  })
})

describe('pace', () => {
  it('null sin fecha objetivo', () => {
    expect(pace(baseGoal({ progress: 10 }), '2026-08-25')).toBeNull()
  })

  it('null si la meta no está activa', () => {
    const goal = baseGoal({ progress: 10, targetDate: '2026-12-01', status: 'completed' })
    expect(pace(goal, '2026-08-25')).toBeNull()
  })

  it('adelantado si el progreso real supera bastante al esperado', () => {
    // Creada el 1/8, vence el 31/8 (30 días). Hoy 8/8 (7 de 30 = ~23% esperado).
    const goal = baseGoal({ progress: 80, targetDate: '2026-08-31' })
    expect(pace(goal, '2026-08-08')).toBe('ahead')
  })

  it('retrasado si el progreso real está bastante por debajo del esperado', () => {
    const goal = baseGoal({ progress: 5, targetDate: '2026-08-31' })
    expect(pace(goal, '2026-08-25')).toBe('behind')
  })

  it('en ritmo si el progreso está cerca del esperado', () => {
    // Mismo rango: 24 de 30 días transcurridos (2026-08-25) = 80% esperado.
    const goal = baseGoal({ progress: 82, targetDate: '2026-08-31' })
    expect(pace(goal, '2026-08-25')).toBe('on-pace')
  })
})

describe('nextMilestone', () => {
  it('null sin hitos pendientes', () => {
    expect(nextMilestone(baseGoal())).toBeNull()
    expect(
      nextMilestone(baseGoal({ milestones: [{ id: 'm1', name: 'a', done: true }] })),
    ).toBeNull()
  })

  it('elige el pendiente con fecha más próxima', () => {
    const goal = baseGoal({
      kind: 'milestones',
      milestones: [
        { id: 'm1', name: 'Lejano', targetDate: '2026-12-01', done: false },
        { id: 'm2', name: 'Cercano', targetDate: '2026-09-01', done: false },
        { id: 'm3', name: 'Hecho', targetDate: '2026-08-01', done: true },
      ],
    })
    expect(nextMilestone(goal)?.id).toBe('m2')
  })

  it('un hito con fecha concreta va antes que uno sin fecha (más accionable)', () => {
    const goal = baseGoal({
      kind: 'milestones',
      milestones: [
        { id: 'm1', name: 'Con fecha', targetDate: '2026-09-01', done: false },
        { id: 'm2', name: 'Sin fecha', done: false },
      ],
    })
    expect(nextMilestone(goal)?.id).toBe('m1')
  })
})
