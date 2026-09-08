import { describe, expect, it } from 'vitest'
import { monthlyEquivalentLabel, yearlySavingsPercent } from '../domain/premiumPricing'

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

describe('monthlyEquivalentLabel', () => {
  it('divide el precio anual por 12 y lo formatea con separador de miles', () => {
    expect(monthlyEquivalentLabel('$32.000/año')).toBe('$2.667/mes')
  })

  it('devuelve null si el label no tiene un número parseable', () => {
    expect(monthlyEquivalentLabel('—')).toBeNull()
    expect(monthlyEquivalentLabel('')).toBeNull()
  })
})
