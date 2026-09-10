/**
 * Límites del plan Free vs Premium (freemium). Fuente única de verdad para el
 * frontend — el backend replica los números contables en
 * `supabase/migrations/0024_plan_limits.sql` (mantener sincronizados).
 *
 * Principio (ver `CONTEXTO_FREEMIUM.md`):
 * - Free = rastreador completo para una etapa enfocada de la vida.
 * - Premium = todas las áreas sin límite + profundidad histórica + IA.
 * - El límite bloquea SÓLO "crear de más". Nunca oculta, borra ni deshabilita
 *   lo que ya existe (grandfathering): un usuario con 11 objetivos y límite 5
 *   sigue viendo y editando sus 11; al intentar agregar el 12.º ve el aviso.
 * - Los muros aparecen sólo al intentar la acción, con copy de valor.
 */
import type { Goal, GoalPeriod, LifeGoal, Note, Project, Routine, UserPlan } from './types'

export type CountLimitKey =
  | 'dailyGoals'
  | 'weeklyGoals'
  | 'monthlyGoals'
  | 'habits'
  | 'activeLifeGoals'
  | 'activeProjects'
  | 'routines'
  | 'notes'
  | 'categories'

/** Todo lo que puede disparar un aviso de upgrade (contables + de profundidad). */
export type LimitKey = CountLimitKey | 'historyRange' | 'yearMap' | 'advancedReport' | 'plannerWeeks'

export interface PlanLimits {
  dailyGoals: number
  weeklyGoals: number
  monthlyGoals: number
  habits: number
  activeLifeGoals: number
  activeProjects: number
  routines: number
  notes: number
  categories: number
  /** Semanas hacia adelante, además de la actual, que el planificador deja abrir. */
  plannerWeeksAhead: number
}

/** Tope técnico silencioso para Premium: evita que el blob de guardado crezca
 * sin control por error o abuso. NUNCA se comunica como límite. */
const SOFT_CAP = 100

export const PLAN_LIMITS: Record<UserPlan, PlanLimits> = {
  free: {
    dailyGoals: 5,
    weeklyGoals: 2,
    monthlyGoals: 2,
    habits: 5,
    activeLifeGoals: 3,
    activeProjects: 2,
    routines: 2,
    notes: 15,
    categories: 8,
    plannerWeeksAhead: 1,
  },
  premium: {
    dailyGoals: SOFT_CAP,
    weeklyGoals: SOFT_CAP,
    monthlyGoals: SOFT_CAP,
    habits: SOFT_CAP,
    activeLifeGoals: SOFT_CAP,
    activeProjects: SOFT_CAP,
    routines: SOFT_CAP,
    notes: SOFT_CAP * 20,
    categories: SOFT_CAP,
    plannerWeeksAhead: Number.POSITIVE_INFINITY,
  },
}

export function limitFor(plan: UserPlan, key: CountLimitKey): number {
  return PLAN_LIMITS[plan][key]
}

/** true si, con `currentCount` elementos, este plan ya no deja crear uno más. */
export function isAtLimit(plan: UserPlan, key: CountLimitKey, currentCount: number): boolean {
  return currentCount >= limitFor(plan, key)
}

/** Cuánto falta para el límite (para el contador tenue de las cabeceras). */
export function remainingFor(plan: UserPlan, key: CountLimitKey, currentCount: number): number {
  return Math.max(0, limitFor(plan, key) - currentCount)
}

/** true si conviene mostrar el contador `n / max` en la cabecera: sólo Free y
 * sólo a partir del 80 % del límite, para no generar ansiedad antes de tiempo. */
export function shouldShowCounter(plan: UserPlan, key: CountLimitKey, currentCount: number): boolean {
  if (plan !== 'free') return false
  const limit = limitFor(plan, key)
  if (!Number.isFinite(limit)) return false
  return currentCount >= Math.ceil(limit * 0.8)
}

// ---------- Contadores puros sobre AppData ----------

const isScoringGoal = (g: Goal) => (g.trackingKind ?? 'goal') !== 'habit'

export function countGoalsByPeriod(goals: Goal[], period: GoalPeriod): number {
  return goals.filter((g) => isScoringGoal(g) && g.period === period).length
}

export function countDailyGoals(goals: Goal[]): number {
  return countGoalsByPeriod(goals, 'daily')
}

export function countHabits(goals: Goal[]): number {
  return goals.filter((g) => (g.trackingKind ?? 'goal') === 'habit').length
}

export function countActiveLifeGoals(lifeGoals: LifeGoal[]): number {
  return lifeGoals.filter((g) => g.status === 'active').length
}

export function countActiveProjects(projects: Project[]): number {
  return projects.filter((p) => p.status === 'active').length
}

export function countRoutines(routines: Routine[]): number {
  return routines.length
}

export function countNotes(notes: Note[]): number {
  return notes.length
}

/** Mapea el `period` de un objetivo a su clave de límite. */
export function goalPeriodLimitKey(period: GoalPeriod): CountLimitKey {
  if (period === 'weekly') return 'weeklyGoals'
  if (period === 'monthly') return 'monthlyGoals'
  return 'dailyGoals'
}

// ---------- Profundidad histórica / informes ----------

export const FREE_HISTORY_RANGES = [7, 14, 30] as const
export const PRO_HISTORY_RANGES = [7, 14, 30, 90, 365] as const

export function historyRangesFor(plan: UserPlan): number[] {
  return plan === 'premium' ? [...PRO_HISTORY_RANGES] : [...FREE_HISTORY_RANGES]
}

/** Un rango que existe para Premium pero no para Free (para el `ProBadge`). */
export function isProHistoryRange(range: number): boolean {
  return !FREE_HISTORY_RANGES.includes(range as (typeof FREE_HISTORY_RANGES)[number])
}

/** Semanas visibles del mapa anual (heatmap). Free ve ~un trimestre; Premium el año. */
export const FREE_YEAR_MAP_WEEKS = 13
export function yearMapWeeksFor(plan: UserPlan, fullYearWeeks: number): number {
  return plan === 'premium' ? fullYearWeeks : FREE_YEAR_MAP_WEEKS
}

/** Métricas avanzadas del informe mensual (comparaciones y desgloses). */
export function showsAdvancedReport(plan: UserPlan): boolean {
  return plan === 'premium'
}

// ---------- Planificador ----------

/** true si este plan deja abrir la semana que empieza `weekStartKey`. Se puede
 * navegar libremente al pasado; hacia adelante, hasta `plannerWeeksAhead`. */
export function canOpenPlannerWeek(plan: UserPlan, weeksFromCurrent: number): boolean {
  if (weeksFromCurrent <= 0) return true
  return weeksFromCurrent <= PLAN_LIMITS[plan].plannerWeeksAhead
}

// ---------- Copy de los avisos ----------

export interface UpgradeCopy {
  title: string
  body: string
}

/** Nombre visible del plan pago (ver decisión en `CONTEXTO_FREEMIUM.md`). */
export const PRO_NAME = 'Premium'

export const LIMIT_COPY: Record<LimitKey, UpgradeCopy> = {
  dailyGoals: {
    title: 'Llegaste a 5 objetivos diarios',
    body: `Es un buen número para mantener el foco. Cuando quieras organizar más áreas de tu día —trabajo, estudio, entrenamiento— ${PRO_NAME} te deja sumar todos los que necesites.`,
  },
  weeklyGoals: {
    title: 'Llegaste a 2 objetivos semanales',
    body: `Con ${PRO_NAME} podés armar todos los objetivos semanales que quieras, además de los diarios y mensuales.`,
  },
  monthlyGoals: {
    title: 'Llegaste a 2 objetivos mensuales',
    body: `Con ${PRO_NAME} sumás objetivos mensuales sin límite para planificar tramos más largos.`,
  },
  habits: {
    title: 'Llegaste a 5 hábitos',
    body: `Cinco hábitos a la vez ya es bastante para sostener. Cuando quieras armar un sistema más completo, ${PRO_NAME} te deja seguir sumando.`,
  },
  activeLifeGoals: {
    title: 'Tenés 3 metas activas',
    body: `Tres metas en paralelo mantienen el foco. Con ${PRO_NAME} podés perseguir todas las que quieras a la vez —y las que completás o pausás no ocupan lugar.`,
  },
  activeProjects: {
    title: 'Tenés 2 proyectos activos',
    body: `Con ${PRO_NAME} llevás todos los proyectos que necesites en paralelo. Los que archivás o completás no cuentan.`,
  },
  routines: {
    title: 'Llegaste a 2 rutinas',
    body: `Matutina y nocturna entran en el plan gratuito. Con ${PRO_NAME} sumás la de entrenamiento, la de trabajo y las que quieras.`,
  },
  notes: {
    title: 'Llegaste a 15 notas',
    body: `Con ${PRO_NAME} guardás notas sin límite. Tus notas actuales siguen todas acá.`,
  },
  categories: {
    title: 'Llegaste a 8 categorías',
    body: `Con ${PRO_NAME} organizás tus objetivos en todas las categorías que necesites.`,
  },
  historyRange: {
    title: 'Estás viendo los últimos 30 días',
    body: `Con ${PRO_NAME} ves tu progreso de los últimos 90 días y del último año completo. Tus datos ya están guardados —sólo se desbloquea la vista.`,
  },
  yearMap: {
    title: 'Estás viendo los últimos meses',
    body: `Con ${PRO_NAME} ves el mapa anual completo de cada hábito, semana por semana.`,
  },
  advancedReport: {
    title: 'Informe del mes',
    body: `${PRO_NAME} suma las métricas que comparan tu evolución: mejor día de la semana, categoría a reforzar, objetivo más difícil, planificado vs. realizado y el cambio respecto al mes anterior.`,
  },
  plannerWeeks: {
    title: 'Planificá más adelante con Premium',
    body: `El plan gratuito planifica la semana actual y la siguiente. Con ${PRO_NAME} organizás cualquier semana futura.`,
  },
}
