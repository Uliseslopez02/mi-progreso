import { describe, expect, it } from 'vitest'
import { getDayOfWeekEnglish } from '../domain/date'
import { recurrenceDates } from '../domain/recurrence'

describe('recurrenceDates', () => {
  it('"none" devuelve sólo la fecha ancla', () => {
    expect(recurrenceDates('2026-08-25', 'none')).toEqual(['2026-08-25'])
  })

  it('"daily" genera 56 días consecutivos empezando en el ancla', () => {
    const dates = recurrenceDates('2026-08-25', 'daily')
    expect(dates).toHaveLength(56)
    expect(dates[0]).toBe('2026-08-25')
    expect(dates[1]).toBe('2026-08-26')
    expect(dates[55]).toBe('2026-10-19')
  })

  it('"weekdays" excluye sábados y domingos', () => {
    // 2026-08-25 es martes.
    const dates = recurrenceDates('2026-08-25', 'weekdays')
    for (const date of dates) {
      expect(['saturday', 'sunday']).not.toContain(getDayOfWeekEnglish(date))
    }
    // De los 56 días del horizonte, hay 16 fines de semana completos + sobrantes.
    expect(dates.length).toBeLessThan(56)
    expect(dates.length).toBeGreaterThan(30)
  })

  it('"weekly" genera 8 fechas cada 7 días', () => {
    const dates = recurrenceDates('2026-08-25', 'weekly')
    expect(dates).toEqual([
      '2026-08-25',
      '2026-09-01',
      '2026-09-08',
      '2026-09-15',
      '2026-09-22',
      '2026-09-29',
      '2026-10-06',
      '2026-10-13',
    ])
  })
})
