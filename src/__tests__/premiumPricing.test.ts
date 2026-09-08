import { describe, expect, it } from 'vitest'
import { yearlySavingsPercent } from '../domain/premiumPricing'

describe('yearlySavingsPercent', () => {
  it('calcula el % de ahorro cuando el anual es más barato que 12 meses', () => {
    expect(yearlySavingsPercent('$1000/mes', '$9000/año')).toBe(25)
  })

  it('devuelve null si el anual no ahorra nada frente a 12 meses mensuales', () => {
    expect(yearlySavingsPercent('$1000/mes', '$12000/año')).toBeNull()
    expect(yearlySavingsPercent('$1000/mes', '$15000/año')).toBeNull()
  })

  it('devuelve null si algún label no tiene un número parseable (placeholder sin configurar)', () => {
    expect(yearlySavingsPercent('—', '$9000/año')).toBeNull()
    expect(yearlySavingsPercent('$1000/mes', '—')).toBeNull()
    expect(yearlySavingsPercent('', '')).toBeNull()
  })
})
