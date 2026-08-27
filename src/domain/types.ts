/**
 * Modelo de datos de Mi Progreso.
 *
 * Decisiones estructurales:
 * - Cada objetivo tiene `weight` (peso). Hoy todos arrancan en 1, pero el cálculo
 *   ya es ponderado, así que subir un peso a 2 funciona sin tocar la UI.
 * - Cada objetivo tiene `period`. Hoy sólo se usa 'daily', pero el tipo ya
 *   contempla 'weekly' | 'monthly' para objetivos semanales/mensuales futuros.
 * - Cada día guarda un *snapshot* de los objetivos vigentes ese día. Si mañana
 *   borro o renombro un objetivo, el historial de ayer sigue siendo correcto.
 */

export type GoalPeriod = 'daily' | 'weekly' | 'monthly'
export type GoalKind = 'boolean' | 'quantitative' | 'timed'

/** 'goal' puntúa el día (objetivo diario clásico). 'habit' se trackea con racha y
 * % de cumplimiento propios, pero no suma al porcentaje ponderado del día. */
export type TrackingKind = 'goal' | 'habit'

/**
 * Reemplaza a `daysOfWeek` (que sigue existiendo para compatibilidad hacia atrás,
 * ver migrations.ts). 'daily' y 'timesPerWeek'/'monthly' aparecen todos los días
 * para poder marcarlos cuando corresponda — la semántica de "N veces por semana"
 * o "mensual" se resuelve en las estadísticas/consistencia, no en qué día aparece.
 */
export type GoalFrequency =
  | { type: 'daily' }
  | { type: 'daysOfWeek'; days: string[] }
  | { type: 'timesPerWeek'; timesPerWeek: number }
  | { type: 'monthly' }

export interface Category {
  id: string
  name: string
  order: number
}

export interface Goal {
  id: string
  name: string
  categoryId: string
  /** Peso relativo dentro del cálculo ponderado. Por defecto 1. */
  weight: number
  /** Un objetivo inactivo deja de aparecer en los días nuevos. */
  active: boolean
  period: GoalPeriod
  order: number
  createdAt: string
  /** Tipo de objetivo: booleano (sí/no), cuantitativo (ej. 2L), temporal (ej. 20 min). */
  kind: GoalKind
  /** Meta numérica: cuántos litros, minutos, km, etc. Undefined si es booleano. */
  targetValue?: number
  /** Unidad de medida: "L", "min", "km", etc. */
  unit?: string
  /** @deprecated reemplazado por `frequency`. Se conserva en el tipo sólo para que
   * datos viejos sin migrar no rompan el tipado; `migrations.ts` lo convierte. */
  daysOfWeek?: string[]
  /** 'goal' si no está definido (compatibilidad con objetivos creados antes de
   * Hábitos — todos son 'goal', ver `TrackingKind`). */
  trackingKind?: TrackingKind
  /** Frecuencia del objetivo/hábito. Si no está definida, se interpreta como diaria. */
  frequency?: GoalFrequency
}

/** Copia congelada de un objetivo tal como estaba el día en que se registró. */
export interface GoalSnapshot {
  goalId: string
  name: string
  categoryId: string
  categoryName: string
  weight: number
  kind: GoalKind
  targetValue?: number
  unit?: string
  /** 'goal' si no está definido — ver `Goal.trackingKind`. */
  trackingKind?: TrackingKind
}

export interface DayRecord {
  /** Clave local en formato YYYY-MM-DD. */
  date: string
  goals: GoalSnapshot[]
  /** Progreso por objetivo: true/false para booleanos, número para cuantitativos. */
  goalProgress: Record<string, number | boolean>
  /** Un día se cierra cuando deja de ser "hoy"; sólo se edita si Ajustes lo permite. */
  closed: boolean
}

export type RecurringPeriod = Extract<GoalPeriod, 'weekly' | 'monthly'>

/**
 * Registro de un objetivo semanal o mensual, análogo a DayRecord pero para un
 * rango más largo. `periodStart` es el lunes de la semana o el día 1 del mes.
 */
export interface PeriodRecord {
  key: string
  period: RecurringPeriod
  periodStart: string
  goals: GoalSnapshot[]
  goalProgress: Record<string, number | boolean>
  closed: boolean
}

export type LifeGoalScope = 'personal' | 'professional'
export type LifeGoalPriority = 'low' | 'medium' | 'high'
export type LifeGoalStatus = 'active' | 'completed' | 'abandoned'

export interface SubGoal {
  id: string
  text: string
  done: boolean
}

export type LifeGoalKind =
  | 'percentage'
  | 'quantity'
  | 'money'
  | 'hours'
  | 'sessions'
  | 'checklist'
  | 'milestones'
  | 'habits'

export interface Milestone {
  id: string
  name: string
  /** Fecha en formato YYYY-MM-DD (DateKey), opcional. */
  targetDate?: string
  done: boolean
}

/**
 * Meta de largo plazo — distinto de `Goal` (objetivo diario puntuable) a
 * propósito, para no mezclar "algo que cumplo hoy" con "algo hacia lo que
 * voy". `linkedHabitIds` son referencias por id a hábitos (`Goal.trackingKind
 * === 'habit'`), sin denormalizar nombre/estado — se resuelven en la UI.
 *
 * `progress` (0–100) es siempre el número guardado y consumido por el resto
 * de la app (salud de metas, filtros) — pero según `kind` puede ser manual
 * (`'percentage'`, sin valor = comportamiento de siempre) o derivado y
 * recalculado por el reducer a partir de `currentValue`/`targetValue`,
 * `subGoals` o `milestones`. Ver `domain/lifeGoalProgress.ts`.
 */
export interface LifeGoal {
  id: string
  name: string
  description?: string
  categoryId?: string
  scope: LifeGoalScope
  priority: LifeGoalPriority
  /** Fecha objetivo en formato YYYY-MM-DD (DateKey), opcional. */
  targetDate?: string
  progress: number
  status: LifeGoalStatus
  subGoals: SubGoal[]
  linkedHabitIds: string[]
  order: number
  createdAt: string
  /** Sin valor = 'percentage' (comportamiento original: `progress` manual). */
  kind?: LifeGoalKind
  /** Usados por 'quantity'/'money'/'hours'/'sessions'. */
  currentValue?: number
  targetValue?: number
  /** Unidad libre, sólo relevante para 'quantity' (money/hours/sessions tienen unidad fija). */
  unit?: string
  /** Usado por 'milestones'. */
  milestones?: Milestone[]
}

export type PlannerItemType = 'task' | 'event'
export type PlannerCategory = 'personal' | 'professional'
export type PlannerPriority = 'low' | 'medium' | 'high'
export type HabitCompletionMode = 'auto' | 'confirm' | 'reminder'

/**
 * Ítem del planificador semanal: una tarea o evento anclado a un día
 * concreto. Independiente de `Goal`/`LifeGoal` a propósito — el planificador
 * es "qué voy a hacer esta semana", no vuelve a puntuar ni a trackear racha.
 * `order` sólo importa dentro de un mismo `date` (para el arrastre); al
 * moverse de día simplemente cambia `date` y se le asigna un `order` nuevo.
 */
export interface PlannerItem {
  id: string
  date: string
  title: string
  type: PlannerItemType
  category: PlannerCategory
  priority: PlannerPriority
  done: boolean
  order: number
  createdAt: string
  /** Hora local "HH:MM". Sin valor = tarea sin horario fijo (no aparece en la grilla del día). */
  startTime?: string
  /** Sólo tiene sentido si `startTime` está definido. */
  durationMinutes?: number
  /** Referencia por id a un `Goal` con `trackingKind === 'habit'`, sin denormalizar. */
  linkedHabitId?: string
  /** Sin valor = 'auto' si hay `linkedHabitId`. Ver `DayAgendaPage`. */
  habitCompletionMode?: HabitCompletionMode
}

export type ProjectStatus = 'active' | 'completed' | 'archived'

/** Un proyecto agrupa tareas propias, sin fecha — distinto de `PlannerItem`
 * (tarea/evento anclado a un día concreto). Un proyecto es "qué quiero
 * lograr", el tablero Kanban es "en qué etapa está cada parte". */
export interface Project {
  id: string
  name: string
  description?: string
  status: ProjectStatus
  order: number
  createdAt: string
}

export type ProjectTaskStatus = 'todo' | 'doing' | 'done'

/** Tarjeta de un tablero Kanban: pertenece a un `Project`, sin fecha propia. */
export interface ProjectTask {
  id: string
  projectId: string
  title: string
  status: ProjectTaskStatus
  /** Orden dentro de su columna de estado (mismo criterio que `PlannerItem.order` dentro de su `date`). */
  order: number
  createdAt: string
}

export type RoutineCategory = 'morning' | 'evening' | 'workout' | 'work' | 'custom'

export interface RoutineStep {
  id: string
  text: string
  order: number
}

/**
 * Rutina con pasos ordenados (ritual matutino, nocturno, entrenamiento,
 * trabajo, personalizado). A diferencia de `Goal`, lo que se trackea por día
 * no es un solo valor sino cuáles pasos se completaron (`RoutineRun`) — más
 * parecida en espíritu a `DayRecord` (snapshot + progreso por día) que a
 * `LifeGoal`.
 */
export interface Routine {
  id: string
  name: string
  category: RoutineCategory
  steps: RoutineStep[]
  active: boolean
  order: number
  createdAt: string
}

/**
 * Ejecución de una rutina en un día concreto: qué pasos se completaron. No
 * congela el texto de los pasos (a diferencia de `GoalSnapshot`) porque las
 * rutinas no puntúan el día — si un paso se edita o se borra después, el
 * historial simplemente referencia un id que puede ya no existir (mismo
 * criterio que `PlannerItem`/`LifeGoal`, que tampoco snapshotean).
 */
export interface RoutineRun {
  routineId: string
  date: string
  completedStepIds: string[]
}

export type FocusSessionType = 'focus' | 'break'
export type FocusSessionStatus = 'completed' | 'stopped'

/**
 * Una sesión de enfoque terminada (completó su duración o se detuvo antes).
 * A propósito NO vive en `AppData`/`save_app_data`: a diferencia del resto de
 * las entidades, el historial de sesiones crece sin límite superior (varias
 * por día, todos los días), así que tiene su propia tabla y sus propios
 * métodos de repositorio (`loadFocusSessions`/`saveFocusSession`) en vez de
 * viajar entero en cada guardado con debounce del blob principal.
 */
export interface FocusSession {
  id: string
  /** Timestamp ISO real de inicio — la duración se deriva de timestamps, nunca de un contador. */
  startedAt: string
  /** Timestamp ISO de cuándo terminó (completó su duración o se detuvo). */
  completedAt: string
  plannedMinutes: number
  type: FocusSessionType
  status: FocusSessionStatus
  /** Referencia por id a un `PlannerItem` del día — sin denormalizar, puede quedar huérfana. */
  linkedPlannerItemId?: string
}

/** Copia congelada de la categoría al momento del snapshot — mismo criterio que
 * `GoalSnapshot`: si la categoría se renombra o se borra después, el historial
 * de la rueda no cambia retroactivamente. */
export interface LifeWheelAreaScore {
  categoryId: string
  categoryName: string
  /** Puntaje 1-10. */
  score: number
}

/**
 * Snapshot de la Rueda de la vida en una fecha dada: un puntaje 1-10 por cada
 * categoría vigente en ese momento. Las áreas son las `Category` reales del
 * usuario (no una lista fija de áreas genéricas), para que la rueda refleje
 * las mismas categorías que ya usa en el resto de la app.
 */
export interface LifeWheelSnapshot {
  id: string
  /** Fecha local YYYY-MM-DD del snapshot. */
  date: string
  areas: LifeWheelAreaScore[]
  notes?: string
  createdAt: string
}

export interface Settings {
  appName: string
  /** Porcentaje mínimo para que un día cuente en la racha. */
  streakThreshold: number
  /** Permite corregir días anteriores. Por defecto false. */
  allowEditingPastDays: boolean
  /** Fecha de nacimiento (YYYY-MM-DD), para Momento Mori. Opcional. */
  birthDate?: string
  /** Expectativa de vida estimada en años, para Momento Mori. Opcional. */
  lifeExpectancyYears?: number
}

/**
 * Respuesta a una consigna de reflexión en una fecha dada. Pensada para
 * reusarse tanto en Momento Mori como en una futura reflexión diaria — no es
 * exclusiva de ningún módulo, por eso vive suelta y no anidada en `Settings`
 * ni en ninguna otra entidad.
 */
export interface Reflection {
  id: string
  /** Fecha local YYYY-MM-DD en la que se escribió. */
  date: string
  prompt: string
  answer: string
  createdAt: string
}

/** Nota libre de texto, sin consigna fija — distinta de `Reflection` (que
 * siempre responde a una pregunta predefinida de Momento Mori o de la
 * Revisión mensual). Editable, a diferencia de `Reflection`. */
export interface Note {
  id: string
  /** Fecha local YYYY-MM-DD en la que se escribió. */
  date: string
  title?: string
  body: string
  createdAt: string
}

export interface AppData {
  /** Versión del esquema, para migraciones futuras. */
  version: number
  settings: Settings
  categories: Category[]
  goals: Goal[]
  /** Historial indexado por fecha (YYYY-MM-DD). */
  days: Record<string, DayRecord>
  /** Objetivos semanales/mensuales, indexados por `${period}:${periodStart}`. */
  periods: Record<string, PeriodRecord>
  /** Metas de largo plazo (personales/profesionales). */
  lifeGoals: LifeGoal[]
  /** Ítems del planificador semanal (tareas/eventos por día). */
  plannerItems: PlannerItem[]
  /** Rutinas (rituales con pasos ordenados). */
  routines: Routine[]
  /** Ejecuciones por rutina y día, indexadas por `${routineId}:${date}`. */
  routineRuns: Record<string, RoutineRun>
  /** Snapshots de la Rueda de la vida a lo largo del tiempo. */
  lifeWheelSnapshots: LifeWheelSnapshot[]
  /** Reflexiones (Momento Mori y futuros usos). */
  reflections: Reflection[]
  /** Proyectos (agrupan tareas propias, sin fecha). */
  projects: Project[]
  /** Tarjetas de los tableros Kanban, una por proyecto. */
  projectTasks: ProjectTask[]
  /** Notas libres de texto, sin consigna fija. */
  notes: Note[]
}

export const SCHEMA_VERSION = 10

/**
 * Plan comercial del usuario (`profiles.plan` en Supabase). Todavía sin cobros ni
 * límites reales — vive fuera de `AppData` a propósito, igual criterio que
 * `FocusSession`: no es parte del blob que puntúa/trackea progreso, es un dato
 * de cuenta que se lee aparte (ver `ProgressRepository.getUserPlan`).
 */
export type UserPlan = 'free' | 'premium'
