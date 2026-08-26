import { describe, expect, it } from 'vitest'
import { monthlyConclusions } from '../domain/monthlyConclusions'
import type { MonthlyReport } from '../domain/monthlyReport'

function baseReport(overrides: Partial<MonthlyReport> = {}): MonthlyReport {
  return {
    monthStart: '2026-08-01',
    daysElapsed: 10,
    stats: { average: 0, best: null, worst: null, daysWithRecord: 0, completedGoals: 0 },
    streak: 0,
    bestStreakInMonth: 0,
    bestCategory: null,
    worstCategory: null,
    perfectDays: 0,
    previousMonthAverage: null,
    deltaVsPreviousMonth: null,
    mostConsistentGoal: null,
    hardestGoal: null,
    bestWeekday: null,
    plannedVsRealized: { planned: 0, done: 0, percent: 0 },
    ...overrides,
  }
}

describe('monthlyConclusions', () => {
  it('sin ningún dato real, no genera ninguna frase', () => {
    expect(monthlyConclusions(baseReport())).toEqual([])
  })

  it('sólo incluye frases respaldadas por datos reales', () => {
    const conclusions = monthlyConclusions(
      baseReport({
        deltaVsPreviousMonth: 12,
        bestCategory: { name: 'Salud', percent: 80 },
        bestStreakInMonth: 14,
      }),
    )
    expect(conclusions).toEqual([
      'Tu rendimiento mejoró un 12% respecto al mes anterior.',
      'Tu categoría más fuerte fue Salud.',
      'Tuviste una racha máxima de 14 días.',
    ])
  })

  it('un delta negativo dice "bajó"', () => {
    const conclusions = monthlyConclusions(baseReport({ deltaVsPreviousMonth: -8 }))
    expect(conclusions).toEqual(['Tu rendimiento bajó un 8% respecto al mes anterior.'])
  })

  it('un delta de 0 tiene su propia frase, sin signo', () => {
    const conclusions = monthlyConclusions(baseReport({ deltaVsPreviousMonth: 0 }))
    expect(conclusions).toEqual(['Tu rendimiento se mantuvo igual respecto al mes anterior.'])
  })

  it('incluye el objetivo más difícil, el mejor día de la semana y días perfectos', () => {
    const conclusions = monthlyConclusions(
      baseReport({
        hardestGoal: { name: 'Meditar', percent: 20 },
        bestWeekday: { day: 'Lunes', average: 90 },
        perfectDays: 1,
      }),
    )
    expect(conclusions).toEqual([
      'El objetivo que más te costó mantener fue Meditar.',
      'Tu rendimiento fue más alto los Lunes.',
      'Tuviste 1 día perfecto este mes.',
    ])
  })
})
