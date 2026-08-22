import { describe, expect, it } from 'vitest'
import { lifeGoalHealth } from '../domain/lifeGoalHealth'
import type { LifeGoal } from '../domain/types'

const today = '2026-08-21'

function goal(overrides: Partial<LifeGoal> & Pick<LifeGoal, 'id' | 'name'>): LifeGoal {
  return {
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

describe('lifeGoalHealth', () => {
  it('marca vencida una meta activa con fecha objetivo pasada y sin completar', () => {
    const vencida = goal({ id: 'v1', name: 'Vencida', targetDate: '2026-08-10', progress: 50 })
    const result = lifeGoalHealth([vencida], today)

    expect(result.overdue).toEqual([vencida])
    expect(result.stalled).toEqual([])
  })

  it('no marca vencida una meta ya completada al 100%, aunque la fecha haya pasado', () => {
    const completa = goal({ id: 'c1', name: 'Completa', targetDate: '2026-08-10', progress: 100 })
    const result = lifeGoalHealth([completa], today)

    expect(result.overdue).toEqual([])
  })

  it('marca estancada una meta activa en 0% creada hace 14 días o más', () => {
    const estancada = goal({ id: 'e1', name: 'Estancada', createdAt: '2026-08-01T00:00:00.000Z' })
    const result = lifeGoalHealth([estancada], today)

    expect(result.stalled).toEqual([estancada])
  })

  it('no marca estancada una meta reciente ni una con algo de progreso', () => {
    const reciente = goal({ id: 'r1', name: 'Reciente', createdAt: '2026-08-15T00:00:00.000Z' })
    const enMarcha = goal({ id: 'm1', name: 'En marcha', progress: 40, createdAt: '2026-07-01T00:00:00.000Z' })
    const result = lifeGoalHealth([reciente, enMarcha], today)

    expect(result.stalled).toEqual([])
    expect(result.overdue).toEqual([])
  })

  it('agrupa las abandonadas sin importar progreso o fecha', () => {
    const abandonada = goal({ id: 'a1', name: 'Abandonada', status: 'abandoned', targetDate: '2026-01-01' })
    const result = lifeGoalHealth([abandonada], today)

    expect(result.abandoned).toEqual([abandonada])
    expect(result.overdue).toEqual([])
    expect(result.stalled).toEqual([])
  })

  it('ordena vencidas por más vencidas primero y estancadas por más antiguas primero', () => {
    const pocoVencida = goal({ id: 'p', name: 'Poco vencida', targetDate: '2026-08-18' })
    const muyVencida = goal({ id: 'm', name: 'Muy vencida', targetDate: '2026-08-05' })
    const estancadaVieja = goal({ id: 'ev', name: 'Vieja', createdAt: '2026-07-01T00:00:00.000Z' })
    const estancadaNueva = goal({ id: 'en', name: 'Nueva', createdAt: '2026-08-05T00:00:00.000Z' })

    const result = lifeGoalHealth([pocoVencida, muyVencida, estancadaVieja, estancadaNueva], today)

    expect(result.overdue.map((g) => g.id)).toEqual(['m', 'p'])
    expect(result.stalled.map((g) => g.id)).toEqual(['ev', 'en'])
  })
})
