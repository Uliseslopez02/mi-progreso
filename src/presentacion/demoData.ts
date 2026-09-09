/**
 * Datos ficticios de `/presentacion` — página comercial pública. Igual criterio
 * que `src/showcase/demoData.ts`: forma real (mismos tipos que produce la app
 * de verdad), historial fabricado, nada se persiste. Este archivo es
 * independiente del de `/producto` a propósito (Ulises pidió una ruta nueva
 * sin tocar `/producto`), pero cubre más superficie de producto: además de
 * hábitos/objetivos, incluye un Proyecto con tareas Kanban y una Rutina.
 */
import { addDays, todayKey, type DateKey } from '../domain/date'
import { snapshotGoals } from '../domain/day'
import type { Category, DayRecord, Goal, LifeGoal, Project, ProjectTask, Routine } from '../domain/types'

export const TODAY: DateKey = todayKey()
export const DAYS_BACK = 20

export const DEMO_CATEGORIES: Category[] = [
  { id: 'pr-salud', name: 'Salud', order: 0 },
  { id: 'pr-trabajo', name: 'Trabajo', order: 1 },
]

/**
 * Objetivos diarios que puntúan el día. A propósito con pesos desiguales
 * (Entrenar pesa el doble) para que la sección del sistema de porcentajes
 * pueda mostrar un caso real de ponderación, no todo 1/1.
 */
export const DEMO_GOALS: Goal[] = [
  {
    id: 'g-entrenar', name: 'Entrenar', categoryId: 'pr-salud', weight: 2, active: true,
    period: 'daily', order: 0, createdAt: TODAY, kind: 'boolean', trackingKind: 'goal',
    frequency: { type: 'daily' },
  },
  {
    id: 'g-agua', name: 'Tomar 2L de agua', categoryId: 'pr-salud', weight: 1, active: true,
    period: 'daily', order: 1, createdAt: TODAY, kind: 'quantitative', targetValue: 2, unit: 'L',
    trackingKind: 'goal', frequency: { type: 'daily' },
  },
  {
    id: 'g-deepwork', name: 'Bloque de trabajo profundo', categoryId: 'pr-trabajo', weight: 1,
    active: true, period: 'daily', order: 2, createdAt: TODAY, kind: 'boolean', trackingKind: 'goal',
    frequency: { type: 'daily' },
  },
  {
    id: 'g-bandeja', name: 'Bandeja de entrada en cero', categoryId: 'pr-trabajo', weight: 1,
    active: true, period: 'daily', order: 3, createdAt: TODAY, kind: 'boolean', trackingKind: 'goal',
    frequency: { type: 'daily' },
  },
]

/** Hábitos: racha/consistencia propios, no puntúan el día. */
export const DEMO_HABITS: Goal[] = [
  {
    id: 'h-dormir', name: 'Dormir 8 horas', categoryId: 'pr-salud', weight: 1, active: true,
    period: 'daily', order: 4, createdAt: TODAY, kind: 'boolean', trackingKind: 'habit',
    frequency: { type: 'daily' }, difficulty: 'medium',
  },
  {
    id: 'h-leer', name: 'Leer 20 minutos', categoryId: 'pr-trabajo', weight: 1, active: true,
    period: 'daily', order: 5, createdAt: TODAY, kind: 'boolean', trackingKind: 'habit',
    frequency: { type: 'daily' }, difficulty: 'easy',
  },
  {
    id: 'h-caminar', name: 'Caminar 30 minutos', categoryId: 'pr-salud', weight: 1, active: true,
    period: 'daily', order: 6, createdAt: TODAY, kind: 'boolean', trackingKind: 'habit',
    frequency: { type: 'daily' }, difficulty: 'easy',
  },
]

export const ALL_DEMO_GOALS: Goal[] = [...DEMO_GOALS, ...DEMO_HABITS]

// ---------- Patrón de cumplimiento (daysAgo: 0 = hoy, 20 = hace 20 días) ----------

const FALSE_ON: Record<string, Set<number>> = {
  // Hoy queda deliberadamente incompleto en un par de ítems: invita a
  // completarlos y ver reaccionar el anillo/racha en vivo.
  'g-entrenar': new Set([9, 16]),
  'g-deepwork': new Set(Array.from({ length: 21 }, (_, i) => i).filter((i) => i !== 3 && i !== 10)),
  'g-bandeja': new Set([0, 9, 11, 13, 15, 17, 19]),
  'h-dormir': new Set([7]),
  'h-leer': new Set([0, 2, 4, 6, 8, 10, 12, 14, 16, 18]),
  'h-caminar': new Set([0, 1, 3, 5, 7, 9, 11, 13, 15, 17]),
}

const WATER_LITERS: Record<number, number> = { 9: 0.5, 16: 1, 17: 1.5 }

function progressFor(goalId: string, daysAgo: number): number | boolean {
  if (goalId === 'g-agua') return WATER_LITERS[daysAgo] ?? 2
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

export const DEMO_STREAK_THRESHOLD = 70
