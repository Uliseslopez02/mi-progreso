import { describe, expect, it } from 'vitest'
import { formatTime, formatTimeRange, minutesToTime, snapMinutes, timeToMinutes } from '../domain/time'

describe('timeToMinutes / minutesToTime', () => {
  it('convierte en ambas direcciones', () => {
    expect(timeToMinutes('00:00')).toBe(0)
    expect(timeToMinutes('08:30')).toBe(510)
    expect(timeToMinutes('23:59')).toBe(1439)

    expect(minutesToTime(0)).toBe('00:00')
    expect(minutesToTime(510)).toBe('08:30')
    expect(minutesToTime(1439)).toBe('23:59')
  })

  it('minutesToTime no se va de rango con valores fuera de [0, 24h)', () => {
    expect(minutesToTime(-10)).toBe('00:00')
    expect(minutesToTime(24 * 60 + 30)).toBe('23:59')
  })
})

describe('snapMinutes', () => {
  it('redondea al múltiplo de 15 más cercano por defecto', () => {
    expect(snapMinutes(7)).toBe(0)
    expect(snapMinutes(8)).toBe(15)
    expect(snapMinutes(22)).toBe(15)
    expect(snapMinutes(23)).toBe(30)
  })

  it('acepta un step distinto', () => {
    expect(snapMinutes(12, 30)).toBe(0)
    expect(snapMinutes(20, 30)).toBe(30)
  })
})

describe('formatTime / formatTimeRange', () => {
  it('saca el cero a la izquierda de la hora', () => {
    expect(formatTime('08:00')).toBe('8:00')
    expect(formatTime('23:05')).toBe('23:05')
  })

  it('arma el rango sumando la duración', () => {
    expect(formatTimeRange('08:00', 30)).toBe('8:00–8:30')
    expect(formatTimeRange('23:45', 30)).toBe('23:45–0:15')
  })
})
