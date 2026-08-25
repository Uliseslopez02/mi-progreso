import { describe, expect, it } from 'vitest'
import { bandDescription, mostImprovedArea } from '../domain/lifeWheel'
import type { LifeWheelAreaDelta } from '../domain/lifeWheel'

describe('mostImprovedArea', () => {
  it('null si nadie mejoró', () => {
    const deltas: LifeWheelAreaDelta[] = [
      { categoryId: 'a', categoryName: 'Salud', current: 5, previous: 6, delta: -1 },
      { categoryId: 'b', categoryName: 'Trabajo', current: 5, previous: 5, delta: 0 },
    ]
    expect(mostImprovedArea(deltas)).toBeNull()
  })

  it('elige el mayor delta positivo', () => {
    const deltas: LifeWheelAreaDelta[] = [
      { categoryId: 'a', categoryName: 'Salud', current: 6, previous: 5, delta: 1 },
      { categoryId: 'b', categoryName: 'Trabajo', current: 8, previous: 5, delta: 3 },
      { categoryId: 'c', categoryName: 'Ocio', current: 4, previous: 6, delta: -2 },
    ]
    expect(mostImprovedArea(deltas)?.categoryId).toBe('b')
  })
})

describe('bandDescription', () => {
  it('cubre cada franja', () => {
    expect(bandDescription(1)).toBe('Necesita atención')
    expect(bandDescription(3)).toBe('Necesita atención')
    expect(bandDescription(4)).toBe('Hay margen de mejora')
    expect(bandDescription(6)).toBe('Hay margen de mejora')
    expect(bandDescription(7)).toBe('Vas por buen camino')
    expect(bandDescription(8)).toBe('Vas por buen camino')
    expect(bandDescription(9)).toBe('Área muy fortalecida')
    expect(bandDescription(10)).toBe('Área muy fortalecida')
  })
})
