import { SCHEMA_VERSION } from '../domain/types'
import type { AppData, FocusSession, Goal, PeriodRecord, RecurringPeriod } from '../domain/types'
import { DEFAULT_SETTINGS, defaultGoals } from '../domain/defaults'
import type { ProgressRepository } from './repository'

export const STORAGE_KEY = 'mi-progreso:data'
/** Historial de enfoque: clave separada a propósito, fuera del blob principal. */
export const FOCUS_SESSIONS_KEY = 'mi-progreso:focus-sessions'

/** Persistencia local. Tolera datos viejos o corruptos sin romper la app. */
export function createLocalStorageRepository(
  storage: Storage = window.localStorage,
): ProgressRepository {
  return {
    async load() {
      let raw: string | null = null
      try {
        raw = storage.getItem(STORAGE_KEY)
      } catch {
        return null
      }
      if (!raw) return null
      try {
        return migrate(JSON.parse(raw))
      } catch {
        return null
      }
    },
    async save(data: AppData) {
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(data))
      } catch {
        // Sin espacio o modo privado: la app sigue funcionando en memoria.
      }
    },
    async clear() {
      try {
        storage.removeItem(STORAGE_KEY)
        storage.removeItem(FOCUS_SESSIONS_KEY)
      } catch {
        // ignorado a propósito
      }
    },
    async loadFocusSessions() {
      try {
        const raw = storage.getItem(FOCUS_SESSIONS_KEY)
        return raw ? normalizeFocusSessions(JSON.parse(raw)) : []
      } catch {
        return []
      }
    },
    async saveFocusSession(session) {
      try {
        const raw = storage.getItem(FOCUS_SESSIONS_KEY)
        const existing = raw ? normalizeFocusSessions(JSON.parse(raw)) : []
        const next = [session, ...existing.filter((s) => s.id !== session.id)]
        storage.setItem(FOCUS_SESSIONS_KEY, JSON.stringify(next))
      } catch {
        // sin espacio o modo privado: se pierde el historial de enfoque, no rompe la app
      }
    },
    async getUserPlan() {
      // No hay concepto de cuenta/plan sin Supabase — localStorage es siempre 'free'.
      return 'free'
    },
  }
}

function normalizeFocusSessions(input: unknown): FocusSession[] {
  if (!Array.isArray(input)) return []
  return input
    .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
    .map((s) => ({
      id: String(s.id),
      startedAt: String(s.startedAt),
      completedAt: String(s.completedAt),
      plannedMinutes: typeof s.plannedMinutes === 'number' ? s.plannedMinutes : 0,
      type: s.type === 'break' ? 'break' : 'focus',
      status: s.status === 'stopped' ? 'stopped' : 'completed',
      linkedPlannerItemId: s.linkedPlannerItemId ? String(s.linkedPlannerItemId) : undefined,
    }))
}

/**
 * Ids de la primera tanda de objetivos de ejemplo (antes de reemplazarlos por
 * los reales del usuario). Si un storage guardado coincide exactamente con
 * ese set, intacto y sin ningún objetivo completado nunca, es un "instalé la
 * app y todavía no toqué nada": se puede migrar en silencio a los objetivos
 * reales sin arriesgar borrar una configuración propia. Si algo no calza (un
 * id distinto, un peso cambiado, un objetivo desactivado, o algún objetivo
 * marcado alguna vez), no se toca nada.
 *
 * Importante: no se puede exigir `days` vacío — la app crea sola una entrada
 * para "hoy" (0 completados) apenas carga, así que un storage recién creado
 * ya tiene un día registrado sin que el usuario haya hecho nada.
 */
const PRISTINE_SAMPLE_GOAL_IDS = new Set([
  'salud-actividad',
  'salud-agua',
  'salud-comida',
  'salud-sueno',
  'dev-leer',
  'dev-estudiar',
  'dev-celular',
  'prod-principal',
  'prod-proyecto',
  'prod-orden',
  'fin-gastos',
])

function isPristineSampleData(goals: Goal[], days: AppData['days']): boolean {
  const everCompletedSomething = Object.values(days).some((record) => Object.keys(record.goalProgress).length > 0)
  if (everCompletedSomething) return false
  if (goals.length !== PRISTINE_SAMPLE_GOAL_IDS.size) return false
  return goals.every((g) => PRISTINE_SAMPLE_GOAL_IDS.has(g.id) && g.active && g.weight === 1)
}

/** Normaliza lo leído del storage al esquema actual. */
export function migrate(input: unknown): AppData | null {
  if (!input || typeof input !== 'object') return null
  const raw = input as Partial<AppData>
  if (!Array.isArray(raw.goals) || !Array.isArray(raw.categories)) return null

  const parsedGoals: Goal[] = raw.goals.map((g, i) => ({
    id: String(g.id),
    name: String(g.name),
    categoryId: String(g.categoryId),
    weight: typeof g.weight === 'number' && g.weight > 0 ? g.weight : 1,
    active: g.active !== false,
    period: g.period ?? 'daily',
    order: typeof g.order === 'number' ? g.order : i,
    createdAt: g.createdAt ?? new Date(0).toISOString(),
    kind: g.kind ?? 'boolean',
    targetValue: g.targetValue,
    unit: g.unit,
    daysOfWeek: g.daysOfWeek,
    trackingKind: (g as any).trackingKind ?? 'goal',
    frequency: (g as any).frequency,
  }))
  const days = normalizeDays(raw.days)
  const goals = isPristineSampleData(parsedGoals, days)
    ? defaultGoals(new Date().toISOString())
    : parsedGoals

  return {
    version: SCHEMA_VERSION,
    settings: { ...DEFAULT_SETTINGS, ...(raw.settings ?? {}) },
    categories: raw.categories.map((c, i) => ({
      id: String(c.id),
      name: String(c.name),
      order: typeof c.order === 'number' ? c.order : i,
      color: typeof c.color === 'string' ? c.color : undefined,
    })),
    goals,
    days,
    periods: normalizePeriods(raw.periods),
    lifeGoals: normalizeLifeGoals(raw.lifeGoals),
    plannerItems: normalizePlannerItems(raw.plannerItems),
    routines: normalizeRoutines(raw.routines),
    routineRuns: normalizeRoutineRuns(raw.routineRuns),
    lifeWheelSnapshots: normalizeLifeWheelSnapshots(raw.lifeWheelSnapshots),
    reflections: normalizeReflections(raw.reflections),
    projects: normalizeProjects(raw.projects),
    projectTasks: normalizeProjectTasks(raw.projectTasks),
    notes: normalizeNotes(raw.notes),
  }
}

function normalizeProjects(projects: AppData['projects'] | undefined): AppData['projects'] {
  if (!Array.isArray(projects)) return []
  const validStatuses = new Set(['active', 'completed', 'archived'])
  return projects.map((p, i) => ({
    id: String(p.id),
    name: String(p.name),
    description: p.description ? String(p.description) : undefined,
    status: validStatuses.has(p.status) ? p.status : 'active',
    order: typeof p.order === 'number' ? p.order : i,
    createdAt: p.createdAt ?? new Date(0).toISOString(),
  }))
}

function normalizeProjectTasks(tasks: AppData['projectTasks'] | undefined): AppData['projectTasks'] {
  if (!Array.isArray(tasks)) return []
  const validStatuses = new Set(['todo', 'doing', 'done'])
  return tasks
    .filter((t): t is NonNullable<typeof t> => !!t && typeof t.projectId === 'string')
    .map((t, i) => ({
      id: String(t.id),
      projectId: String(t.projectId),
      title: String(t.title),
      status: validStatuses.has(t.status) ? t.status : 'todo',
      order: typeof t.order === 'number' ? t.order : i,
      createdAt: t.createdAt ?? new Date(0).toISOString(),
    }))
}

function normalizeReflections(reflections: AppData['reflections'] | undefined): AppData['reflections'] {
  if (!Array.isArray(reflections)) return []
  return reflections
    .filter((r): r is NonNullable<typeof r> => !!r && typeof r.date === 'string')
    .map((r) => ({
      id: String(r.id),
      date: String(r.date),
      prompt: String(r.prompt ?? ''),
      answer: String(r.answer ?? ''),
      createdAt: r.createdAt ?? new Date(0).toISOString(),
    }))
}

function normalizeNotes(notes: AppData['notes'] | undefined): AppData['notes'] {
  if (!Array.isArray(notes)) return []
  return notes
    .filter((n): n is NonNullable<typeof n> => !!n && typeof n.date === 'string')
    .map((n) => ({
      id: String(n.id),
      date: String(n.date),
      title: n.title ? String(n.title) : undefined,
      body: String(n.body ?? ''),
      createdAt: n.createdAt ?? new Date(0).toISOString(),
    }))
}

function normalizeLifeWheelSnapshots(
  snapshots: AppData['lifeWheelSnapshots'] | undefined,
): AppData['lifeWheelSnapshots'] {
  if (!Array.isArray(snapshots)) return []
  return snapshots
    .filter((s): s is NonNullable<typeof s> => !!s && Array.isArray(s.areas))
    .map((s) => ({
      id: String(s.id),
      date: String(s.date),
      areas: s.areas.map((a) => ({
        categoryId: String(a.categoryId),
        categoryName: String(a.categoryName ?? 'Sin categoría'),
        score: typeof a.score === 'number' ? Math.min(10, Math.max(1, a.score)) : 5,
      })),
      notes: s.notes || undefined,
      createdAt: s.createdAt ?? new Date(0).toISOString(),
    }))
}

function normalizeRoutines(routines: AppData['routines'] | undefined): AppData['routines'] {
  if (!Array.isArray(routines)) return []
  const validCategories = new Set(['morning', 'evening', 'workout', 'work', 'custom'])
  return routines.map((r, i) => ({
    id: String(r.id),
    name: String(r.name),
    category: validCategories.has(r.category) ? r.category : 'custom',
    steps: Array.isArray(r.steps)
      ? r.steps.map((s, si) => ({
          id: String(s.id),
          text: String(s.text),
          order: typeof s.order === 'number' ? s.order : si,
        }))
      : [],
    active: r.active !== false,
    order: typeof r.order === 'number' ? r.order : i,
    createdAt: r.createdAt ?? new Date(0).toISOString(),
  }))
}

function normalizeRoutineRuns(runs: AppData['routineRuns'] | undefined): AppData['routineRuns'] {
  if (!runs || typeof runs !== 'object') return {}
  const out: AppData['routineRuns'] = {}
  for (const [key, run] of Object.entries(runs)) {
    if (!run || !run.routineId || !run.date) continue
    out[key] = {
      routineId: String(run.routineId),
      date: String(run.date),
      completedStepIds: Array.isArray(run.completedStepIds) ? run.completedStepIds.map(String) : [],
    }
  }
  return out
}

function normalizePlannerItems(items: AppData['plannerItems'] | undefined): AppData['plannerItems'] {
  if (!Array.isArray(items)) return []
  return items.map((i, idx) => ({
    id: String(i.id),
    date: String(i.date),
    title: String(i.title),
    type: i.type === 'event' ? 'event' : 'task',
    category: i.category === 'professional' ? 'professional' : 'personal',
    priority: i.priority === 'low' || i.priority === 'high' ? i.priority : 'medium',
    done: i.done === true,
    order: typeof i.order === 'number' ? i.order : idx,
    createdAt: i.createdAt ?? new Date(0).toISOString(),
    startTime: typeof i.startTime === 'string' ? i.startTime : undefined,
    durationMinutes: typeof i.durationMinutes === 'number' ? i.durationMinutes : undefined,
    linkedHabitId: typeof i.linkedHabitId === 'string' ? i.linkedHabitId : undefined,
    habitCompletionMode:
      i.habitCompletionMode === 'auto' || i.habitCompletionMode === 'confirm' || i.habitCompletionMode === 'reminder'
        ? i.habitCompletionMode
        : undefined,
  }))
}

function normalizeLifeGoals(lifeGoals: AppData['lifeGoals'] | undefined): AppData['lifeGoals'] {
  if (!Array.isArray(lifeGoals)) return []
  return lifeGoals.map((g, i) => ({
    id: String(g.id),
    name: String(g.name),
    description: g.description,
    categoryId: g.categoryId,
    scope: g.scope === 'professional' ? 'professional' : 'personal',
    priority: g.priority === 'low' || g.priority === 'high' ? g.priority : 'medium',
    targetDate: g.targetDate,
    progress: typeof g.progress === 'number' ? Math.min(100, Math.max(0, g.progress)) : 0,
    status: g.status === 'completed' || g.status === 'abandoned' ? g.status : 'active',
    subGoals: Array.isArray(g.subGoals)
      ? g.subGoals.map((s) => ({ id: String(s.id), text: String(s.text), done: s.done === true }))
      : [],
    linkedHabitIds: Array.isArray(g.linkedHabitIds) ? g.linkedHabitIds.map(String) : [],
    order: typeof g.order === 'number' ? g.order : i,
    createdAt: g.createdAt ?? new Date(0).toISOString(),
    kind: g.kind,
    currentValue: typeof g.currentValue === 'number' ? g.currentValue : undefined,
    targetValue: typeof g.targetValue === 'number' ? g.targetValue : undefined,
    unit: g.unit,
    milestones: Array.isArray(g.milestones)
      ? g.milestones.map((m) => ({
          id: String(m.id),
          name: String(m.name),
          targetDate: m.targetDate,
          done: m.done === true,
        }))
      : [],
  }))
}

function normalizeDays(days: AppData['days'] | undefined): AppData['days'] {
  if (!days || typeof days !== 'object') return {}
  const out: AppData['days'] = {}
  for (const [key, record] of Object.entries(days)) {
    if (!record || !Array.isArray(record.goals)) continue

    let goalProgress: Record<string, number | boolean> = {}
    // Convertir datos viejos (completedGoalIds array) o nuevos (goalProgress object)
    const anyRecord = record as any
    if (anyRecord.goalProgress && typeof anyRecord.goalProgress === 'object' && !Array.isArray(anyRecord.goalProgress)) {
      goalProgress = anyRecord.goalProgress
    } else if (Array.isArray(anyRecord.completedGoalIds)) {
      // Convertir array viejo a nuevo formato
      for (const id of anyRecord.completedGoalIds) {
        goalProgress[String(id)] = true
      }
    }

    out[key] = {
      date: key,
      goals: record.goals.map((g) => ({
        goalId: String(g.goalId),
        name: String(g.name),
        categoryId: String(g.categoryId),
        categoryName: String(g.categoryName ?? 'Sin categoría'),
        weight: typeof g.weight === 'number' && g.weight > 0 ? g.weight : 1,
        kind: g.kind ?? 'boolean',
        targetValue: g.targetValue,
        unit: g.unit,
        trackingKind: (g as any).trackingKind ?? 'goal',
      })),
      goalProgress,
      closed: record.closed === true,
    }
  }
  return out
}

function normalizePeriods(periods: AppData['periods'] | undefined): AppData['periods'] {
  if (!periods || typeof periods !== 'object') return {}
  const out: AppData['periods'] = {}
  for (const [key, record] of Object.entries(periods)) {
    if (!record || !Array.isArray(record.goals)) continue
    const period: RecurringPeriod = record.period === 'monthly' ? 'monthly' : 'weekly'

    let goalProgress: Record<string, number | boolean> = {}
    const anyRecord = record as any
    if (anyRecord.goalProgress && typeof anyRecord.goalProgress === 'object' && !Array.isArray(anyRecord.goalProgress)) {
      goalProgress = anyRecord.goalProgress
    } else if (Array.isArray(anyRecord.completedGoalIds)) {
      for (const id of anyRecord.completedGoalIds) {
        goalProgress[String(id)] = true
      }
    }

    const normalized: PeriodRecord = {
      key,
      period,
      periodStart: String(record.periodStart ?? ''),
      goals: record.goals.map((g) => ({
        goalId: String(g.goalId),
        name: String(g.name),
        categoryId: String(g.categoryId),
        categoryName: String(g.categoryName ?? 'Sin categoría'),
        weight: typeof g.weight === 'number' && g.weight > 0 ? g.weight : 1,
        kind: g.kind ?? 'boolean',
        targetValue: g.targetValue,
        unit: g.unit,
        trackingKind: (g as any).trackingKind ?? 'goal',
      })),
      goalProgress,
      closed: record.closed === true,
    }
    if (!normalized.periodStart) continue
    out[key] = normalized
  }
  return out
}
