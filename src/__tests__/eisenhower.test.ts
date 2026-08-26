import { describe, expect, it } from 'vitest'
import { eisenhowerQuadrant, groupByQuadrant, isImportant, isUrgent } from '../domain/eisenhower'
import type { PlannerItem } from '../domain/types'

const today = '2026-08-19'

function item(overrides: Partial<PlannerItem> = {}): PlannerItem {
  return {
    id: 'item-1',
    date: today,
    title: 'Tarea',
    type: 'task',
    category: 'personal',
    priority: 'medium',
    done: false,
    order: 0,
    createdAt: '2026-08-01T10:00:00.000Z',
    ...overrides,
  }
}

describe('isUrgent', () => {
  it('hoy y vencida son urgentes; futura no', () => {
    expect(isUrgent(item({ date: today }), today)).toBe(true)
    expect(isUrgent(item({ date: '2026-08-10' }), today)).toBe(true)
    expect(isUrgent(item({ date: '2026-08-25' }), today)).toBe(false)
  })
})

describe('isImportant', () => {
  it('sólo prioridad alta es importante', () => {
    expect(isImportant(item({ priority: 'high' }))).toBe(true)
    expect(isImportant(item({ priority: 'medium' }))).toBe(false)
    expect(isImportant(item({ priority: 'low' }))).toBe(false)
  })
})

describe('eisenhowerQuadrant', () => {
  it('mapea las 4 combinaciones al cuadrante correcto', () => {
    expect(eisenhowerQuadrant(item({ date: today, priority: 'high' }), today)).toBe('do')
    expect(eisenhowerQuadrant(item({ date: '2026-08-25', priority: 'high' }), today)).toBe('schedule')
    expect(eisenhowerQuadrant(item({ date: today, priority: 'low' }), today)).toBe('delegate')
    expect(eisenhowerQuadrant(item({ date: '2026-08-25', priority: 'low' }), today)).toBe('eliminate')
  })
})

describe('groupByQuadrant', () => {
  it('excluye ítems hechos y ordena cada grupo por fecha ascendente', () => {
    const items: PlannerItem[] = [
      item({ id: 'a', date: '2026-08-27', priority: 'high' }),
      item({ id: 'a2', date: '2026-08-25', priority: 'high' }),
      item({ id: 'b', date: today, priority: 'high' }),
      item({ id: 'c', date: today, priority: 'high', done: true }),
      item({ id: 'd', date: '2026-08-30', priority: 'low' }),
    ]
    const groups = groupByQuadrant(items, today)

    expect(groups.do.map((i) => i.id)).toEqual(['b'])
    expect(groups.schedule.map((i) => i.id)).toEqual(['a2', 'a']) // ordenado por fecha, no por inserción
    expect(groups.eliminate.map((i) => i.id)).toEqual(['d'])
    expect(groups.delegate).toEqual([])
  })

  it('no mezcla ítems entre cuadrantes', () => {
    const items: PlannerItem[] = [
      item({ id: 'urgent-important', date: today, priority: 'high' }),
      item({ id: 'not-urgent-not-important', date: '2026-08-25', priority: 'low' }),
    ]
    const groups = groupByQuadrant(items, today)

    expect(groups.do).toHaveLength(1)
    expect(groups.eliminate).toHaveLength(1)
    expect(groups.schedule).toHaveLength(0)
    expect(groups.delegate).toHaveLength(0)
  })
})
