/**
 * Cómputo sobre snapshots de la Rueda de la vida. Igual criterio que
 * `lifeGoalHealth.ts`: sólo reglas simples sobre puntajes reales, nada de
 * texto generado ni inferencias que no salgan directo del dato.
 */
import type { LifeWheelAreaScore, LifeWheelSnapshot } from './types'

export function averageScore(snapshot: LifeWheelSnapshot): number {
  if (snapshot.areas.length === 0) return 0
  const sum = snapshot.areas.reduce((acc, a) => acc + a.score, 0)
  return Math.round((sum / snapshot.areas.length) * 10) / 10
}

export function weakestArea(snapshot: LifeWheelSnapshot): LifeWheelAreaScore | null {
  if (snapshot.areas.length === 0) return null
  return [...snapshot.areas].sort((a, b) => a.score - b.score)[0]
}

export function strongestArea(snapshot: LifeWheelSnapshot): LifeWheelAreaScore | null {
  if (snapshot.areas.length === 0) return null
  return [...snapshot.areas].sort((a, b) => b.score - a.score)[0]
}

export interface LifeWheelAreaDelta {
  categoryId: string
  categoryName: string
  current: number
  previous: number
  delta: number
}

/**
 * Compara área por área contra el snapshot anterior, matcheando por
 * `categoryId`. Una categoría nueva (sin equivalente en el snapshot previo)
 * simplemente no aparece en el resultado — no hay "antes" con qué comparar.
 */
export function compareSnapshots(
  current: LifeWheelSnapshot,
  previous: LifeWheelSnapshot,
): LifeWheelAreaDelta[] {
  const prevByCategory = new Map(previous.areas.map((a) => [a.categoryId, a]))
  const deltas: LifeWheelAreaDelta[] = []
  for (const area of current.areas) {
    const prev = prevByCategory.get(area.categoryId)
    if (!prev) continue
    deltas.push({
      categoryId: area.categoryId,
      categoryName: area.categoryName,
      current: area.score,
      previous: prev.score,
      delta: area.score - prev.score,
    })
  }
  return deltas
}

/** El área con el mayor avance positivo contra el snapshot anterior, o `null` si ninguna mejoró. */
export function mostImprovedArea(deltas: LifeWheelAreaDelta[]): LifeWheelAreaDelta | null {
  const improved = deltas.filter((d) => d.delta > 0)
  if (improved.length === 0) return null
  return [...improved].sort((a, b) => b.delta - a.delta)[0]
}

/** Texto del significado de cada franja de puntaje (1-10), tal cual el criterio del producto. */
export function bandDescription(score: number): string {
  if (score >= 9) return 'Área muy fortalecida'
  if (score >= 7) return 'Vas por buen camino'
  if (score >= 4) return 'Hay margen de mejora'
  return 'Necesita atención'
}
