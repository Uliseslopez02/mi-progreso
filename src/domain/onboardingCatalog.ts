/**
 * Contenido estático del wizard de onboarding: áreas de vida (que se vuelven
 * categorías), objetivos sugeridos por área, y la escala de importancia.
 *
 * Los `id` de área son slugs fijos (no `createId()`) a propósito: se reusan
 * directo como `Category.id`, lo que permite detectar "esta área ya fue
 * elegida" comparando ids en vez de nombres, y hace que reabrir el wizard
 * después de un refresh a mitad de camino sea idempotente (no duplica
 * categorías).
 */

export interface LifeArea {
  id: string
  label: string
}

export const LIFE_AREAS: LifeArea[] = [
  { id: 'salud', label: 'Salud' },
  { id: 'productividad', label: 'Productividad' },
  { id: 'desarrollo', label: 'Desarrollo personal' },
  { id: 'finanzas', label: 'Finanzas' },
  { id: 'relaciones', label: 'Relaciones' },
  { id: 'orden', label: 'Orden' },
  { id: 'bienestar', label: 'Bienestar' },
  { id: 'otros', label: 'Otros' },
]

/** Nombres sugeridos por área. 'otros' queda vacío: sólo objetivo personalizado. */
export const SUGGESTED_GOALS: Record<string, string[]> = {
  salud: ['Dormir 8 horas', 'Hacer ejercicio', 'Tomar agua', 'Comer saludable', 'Caminar'],
  productividad: ['Trabajar sin distracciones', 'Planificar el día', 'Reducir uso del celular'],
  desarrollo: ['Leer', 'Estudiar', 'Aprender algo nuevo'],
  finanzas: [
    'Registrar los gastos del día',
    'Ahorrar una parte del sueldo',
    'Revisar el presupuesto semanal',
  ],
  relaciones: ['Llamar a un familiar o amigo', 'Dedicar tiempo de calidad en pareja o familia'],
  orden: ['Ordenar la habitación', 'Hacer la cama', 'Dejar la cocina limpia'],
  bienestar: ['Meditar', 'Salir a tomar aire', 'Reducir uso del celular'],
  otros: [],
}

export type WeightTier = 'baja' | 'media' | 'alta'

/**
 * Sólo importa la relación entre los pesos activos simultáneamente (ver
 * `computeDayStats` en `domain/scoring.ts`, que calcula
 * `completedWeight/totalWeight*100`), no una suma fija como el seed viejo.
 * Escala doblante: fácil de explicar ("Alta pesa el doble que Media, y el
 * cuádruple que Baja") y se mantiene proporcional sin importar cuántos
 * objetivos elija la persona.
 */
export const WEIGHT_TIER_VALUES: Record<WeightTier, number> = { baja: 1, media: 2, alta: 4 }

export const WEIGHT_TIER_LABELS: Record<WeightTier, string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
}

export const WEIGHT_TIERS: WeightTier[] = ['baja', 'media', 'alta']

export function weightForTier(tier: WeightTier): number {
  return WEIGHT_TIER_VALUES[tier]
}

/** A partir de esta cantidad, el paso de objetivos muestra una advertencia (no bloqueante). */
export const RECOMMENDED_MAX_GOALS = 8

export interface SuggestedGoal {
  name: string
  areaId: string
}

/** Une y deduplica (por nombre normalizado) las sugerencias de varias áreas. */
export function suggestedGoalsFor(areaIds: string[]): SuggestedGoal[] {
  const seen = new Set<string>()
  const out: SuggestedGoal[] = []
  for (const areaId of areaIds) {
    for (const name of SUGGESTED_GOALS[areaId] ?? []) {
      const key = name.trim().toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ name, areaId })
    }
  }
  return out
}
