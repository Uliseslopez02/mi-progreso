/**
 * Datos de la demo pública (`/producto`). No es un fixture de test: es un
 * historial fabricado pero *realista*, con la misma forma que produciría la
 * app real, para que los módulos usen las funciones puras de `domain/*` en
 * vez de números escritos a mano por módulo. Nada de esto se persiste.
 */
import { addDays, todayKey, type DateKey } from '../domain/date'
import { snapshotGoals } from '../domain/day'
import type { Category, DayRecord, Goal, LifeGoal, LifeWheelSnapshot } from '../domain/types'

export const TODAY: DateKey = todayKey()
export const DAYS_BACK = 20

export const DEMO_CATEGORIES: Category[] = [
  { id: 'sc-salud', name: 'Salud', order: 0 },
  { id: 'sc-productividad', name: 'Productividad', order: 1 },
]

/** Objetivos diarios "que puntúan" — alimentan el % de hoy (Módulos 2 y 9). */
export const DEMO_GOALS: Goal[] = [
  {
    id: 'goal-train', name: 'Entrenar', categoryId: 'sc-salud', weight: 1, active: true,
    period: 'daily', order: 0, createdAt: TODAY, kind: 'boolean', trackingKind: 'goal',
    frequency: { type: 'daily' },
  },
  {
    id: 'goal-water', name: 'Tomar 2L de agua', categoryId: 'sc-salud', weight: 1, active: true,
    period: 'daily', order: 1, createdAt: TODAY, kind: 'quantitative', targetValue: 2, unit: 'L',
    trackingKind: 'goal', frequency: { type: 'daily' },
  },
  {
    id: 'goal-work', name: 'Avanzar en el proyecto', categoryId: 'sc-productividad', weight: 1,
    active: true, period: 'daily', order: 2, createdAt: TODAY, kind: 'boolean', trackingKind: 'goal',
    frequency: { type: 'daily' },
  },
  {
    id: 'goal-order', name: 'Habitación ordenada', categoryId: 'sc-productividad', weight: 1,
    active: true, period: 'daily', order: 3, createdAt: TODAY, kind: 'boolean', trackingKind: 'goal',
    frequency: { type: 'daily' },
  },
  {
    id: 'goal-stretch', name: 'Elongar', categoryId: 'sc-salud', weight: 1, active: true,
    period: 'daily', order: 4, createdAt: TODAY, kind: 'boolean', trackingKind: 'goal',
    frequency: { type: 'daily' },
  },
]

/** Hábitos — se trackean con racha/heatmap propios, no puntúan el día (Módulo 1). */
export const DEMO_HABITS: Goal[] = [
  {
    id: 'habit-sleep', name: 'Dormir 8 horas', categoryId: 'sc-salud', weight: 1, active: true,
    period: 'daily', order: 5, createdAt: TODAY, kind: 'boolean', trackingKind: 'habit',
    frequency: { type: 'daily' },
  },
  {
    id: 'habit-activity', name: 'Actividad física', categoryId: 'sc-salud', weight: 1, active: true,
    period: 'daily', order: 6, createdAt: TODAY, kind: 'boolean', trackingKind: 'habit',
    frequency: { type: 'daily' },
  },
  {
    id: 'habit-eat', name: 'Comer saludable', categoryId: 'sc-salud', weight: 1, active: true,
    period: 'daily', order: 7, createdAt: TODAY, kind: 'boolean', trackingKind: 'habit',
    frequency: { type: 'daily' },
  },
  {
    id: 'habit-read', name: 'Leer 20 minutos', categoryId: 'sc-productividad', weight: 1, active: true,
    period: 'daily', order: 8, createdAt: TODAY, kind: 'boolean', trackingKind: 'habit',
    frequency: { type: 'daily' },
  },
]

export const ALL_DEMO_GOALS: Goal[] = [...DEMO_GOALS, ...DEMO_HABITS]

// ---------- Patrón de cumplimiento (daysAgo: 0 = hoy, 20 = hace 20 días) ----------

const FALSE_ON: Record<string, Set<number>> = {
  // Hoy queda deliberadamente incompleto en un par de ítems: la demo invita
  // a completarlos y ver reaccionar el anillo/racha en vivo.
  'goal-train': new Set([10, 17]),
  'goal-work': new Set(Array.from({ length: 21 }, (_, i) => i).filter((i) => i !== 12 && i !== 16)),
  'goal-order': new Set([0, 10, 12, 14, 16, 18, 20]),
  'goal-stretch': new Set([0, 10, 20]),
  'habit-sleep': new Set([8]),
  'habit-activity': new Set([0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20]),
  'habit-eat': new Set([2, 9, 16]),
  'habit-read': new Set([0, 3, 5, 7, 9, 11, 13, 15, 17, 19]),
}

const WATER_LITERS: Record<number, number> = { 10: 0.5, 17: 1, 18: 1.5 }

function progressFor(goalId: string, daysAgo: number): number | boolean {
  if (goalId === 'goal-water') return WATER_LITERS[daysAgo] ?? 2
  return !FALSE_ON[goalId]?.has(daysAgo)
}

export function buildDemoDays(): Record<DateKey, DayRecord> {
  const days: Record<DateKey, DayRecord> = {}
  for (let daysAgo = DAYS_BACK; daysAgo >= 0; daysAgo -= 1) {
    const date = addDays(TODAY, -daysAgo)
    const goals = snapshotGoals(ALL_DEMO_GOALS, DEMO_CATEGORIES, date)
    const goalProgress: Record<string, number | boolean> = {}
    for (const g of goals) goalProgress[g.goalId] = progressFor(g.goalId, daysAgo)
    days[date] = { date, goals, goalProgress, closed: date !== TODAY }
  }
  return days
}

export function buildDemoLifeGoal(): LifeGoal {
  return {
    id: 'lifegoal-10k',
    name: 'Correr 10 km',
    description: 'De sofá a 10 km en 10 semanas.',
    categoryId: 'sc-salud',
    scope: 'personal',
    priority: 'high',
    progress: 68,
    status: 'active',
    subGoals: [
      { id: 'sub-1', text: 'Entrenar 3 veces por semana', done: true },
      { id: 'sub-2', text: 'Mejorar resistencia', done: true },
      { id: 'sub-3', text: 'Completar 8 km', done: false },
    ],
    linkedHabitIds: ['habit-activity'],
    order: 0,
    createdAt: TODAY,
  }
}

export function buildDemoDreams(): LifeGoal[] {
  return [
    {
      id: 'dream-japon',
      name: 'Viajar a Japón',
      description: 'Dos semanas recorriendo Tokio y Kioto.',
      scope: 'personal',
      priority: 'medium',
      progress: 0,
      status: 'active',
      subGoals: [{ id: 'sd-1', text: 'Ahorrar para el pasaje', done: false }],
      linkedHabitIds: [],
      order: 0,
      createdAt: TODAY,
    },
    {
      id: 'dream-proyecto',
      name: 'Crear mi propio proyecto',
      description: 'Ya lanzado y con los primeros usuarios reales.',
      scope: 'professional',
      priority: 'high',
      progress: 100,
      status: 'completed',
      subGoals: [{ id: 'sd-2', text: 'Conseguir los primeros 10 usuarios', done: true }],
      linkedHabitIds: [],
      order: 1,
      createdAt: TODAY,
    },
    {
      id: 'dream-maraton',
      name: 'Correr una maratón',
      description: 'Los 42km completos, sin caminar.',
      scope: 'personal',
      priority: 'medium',
      progress: 30,
      status: 'active',
      subGoals: [{ id: 'sd-3', text: 'Correr 15 km seguidos', done: false }],
      linkedHabitIds: ['habit-activity'],
      order: 2,
      createdAt: TODAY,
    },
  ]
}

export function buildDemoWheelSnapshot(): LifeWheelSnapshot {
  return {
    id: 'wheel-demo',
    date: TODAY,
    createdAt: TODAY,
    areas: [
      { categoryId: 'salud', categoryName: 'Salud', score: 7 },
      { categoryId: 'productividad', categoryName: 'Productividad', score: 6 },
      { categoryId: 'relaciones', categoryName: 'Relaciones', score: 8 },
      { categoryId: 'desarrollo', categoryName: 'Desarrollo personal', score: 5 },
      { categoryId: 'descanso', categoryName: 'Descanso', score: 4 },
      { categoryId: 'bienestar', categoryName: 'Bienestar', score: 7 },
    ],
  }
}

/** Fecha/expectativa fijas de demo — no representan a ninguna persona real. */
export const DEMO_BIRTH_DATE: DateKey = '1996-03-15'
export const DEMO_LIFE_EXPECTANCY_YEARS = 85

export const MOMENTO_MORI_QUOTES: string[] = [
  'No es que tengamos poco tiempo, sino que perdemos mucho.',
  'El tiempo que perdemos hoy no se recupera nunca.',
  'Vive como si fueras a morir mañana. Aprendé como si fueras a vivir para siempre.',
  'Cada día que pasa es un día menos, o un día más vivido — vos elegís cómo mirarlo.',
  'La muerte nos vuelve serios respecto de lo que realmente importa.',
]

export const DEMO_STREAK_THRESHOLD = 70
