import { describe, expect, it } from 'vitest'
import { monthlyReport } from '../domain/monthlyReport'
import type { DayRecord, GoalSnapshot, PlannerItem } from '../domain/types'

const today = '2026-08-10' // lunes

const leer: GoalSnapshot = {
  goalId: 'leer',
  name: 'Leer',
  categoryId: 'salud',
  categoryName: 'Salud',
  weight: 1,
  kind: 'boolean',
  trackingKind: 'goal',
}
const meditar: GoalSnapshot = {
  goalId: 'meditar',
  name: 'Meditar',
  categoryId: 'salud',
  categoryName: 'Salud',
  weight: 1,
  kind: 'boolean',
  trackingKind: 'goal',
}

function day(date: string, completed: string[]): DayRecord {
  return {
    date,
    goals: [leer, meditar],
    goalProgress: Object.fromEntries(completed.map((id) => [id, true])),
    closed: true,
  }
}

function plannerItem(overrides: Partial<PlannerItem> & Pick<PlannerItem, 'id' | 'date' | 'done'>): PlannerItem {
  return {
    title: 'Tarea',
    type: 'task',
    category: 'personal',
    priority: 'medium',
    order: 0,
    createdAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('monthlyReport', () => {
  const days: Record<string, DayRecord> = {
    '2026-08-01': day('2026-08-01', []), // sábado, 0%
    '2026-08-03': day('2026-08-03', ['leer', 'meditar']), // lunes, 100%
    '2026-08-04': day('2026-08-04', ['leer']), // martes, 50%
    '2026-08-10': day('2026-08-10', ['leer', 'meditar']), // lunes (hoy), 100%
    '2026-07-15': day('2026-07-15', ['leer']), // mes anterior, 50%
  }
  const plannerItems: PlannerItem[] = [
    plannerItem({ id: 'p1', date: '2026-08-03', done: true }),
    plannerItem({ id: 'p2', date: '2026-08-10', done: false }),
    plannerItem({ id: 'p3', date: '2026-09-01', done: true }), // fuera del mes, se ignora
  ]

  const report = monthlyReport(days, plannerItems, today, 70)

  it('calcula el promedio/mejor/peor día sólo sobre los días transcurridos', () => {
    expect(report.daysElapsed).toBe(10)
    expect(report.stats.daysWithRecord).toBe(4)
    expect(report.stats.average).toBe(63)
    expect(report.stats.best).toMatchObject({ date: '2026-08-03', percent: 100 })
    expect(report.stats.worst).toMatchObject({ date: '2026-08-01', percent: 0 })
  })

  it('cuenta los días perfectos del mes', () => {
    expect(report.perfectDays).toBe(2)
  })

  it('compara contra el promedio del mes anterior', () => {
    expect(report.previousMonthAverage).toBe(50)
    expect(report.deltaVsPreviousMonth).toBe(13)
  })

  it('sin ningún día en el mes anterior, la comparación es null', () => {
    const noPrevMonth = monthlyReport({ '2026-08-03': day('2026-08-03', ['leer']) }, [], today, 70)
    expect(noPrevMonth.previousMonthAverage).toBeNull()
    expect(noPrevMonth.deltaVsPreviousMonth).toBeNull()
  })

  it('identifica el objetivo más consistente y el más difícil', () => {
    expect(report.mostConsistentGoal).toEqual({ name: 'Leer', percent: 75 })
    expect(report.hardestGoal).toEqual({ name: 'Meditar', percent: 50 })
  })

  it('elige el día de la semana con mejor promedio', () => {
    expect(report.bestWeekday).toEqual({ day: 'Lunes', average: 100 })
  })

  it('cuenta planificado vs. realizado sólo de los ítems del mes', () => {
    expect(report.plannedVsRealized).toEqual({ planned: 2, done: 1, percent: 50 })
  })

  it('categoría única: hay más fuerte pero no "a reforzar"', () => {
    expect(report.bestCategory).toEqual({ name: 'Salud', percent: 63 })
    expect(report.worstCategory).toBeNull()
  })
})
