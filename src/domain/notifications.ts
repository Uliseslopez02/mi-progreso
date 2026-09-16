/**
 * Sistema de notificaciones inteligentes: tipos base + contexto de usuario +
 * mensajes de plantilla (sin IA). La IA (ver `notificationAi.ts`) sólo puede
 * reemplazar el `title`/`body` de la notificación de mayor prioridad del día,
 * nunca decide *si* algo se notifica ni inventa datos: eso lo hace este
 * archivo + `achievements.ts` + `notificationEngine.ts`, siempre a partir de
 * números reales ya calculados por `scoring.ts`/`consistency.ts`.
 */
import { addDays, diffDays, startOfWeek, type DateKey } from './date'
import { aggregate, computeDayStats, computeStreak, weekSummary } from './scoring'
import type { AppData } from './types'

export type NotificationType =
  | 'achievement'
  | 'streak_milestone'
  | 'streak_risk'
  | 'goal_close'
  | 'motivation_positive'
  | 'motivation_comeback'
  | 'recap_weekly'
  | 'reminder_morning'

export type NotificationCategory = 'achievements' | 'streaks' | 'motivation' | 'reminders'

/** Menor = más importante. Ver prompt original: LOGRO > RIESGO DE RACHA >
 * OBJETIVO IMPORTANTE > MOTIVACIÓN > RECORDATORIO. */
export const PRIORITY: Record<NotificationType, number> = {
  achievement: 1,
  streak_milestone: 1,
  streak_risk: 2,
  goal_close: 3,
  motivation_positive: 4,
  motivation_comeback: 4,
  recap_weekly: 4,
  reminder_morning: 5,
}

export function categoryForType(type: NotificationType): NotificationCategory {
  switch (type) {
    case 'achievement':
    case 'streak_milestone':
      return 'achievements'
    case 'streak_risk':
      return 'streaks'
    case 'goal_close':
      return 'reminders'
    case 'reminder_morning':
      return 'reminders'
    default:
      return 'motivation'
  }
}

export interface AppNotification {
  id: string
  type: NotificationType
  category: NotificationCategory
  priority: number
  title: string
  body: string
  /** Ruta dentro de la app a la que navega al tocarla (ej. "/objetivos/habitos"). */
  actionPath?: string
  /** Clave estable para deduplicar (ver `notificationEngine.ts`). Nunca se muestra. */
  dedupKey: string
  /** true si el título/cuerpo fueron redactados por la IA (ver `notificationAi.ts`). */
  aiPhrased: boolean
  /** Datos internos del logro/regla que la generó (ej. `{ achievementId, goalId }`). Nunca se muestra. */
  metadata?: Record<string, unknown>
  createdAt: string
  readAt: string | null
}

export interface NotificationPreferences {
  enabled: boolean
  achievements: boolean
  streaks: boolean
  motivation: boolean
  reminders: boolean
  pushEnabled: boolean
  /** Hora local (0-23) desde la que no se manda push. */
  quietHoursStart: number
  /** Hora local (0-23) hasta la que no se manda push. */
  quietHoursEnd: number
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: true,
  achievements: true,
  streaks: true,
  motivation: true,
  reminders: true,
  pushEnabled: false,
  quietHoursStart: 22,
  quietHoursEnd: 8,
}

/** true si `hour` (0-23) cae dentro de la ventana de silencio (puede cruzar medianoche). */
export function isQuietHour(hour: number, prefs: NotificationPreferences): boolean {
  const { quietHoursStart: start, quietHoursEnd: end } = prefs
  if (start === end) return false
  if (start < end) return hour >= start && hour < end
  return hour >= start || hour < end
}

export type Trend = 'positiva' | 'estable' | 'descendente'
export type ActivityLevel = 'alto' | 'medio' | 'bajo'

/**
 * Contexto compacto derivado 100% de datos ya calculados (nunca inventa
 * números). Es lo único que viaja a la IA (ver `notificationAi.ts`) — chico a
 * propósito, para latencia/costo, y porque no hace falta más para redactar un
 * mensaje.
 */
export interface UserContext {
  today: DateKey
  todayPercent: number
  todayGoalsCompleted: number
  todayGoalsTotal: number
  weekAverage: number
  weekDelta: number | null
  currentStreak: number
  bestStreakEver: number
  isNewBestStreak: boolean
  trend: Trend
  activityLevel: ActivityLevel
  activeHabitsCount: number
  lowActivityDays7: number
  riskOfLosingStreak: boolean
  needsMotivation: boolean
  needsRecognition: boolean
}

/** Últimos 7 días con registro previos a hoy, para nivel de actividad/tendencia. */
function recentWindow(today: DateKey, days: number): DateKey[] {
  const from = addDays(today, -(days - 1))
  const out: DateKey[] = []
  for (let k = from; diffDays(k, today) >= 0; k = addDays(k, 1)) out.push(k)
  return out
}

export function buildUserContext(data: AppData, today: DateKey): UserContext {
  const threshold = data.settings.streakThreshold
  const todayStats = computeDayStats(data.days[today])
  const week = weekSummary(data.days, today, threshold)
  const currentStreak = computeStreak(data.days, today, threshold)

  // Mejor racha histórica: recorre todo el historial guardado (acotado por la
  // retención del plan), igual costo que goalStreaks — no hace falta cachear.
  let bestStreakEver = currentStreak
  let running = 0
  for (const key of Object.keys(data.days).sort()) {
    const percent = computeDayStats(data.days[key]).percent
    if (percent >= threshold) {
      running += 1
      bestStreakEver = Math.max(bestStreakEver, running)
    } else {
      running = 0
    }
  }

  const last7 = recentWindow(addDays(today, -1), 7)
  const last7Stats = aggregate(data.days, last7)
  const lowActivityDays7 = last7.filter((k) => computeDayStats(data.days[k]).percent < 40).length

  const trend: Trend =
    week.delta === null ? 'estable' : week.delta > 8 ? 'positiva' : week.delta < -8 ? 'descendente' : 'estable'

  const activityLevel: ActivityLevel =
    last7Stats.average >= 70 ? 'alto' : last7Stats.average >= 40 ? 'medio' : 'bajo'

  const activeHabitsCount = data.goals.filter((g) => g.trackingKind === 'habit' && g.active).length

  return {
    today,
    todayPercent: todayStats.percent,
    todayGoalsCompleted: todayStats.completedCount,
    todayGoalsTotal: todayStats.totalCount,
    weekAverage: week.average,
    weekDelta: week.delta,
    currentStreak,
    bestStreakEver,
    isNewBestStreak: currentStreak > 0 && currentStreak >= bestStreakEver,
    trend,
    activityLevel,
    activeHabitsCount,
    lowActivityDays7,
    riskOfLosingStreak: currentStreak > 0 && todayStats.percent < threshold,
    needsMotivation: trend === 'descendente' || lowActivityDays7 >= 4,
    needsRecognition: trend === 'positiva' || currentStreak >= 7,
  }
}

/** "2026-W38" — para deduplicar el resumen semanal una vez por semana. */
export function isoWeekKey(today: DateKey): string {
  const monday = startOfWeek(today)
  return `week:${monday}`
}

/** "Ahora" / "Hace 12 min" / "Hace 3 h" / "Hace 2 d" — para el centro de notificaciones. */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const diffMs = now.getTime() - new Date(iso).getTime()
  const minutes = Math.round(diffMs / 60_000)
  if (minutes < 1) return 'Ahora'
  if (minutes < 60) return `Hace ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `Hace ${hours} h`
  const days = Math.round(hours / 24)
  return `Hace ${days} d`
}

const TYPE_ICON: Record<NotificationType, string> = {
  achievement: '🏆',
  streak_milestone: '🔥',
  streak_risk: '🔥',
  goal_close: '🎯',
  motivation_positive: '✨',
  motivation_comeback: '💬',
  recap_weekly: '📊',
  reminder_morning: '📋',
}

export function iconForType(type: NotificationType): string {
  return TYPE_ICON[type] ?? '🔔'
}
