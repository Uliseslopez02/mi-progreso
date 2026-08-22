import { describe, expect, it } from 'vitest'
import { closePastDays, ensureDay, snapshotGoals, toggleGoal } from '../domain/day'
import { createInitialData } from '../domain/defaults'
import { computeDayStats } from '../domain/scoring'

const TODAY = '2026-08-18'

function baseData() {
  return createInitialData('2026-08-01T10:00:00.000Z')
}

describe('snapshotGoals', () => {
  it('sólo toma los objetivos diarios activos, en orden', () => {
    const data = baseData()
    data.goals[0].active = false
    data.goals[1].period = 'weekly'

    const snapshot = snapshotGoals(data.goals, data.categories)
    expect(snapshot).toHaveLength(data.goals.length - 2)
    expect(snapshot.map((g) => g.goalId)).not.toContain(data.goals[0].id)
    expect(snapshot[0].categoryName).toBe('Salud')
  })

  it('normaliza pesos inválidos a 1', () => {
    const data = baseData()
    data.goals[0].weight = 0
    expect(snapshotGoals(data.goals, data.categories)[0].weight).toBe(1)
  })
})

describe('ensureDay', () => {
  it('crea el día de hoy con los 11 objetivos por defecto', () => {
    const data = ensureDay(baseData(), TODAY, TODAY)
    expect(data.days[TODAY].goals).toHaveLength(11)
    expect(data.days[TODAY].goalProgress).toEqual({})
    expect(data.days[TODAY].closed).toBe(false)
  })

  it('mantiene lo ya marcado si vuelvo a entrar el mismo día', () => {
    let data = ensureDay(baseData(), TODAY, TODAY)
    data = {
      ...data,
      days: { ...data.days, [TODAY]: toggleGoal(data.days[TODAY], 'dev-leer') },
    }
    const again = ensureDay(data, TODAY, TODAY)
    expect(again.days[TODAY].goalProgress).toEqual({ 'dev-leer': true })
  })

  it('agrega a hoy un objetivo creado durante el día', () => {
    let data = ensureDay(baseData(), TODAY, TODAY)
    data = {
      ...data,
      goals: [
        ...data.goals,
        {
          id: 'nuevo',
          name: 'Meditar',
          categoryId: 'salud',
          weight: 1,
          active: true,
          period: 'daily' as const,
          order: 99,
          createdAt: '2026-08-18T09:00:00.000Z',
          kind: 'boolean' as const,
        },
      ],
    }
    const updated = ensureDay(data, TODAY, TODAY)
    expect(updated.days[TODAY].goals.map((g) => g.goalId)).toContain('nuevo')
  })

  it('quita de hoy lo marcado si el objetivo deja de existir', () => {
    let data = ensureDay(baseData(), TODAY, TODAY)
    data = {
      ...data,
      days: { ...data.days, [TODAY]: toggleGoal(data.days[TODAY], 'dev-leer') },
      goals: data.goals.filter((g) => g.id !== 'dev-leer'),
    }
    const updated = ensureDay(data, TODAY, TODAY)
    expect(updated.days[TODAY].goalProgress).toEqual({})
    expect(updated.days[TODAY].goals).toHaveLength(10)
  })

  it('no toca el historial: un día pasado conserva su snapshot original', () => {
    let data = ensureDay(baseData(), '2026-08-17', '2026-08-17')
    data = closePastDays(data, TODAY)
    data = { ...data, goals: [] } // borré todos mis objetivos hoy
    const updated = ensureDay(data, '2026-08-17', TODAY)
    expect(updated.days['2026-08-17'].goals).toHaveLength(11)
  })
})

describe('toggleGoal', () => {
  it('marca y desmarca, y el porcentaje sale de ahí', () => {
    const data = ensureDay(baseData(), TODAY, TODAY)
    let record = data.days[TODAY]
    expect(computeDayStats(record).percent).toBe(0)

    // Los pesos por defecto suman 100, así que el % es directamente la suma de puntos.
    record = toggleGoal(record, 'salud-hielo-manana') // peso 4
    record = toggleGoal(record, 'dev-leer') // peso 8
    expect(computeDayStats(record).percent).toBe(12) // 4 + 8

    record = toggleGoal(record, 'dev-leer')
    expect(record.goalProgress).toEqual({ 'salud-hielo-manana': true, 'dev-leer': false })
    expect(computeDayStats(record).percent).toBe(4)
  })
})

describe('closePastDays', () => {
  it('cierra todo lo que no sea hoy', () => {
    let data = ensureDay(baseData(), '2026-08-17', '2026-08-17')
    data = ensureDay(data, TODAY, TODAY)
    const closed = closePastDays(data, TODAY)
    expect(closed.days['2026-08-17'].closed).toBe(true)
    expect(closed.days[TODAY].closed).toBe(false)
  })
})
