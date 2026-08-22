import { describe, expect, it } from 'vitest'
import {
  addDays,
  addMonths,
  diffDays,
  formatLongDate,
  formatMonthYear,
  formatShortDate,
  fromDateKey,
  monthDays,
  startOfMonth,
  startOfWeek,
  toDateKey,
  weekDays,
} from '../domain/date'

describe('claves de fecha', () => {
  it('usa la fecha local, no UTC', () => {
    // 23:30 local del 18: la clave sigue siendo el 18 aunque en UTC ya sea el 19.
    expect(toDateKey(new Date(2026, 7, 18, 23, 30))).toBe('2026-08-18')
    expect(toDateKey(new Date(2026, 0, 1))).toBe('2026-01-01')
  })

  it('va y vuelve sin perder el día', () => {
    expect(toDateKey(fromDateKey('2026-03-09'))).toBe('2026-03-09')
  })

  it('suma y resta días cruzando meses', () => {
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(diffDays('2026-08-15', '2026-08-18')).toBe(3)
    expect(diffDays('2026-08-18', '2026-08-15')).toBe(-3)
  })
})

describe('semanas', () => {
  it('la semana arranca el lunes', () => {
    expect(startOfWeek('2026-08-18')).toBe('2026-08-17') // martes -> lunes
    expect(startOfWeek('2026-08-17')).toBe('2026-08-17') // lunes -> lunes
    expect(startOfWeek('2026-08-23')).toBe('2026-08-17') // domingo -> lunes previo
  })

  it('devuelve los siete días de la semana', () => {
    expect(weekDays('2026-08-17')).toEqual([
      '2026-08-17',
      '2026-08-18',
      '2026-08-19',
      '2026-08-20',
      '2026-08-21',
      '2026-08-22',
      '2026-08-23',
    ])
  })
})

describe('meses', () => {
  it('encuentra el primer día del mes y navega entre meses', () => {
    expect(startOfMonth('2026-08-18')).toBe('2026-08-01')
    expect(addMonths('2026-08-01', 1)).toBe('2026-09-01')
    expect(addMonths('2026-01-01', -1)).toBe('2025-12-01')
  })

  it('arma el mes completo, incluidos los años bisiestos', () => {
    expect(monthDays('2026-02-10')).toHaveLength(28)
    expect(monthDays('2024-02-10')).toHaveLength(29)
    expect(monthDays('2026-08-01')).toHaveLength(31)
  })
})

describe('formatos en español', () => {
  it('formatea la fecha larga como en la pantalla principal', () => {
    expect(formatLongDate('2026-08-18')).toBe('Martes 18 de agosto')
    expect(formatLongDate('2026-01-01')).toBe('Jueves 1 de enero')
  })

  it('formatea fechas cortas y encabezados de mes', () => {
    expect(formatShortDate('2026-08-05')).toBe('05/08')
    expect(formatMonthYear('2026-08-18')).toBe('Agosto 2026')
  })
})
