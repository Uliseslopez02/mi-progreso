import type { AppData, Category, Goal, Settings } from './types'
import { SCHEMA_VERSION } from './types'

export const DEFAULT_SETTINGS: Settings = {
  appName: 'Mi Progreso',
  streakThreshold: 70,
  allowEditingPastDays: true,
}

const cat = (id: string, name: string, order: number): Category => ({ id, name, order })

export const DEFAULT_CATEGORIES: Category[] = [
  cat('salud', 'Salud', 0),
  cat('desarrollo', 'Desarrollo personal', 1),
  cat('productividad', 'Productividad', 2),
  cat('finanzas', 'Finanzas', 3),
]

// Pesos elegidos a mano para que sumen 100: el % del día pasa a ser
// literalmente la suma de puntos completados, sin perder el ajuste fino
// entre objetivos más y menos importantes.
const goalSeed: Array<[string, string, string, number]> = [
  ['salud-actividad', 'Hacer actividad física', 'salud', 14],
  ['salud-dormir', '😴 Dormir 8 horas', 'salud', 14],
  ['salud-comer', '🥗 Comer saludable', 'salud', 12],
  ['prod-claude', '🧠 Avanzar con Claude', 'productividad', 12],
  ['salud-perro', '🐕 Pasear al perro', 'salud', 7],
  ['salud-creatina', '💊 Tomar creatina', 'salud', 9],
  ['dev-leer', '📖 Leer 20 minutos', 'desarrollo', 8],
  ['prod-orden', '🧹 Mantener la habitación ordenada', 'productividad', 8],
  ['salud-elongar', '🧘 Elongar', 'salud', 8],
  ['salud-hielo-manana', '🧊 Ponerme hielo — mañana', 'salud', 4],
  ['salud-hielo-noche', '🧊 Ponerme hielo — noche', 'salud', 4],
]

export function defaultGoals(createdAt: string): Goal[] {
  return goalSeed.map(([id, name, categoryId, weight], index) => ({
    id,
    name,
    categoryId,
    weight,
    active: true,
    period: 'daily' as const,
    order: index,
    createdAt,
    kind: 'boolean' as const,
    trackingKind: 'goal' as const,
  }))
}

export function createInitialData(createdAt: string): AppData {
  return {
    version: SCHEMA_VERSION,
    settings: { ...DEFAULT_SETTINGS },
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
    goals: defaultGoals(createdAt),
    days: {},
    periods: {},
    lifeGoals: [],
    plannerItems: [],
    routines: [],
    routineRuns: {},
    lifeWheelSnapshots: [],
    reflections: [],
  }
}

/**
 * Punto de partida para un usuario recién registrado: sin categorías ni
 * objetivos, para que el onboarding los arme con datos reales de la persona
 * en vez de sembrar en silencio los objetivos de ejemplo de `createInitialData`.
 */
export function createEmptyData(_createdAt: string): AppData {
  return {
    version: SCHEMA_VERSION,
    settings: { ...DEFAULT_SETTINGS },
    categories: [],
    goals: [],
    days: {},
    periods: {},
    lifeGoals: [],
    plannerItems: [],
    routines: [],
    routineRuns: {},
    lifeWheelSnapshots: [],
    reflections: [],
  }
}
