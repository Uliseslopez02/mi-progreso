import { describe, expect, it } from 'vitest'
import { addDays } from '../domain/date'
import { habitYearMap, habitYearSummary } from '../domain/habitYearMap'
import type { DayRecord, GoalSnapshot } from '../domain/types'

const meditar: GoalSnapshot = {
  goalId: 'meditar',
  name: 'Meditar',
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

// Miércoles, para poder verificar que jueves-domingo de la última semana quedan 'future'.
const today = '2026-08-19'

describe('habitYearMap', () => {
  it('devuelve weeksCount semanas de 7 celdas lunes→domingo', () => {
    const weeks = habitYearMap({}, 'meditar', today, 4)
    expect(weeks).toHaveLength(4)
    for (const week of weeks) {
      expect(week.cells).toHaveLength(7)
      expect(week.cells[0].date).toBe(week.mondayKey)
      expect(week.cells[6].date).toBe(addDays(week.mondayKey, 6))
    }
  })

  it('la última semana es la de hoy: los días futuros quedan marcados', () => {
    const weeks = habitYearMap({}, 'meditar', today, 2)
    const lastWeek = weeks[1]
    expect(lastWeek.mondayKey).toBe('2026-08-17') // lunes de la semana de hoy (miércoles)

    const statusByDate = Object.fromEntries(lastWeek.cells.map((c) => [c.date, c.status]))
    expect(statusByDate['2026-08-17']).toBe('no-record') // lunes, pasado, sin registro
    expect(statusByDate['2026-08-19']).toBe('no-record') // hoy, sin registro todavía
    expect(statusByDate['2026-08-20']).toBe('future') // jueves
    expect(statusByDate['2026-08-23']).toBe('future') // domingo
  })

  it('clasifica cumplido/no cumplido/sin registro según goalCompletionOn', () => {
    const days = {
      '2026-08-17': day('2026-08-17', [meditar], ['meditar']), // cumplido
      '2026-08-18': day('2026-08-18', [meditar], []), // no cumplido
      // 2026-08-19: sin DayRecord en absoluto
    }
    const weeks = habitYearMap(days, 'meditar', today, 1)
    const statusByDate = Object.fromEntries(weeks[0].cells.map((c) => [c.date, c.status]))
    expect(statusByDate['2026-08-17']).toBe('done')
    expect(statusByDate['2026-08-18']).toBe('missed')
    expect(statusByDate['2026-08-19']).toBe('no-record')
  })

  it('un DayRecord sin ese hábito entre sus goals cuenta como sin registro', () => {
    const days = { '2026-08-17': day('2026-08-17', [], []) }
    const weeks = habitYearMap(days, 'meditar', today, 1)
    expect(weeks[0].cells[0].status).toBe('no-record')
  })
})

describe('habitYearSummary', () => {
  it('ignora future/no-record y calcula el % sobre done+missed', () => {
    const days = {
      '2026-08-17': day('2026-08-17', [meditar], ['meditar']),
      '2026-08-18': day('2026-08-18', [meditar], []),
    }
    const weeks = habitYearMap(days, 'meditar', today, 1)
    expect(habitYearSummary(weeks)).toEqual({ daysPresent: 2, daysCompleted: 1, percent: 50 })
  })

  it('sin ningún día presente, percent es 0 sin NaN', () => {
    const weeks = habitYearMap({}, 'meditar', today, 2)
    expect(habitYearSummary(weeks)).toEqual({ daysPresent: 0, daysCompleted: 0, percent: 0 })
  })
})
