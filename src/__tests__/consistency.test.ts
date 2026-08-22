import { describe, expect, it } from 'vitest'
import { categoryConsistency, goalConsistency, habitStreakBreakdown } from '../domain/consistency'
import type { DayRecord, Goal, GoalSnapshot } from '../domain/types'

const leer: GoalSnapshot = {
  goalId: 'leer',
  name: 'Leer',
  categoryId: 'dev',
  categoryName: 'Desarrollo personal',
  weight: 1,
  kind: 'boolean',
}
const agua: GoalSnapshot = {
  goalId: 'agua',
  name: 'Tomar agua',
  categoryId: 'salud',
  categoryName: 'Salud',
  weight: 1,
  kind: 'boolean',
}
const gym: GoalSnapshot = {
  goalId: 'gym',
  name: 'Entrenar',
  categoryId: 'salud',
  categoryName: 'Salud',
  weight: 1,
  kind: 'boolean',
}

function day(date: string, goals: GoalSnapshot[], completed: string[]): DayRecord {
  return {
    date,
    goals,
    goalProgress: Object.fromEntries(completed.map((id) => [id, true])),
    closed: true,
  }
}

const days: Record<string, DayRecord> = {
  '2026-08-16': day('2026-08-16', [leer, agua, gym], ['agua']),
  '2026-08-17': day('2026-08-17', [leer, agua, gym], ['agua', 'leer']),
  '2026-08-18': day('2026-08-18', [leer, agua, gym], ['agua', 'leer']),
}

const keys = ['2026-08-16', '2026-08-17', '2026-08-18']

describe('goalConsistency', () => {
  it('calcula el cumplimiento de cada objetivo y ordena de mejor a peor', () => {
    const result = goalConsistency(days, keys)

    expect(result.map((r) => [r.name, r.percent])).toEqual([
      ['Tomar agua', 100],
      ['Leer', 67],
      ['Entrenar', 0],
    ])
    expect(result[1]).toMatchObject({ daysCompleted: 2, daysPresent: 3 })
  })

  it('sólo cuenta los días en los que el objetivo existía', () => {
    const conNuevo = {
      ...days,
      '2026-08-18': day('2026-08-18', [leer, agua, gym, { ...leer, goalId: 'meditar', name: 'Meditar' }], [
        'agua',
        'leer',
        'meditar',
      ]),
    }

    const meditar = goalConsistency(conNuevo, keys).find((r) => r.id === 'meditar')
    // Existe hace un día y lo cumplió: 100%, no 33%.
    expect(meditar).toMatchObject({ daysPresent: 1, daysCompleted: 1, percent: 100 })
  })

  it('usa el nombre más reciente cuando el objetivo fue renombrado', () => {
    const renombrado = {
      ...days,
      '2026-08-18': day('2026-08-18', [{ ...leer, name: 'Leer 20 páginas' }], ['leer']),
    }
    expect(goalConsistency(renombrado, keys).find((r) => r.id === 'leer')?.name).toBe(
      'Leer 20 páginas',
    )
  })

  it('ignora los días sin registro', () => {
    expect(goalConsistency(days, ['2026-08-01', '2026-08-02'])).toEqual([])
    expect(goalConsistency({}, keys)).toEqual([])
  })
})

describe('categoryConsistency', () => {
  it('agrupa los objetivos por categoría', () => {
    const result = categoryConsistency(days, keys)

    expect(result.map((r) => [r.name, r.percent])).toEqual([
      ['Desarrollo personal', 67],
      ['Salud', 50], // agua 3/3 + gym 0/3 = 3 de 6
    ])
    expect(result.find((r) => r.id === 'salud')).toMatchObject({
      daysPresent: 6,
      daysCompleted: 3,
    })
  })
})

describe('habitStreakBreakdown', () => {
  const meditarSnap: GoalSnapshot = {
    goalId: 'meditar',
    name: 'Meditar',
    categoryId: 'salud',
    categoryName: 'Salud',
    weight: 1,
    kind: 'boolean',
    trackingKind: 'habit',
  }
  const elongarSnap: GoalSnapshot = {
    goalId: 'elongar',
    name: 'Elongar',
    categoryId: 'salud',
    categoryName: 'Salud',
    weight: 1,
    kind: 'boolean',
    trackingKind: 'habit',
  }
  const nuncaSnap: GoalSnapshot = {
    goalId: 'nunca',
    name: 'Nunca',
    categoryId: 'salud',
    categoryName: 'Salud',
    weight: 1,
    kind: 'boolean',
    trackingKind: 'habit',
  }

  const habitDays: Record<string, DayRecord> = {
    '2026-08-14': day('2026-08-14', [elongarSnap, nuncaSnap], ['elongar']),
    '2026-08-15': day('2026-08-15', [elongarSnap, nuncaSnap], ['elongar']),
    '2026-08-16': day('2026-08-16', [elongarSnap, meditarSnap, nuncaSnap], []),
    '2026-08-17': day('2026-08-17', [elongarSnap, meditarSnap, nuncaSnap], ['meditar']),
    '2026-08-18': day('2026-08-18', [elongarSnap, meditarSnap, nuncaSnap], ['meditar']),
  }

  const habit = (id: string, name: string): Goal => ({
    id,
    name,
    categoryId: 'salud',
    weight: 1,
    active: true,
    period: 'daily',
    order: 0,
    createdAt: '2026-08-01T00:00:00.000Z',
    kind: 'boolean',
    trackingKind: 'habit',
  })
  const habits = [habit('meditar', 'Meditar'), habit('elongar', 'Elongar'), habit('nunca', 'Nunca')]

  it('separa racha activa de racha perdida, y omite los que nunca arrancaron', () => {
    const result = habitStreakBreakdown(habits, habitDays, '2026-08-18')

    expect(result.active).toEqual([{ id: 'meditar', name: 'Meditar', current: 2, best: 2 }])
    expect(result.broken).toEqual([{ id: 'elongar', name: 'Elongar', current: 0, best: 2 }])
  })
})
