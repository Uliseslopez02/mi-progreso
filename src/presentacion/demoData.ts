/**
 * Datos ficticios de `/presentacion`. Fuente de verdad: la app real. Todo esto
 * usa los mismos tipos y las mismas funciones puras de `domain/*` que Mi
 * Progreso — sólo el historial está fabricado, y nada se persiste.
 *
 * Objetivos vs. hábitos, igual que en la app:
 * - Los OBJETIVOS puntúan el día. Tienen `weight` ("peso") y el % del día es
 *   `peso completado / peso total`. Los pesos por defecto suman ~100, así el %
 *   coincide con los puntos sumados (mismo criterio que `domain/defaults.ts`).
 * - Los HÁBITOS no puntúan: se miden por racha propia y constancia. Su `weight`
 *   siempre es 1 y no entra en el cálculo del día.
 */
import { addDays, todayKey, type DateKey } from '../domain/date'
import { snapshotGoals } from '../domain/day'
import type { Category, DayRecord, Goal, LifeGoal, Project, ProjectTask, Routine } from '../domain/types'

export const TODAY: DateKey = todayKey()
/** Ventana de historial fabricado. 45 > 30 para que el heatmap de hábitos
 * (últimos 30 días, igual que `HabitCard`) y las rachas tengan de dónde salir. */
export const DAYS_BACK = 45

/** Umbral de racha por defecto de la app (`DEFAULT_SETTINGS.streakThreshold`). */
export const DEMO_STREAK_THRESHOLD = 70

export const DEMO_CATEGORIES: Category[] = [
  { id: 'pr-salud', name: 'Salud', order: 0 },
  { id: 'pr-trabajo', name: 'Trabajo', order: 1 },
]

/**
 * Objetivos diarios que puntúan el día. Pesos desiguales que suman 100 —
 * mismo criterio que los objetivos por defecto de la app: el % del día es
 * literalmente la suma de puntos completados.
 */
export const DEMO_GOALS: Goal[] = [
  {
    id: 'g-entrenar', name: 'Entrenar', categoryId: 'pr-salud', weight: 25, active: true,
    period: 'daily', order: 0, createdAt: TODAY, kind: 'boolean', trackingKind: 'goal',
    frequency: { type: 'daily' },
  },
  {
    id: 'g-comer', name: 'Comer saludable', categoryId: 'pr-salud', weight: 15, active: true,
    period: 'daily', order: 1, createdAt: TODAY, kind: 'boolean', trackingKind: 'goal',
    frequency: { type: 'daily' },
  },
  {
    id: 'g-agua', name: 'Tomar 2L de agua', categoryId: 'pr-salud', weight: 10, active: true,
    period: 'daily', order: 2, createdAt: TODAY, kind: 'quantitative', targetValue: 2, unit: 'L',
    trackingKind: 'goal', frequency: { type: 'daily' },
  },
  {
    id: 'g-deepwork', name: 'Bloque de trabajo profundo', categoryId: 'pr-trabajo', weight: 30,
    active: true, period: 'daily', order: 3, createdAt: TODAY, kind: 'boolean', trackingKind: 'goal',
    frequency: { type: 'daily' },
  },
  {
    id: 'g-bandeja', name: 'Bandeja de entrada en cero', categoryId: 'pr-trabajo', weight: 20,
    active: true, period: 'daily', order: 4, createdAt: TODAY, kind: 'boolean', trackingKind: 'goal',
    frequency: { type: 'daily' },
  },
]

/** Hábitos: racha/heatmap propios, peso 1, no puntúan el día. */
export const DEMO_HABITS: Goal[] = [
  {
    id: 'h-dormir', name: 'Dormir 8 horas', categoryId: 'pr-salud', weight: 1, active: true,
    period: 'daily', order: 5, createdAt: TODAY, kind: 'boolean', trackingKind: 'habit',
    frequency: { type: 'daily' }, difficulty: 'medium',
  },
  {
    id: 'h-leer', name: 'Leer 20 minutos', categoryId: 'pr-trabajo', weight: 1, active: true,
    period: 'daily', order: 6, createdAt: TODAY, kind: 'boolean', trackingKind: 'habit',
    frequency: { type: 'daily' }, difficulty: 'easy',
  },
  {
    id: 'h-caminar', name: 'Caminar 30 minutos', categoryId: 'pr-salud', weight: 1, active: true,
    period: 'daily', order: 7, createdAt: TODAY, kind: 'boolean', trackingKind: 'habit',
    frequency: { type: 'daily' }, difficulty: 'easy',
  },
]

export const ALL_DEMO_GOALS: Goal[] = [...DEMO_GOALS, ...DEMO_HABITS]

// ---------- Patrón de cumplimiento (daysAgo: 0 = hoy, 45 = hace 45 días) ----------

/**
 * Días (en "daysAgo") en los que cada objetivo/hábito NO se cumplió. Todo lo
 * demás cuenta como cumplido. Hoy (0) queda a propósito a medias en objetivos
 * para invitar a marcar y ver el anillo/nota/racha reaccionar; los hábitos de
 * hoy sí arrancan cumplidos.
 */
const MISSED_ON: Record<string, number[]> = {
  // Objetivos — días 1..9 siempre ≥ 70% (racha del día = 9); se corta en el 10.
  'g-entrenar': [6, 11, 18, 25, 32, 40],
  'g-comer': [4, 10, 14, 22, 29, 36, 44],
  'g-deepwork': [0, 8, 10, 13, 16, 20, 24, 28, 31, 35, 39, 43],
  'g-bandeja': [0, 2, 10, 12, 15, 19, 23, 27, 30, 34, 38, 42],
  // Hábitos — rachas actuales distintas y coherentes con el heatmap.
  'h-dormir': [8, 19, 30, 41],
  'h-leer': [3, 9, 16, 24, 33, 42],
  'h-caminar': [5, 12, 20, 28, 36, 44],
}

/** Litros registrados los días que no se llegó a los 2L (el resto: 2L). */
const WATER_LITERS: Record<number, number> = { 12: 1, 19: 0.5, 26: 1.5, 33: 1 }

function progressFor(goalId: string, daysAgo: number): number | boolean {
  if (goalId === 'g-agua') return WATER_LITERS[daysAgo] ?? 2
  return !MISSED_ON[goalId]?.includes(daysAgo)
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
    id: 'lg-10k',
    name: 'Correr 10 km',
    description: 'De sofá a 10 km en 10 semanas.',
    categoryId: 'pr-salud',
    scope: 'personal',
    priority: 'high',
    progress: 62,
    status: 'active',
    subGoals: [
      { id: 'sg-1', text: 'Entrenar 3 veces por semana', done: true },
      { id: 'sg-2', text: 'Mejorar resistencia', done: true },
      { id: 'sg-3', text: 'Completar 8 km seguidos', done: false },
    ],
    linkedHabitIds: ['h-caminar'],
    order: 0,
    createdAt: TODAY,
  }
}

export const DEMO_PROJECT: Project = {
  id: 'proj-lanzamiento',
  name: 'Lanzar mi proyecto personal',
  description: 'De la idea a los primeros usuarios reales.',
  status: 'active',
  order: 0,
  createdAt: TODAY,
}

export function buildDemoProjectTasks(): ProjectTask[] {
  return [
    { id: 'pt-1', projectId: DEMO_PROJECT.id, title: 'Definir el problema que resuelve', status: 'done', order: 0, createdAt: TODAY },
    { id: 'pt-2', projectId: DEMO_PROJECT.id, title: 'Armar el primer prototipo', status: 'done', order: 1, createdAt: TODAY },
    { id: 'pt-3', projectId: DEMO_PROJECT.id, title: 'Probarlo con 5 personas', status: 'doing', order: 0, createdAt: TODAY },
    { id: 'pt-4', projectId: DEMO_PROJECT.id, title: 'Ajustar según feedback', status: 'todo', order: 0, createdAt: TODAY },
    { id: 'pt-5', projectId: DEMO_PROJECT.id, title: 'Publicarlo', status: 'todo', order: 1, createdAt: TODAY },
  ]
}

export const DEMO_ROUTINE: Routine = {
  id: 'rt-manana',
  name: 'Ritual de la mañana',
  category: 'morning',
  active: true,
  order: 0,
  createdAt: TODAY,
  steps: [
    { id: 'rs-1', text: 'Tender la cama', order: 0 },
    { id: 'rs-2', text: 'Vaso de agua', order: 1 },
    { id: 'rs-3', text: '10 minutos de estiramiento', order: 2 },
    { id: 'rs-4', text: 'Revisar la agenda del día', order: 3 },
  ],
}
