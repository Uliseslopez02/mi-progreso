/**
 * Motor de notificaciones: combina reglas duras (logros, rachas, objetivos
 * cerca de completarse) con mensajes de acompañamiento (motivación, resumen
 * semanal, recordatorio matutino), aplica anti-spam/prioridad, y devuelve
 * sólo lo que realmente debería notificarse ahora. Puro: mismo input, mismo
 * output — nada de esto depende de la IA (eso es una capa opcional encima,
 * ver `notificationAi.ts`).
 *
 * Prioridad (menor = más importante), ver `notifications.ts` `PRIORITY`:
 * logro > riesgo de racha > objetivo por cerrar > motivación/resumen > recordatorio.
 */
import { addDays, startOfWeek, toDateKey, weekDays, type DateKey } from './date.js'
import { detectAchievements } from './achievements.js'
import {
  buildUserContext,
  categoryForType,
  isoWeekKey,
  PRIORITY,
  type AppNotification,
  type NotificationPreferences,
  type NotificationType,
  type UserContext,
} from './notifications.js'
import type { AppData } from './types.js'

/** Notificación todavía sin persistir (sin id/createdAt/readAt/aiPhrased). */
export interface NotificationCandidate {
  type: NotificationType
  priority: number
  title: string
  body: string
  actionPath?: string
  dedupKey: string
  metadata?: Record<string, unknown>
}

/** Máximo de notificaciones nuevas por día/semana — evita el bombardeo. */
export const MAX_PER_DAY = 3
export const MAX_PER_WEEK = 10

function wasNotified(history: AppNotification[], dedupKey: string): boolean {
  return history.some((n) => n.dedupKey === dedupKey)
}

function countInRange(history: AppNotification[], keys: DateKey[]): number {
  const set = new Set(keys)
  return history.filter((n) => set.has(toDateKey(new Date(n.createdAt)))).length
}

function candidate(
  type: NotificationType,
  title: string,
  body: string,
  dedupKey: string,
  actionPath?: string,
  metadata?: Record<string, unknown>,
): NotificationCandidate {
  return { type, priority: PRIORITY[type], title, body, actionPath, dedupKey, metadata }
}

function motivationCandidate(ctx: UserContext, today: DateKey): NotificationCandidate | null {
  const dedupKey = `motivation:${today}`
  if (ctx.needsRecognition) {
    const body =
      ctx.currentStreak >= 3
        ? `${ctx.currentStreak} días seguidos. Hoy no hace falta nada extraordinario, solo sostener lo que ya construiste.`
        : `Esta semana promediás ${ctx.weekAverage}%${
            ctx.weekDelta !== null && ctx.weekDelta > 0 ? `, ${ctx.weekDelta} puntos más que la anterior` : ''
          }. Se nota.`
    return candidate('motivation_positive', 'Va en serio', body, dedupKey, '/historial')
  }
  if (ctx.needsMotivation) {
    const body =
      ctx.lowActivityDays7 >= 4
        ? 'Vinieron unos días más flojos. No pasa nada — mañana no hace falta recuperar todo, alcanza con una sola acción.'
        : 'Esta semana viene más floja que la anterior. Un solo objetivo cumplido hoy ya cambia la tendencia.'
    return candidate('motivation_comeback', 'Un día a la vez', body, dedupKey, '/')
  }
  return null
}

function streakRiskCandidate(ctx: UserContext, today: DateKey, hour: number): NotificationCandidate | null {
  if (!ctx.riskOfLosingStreak || hour < 18) return null
  return candidate(
    'streak_risk',
    'Tu racha sigue en juego',
    `Tu racha de ${ctx.currentStreak} día${ctx.currentStreak === 1 ? '' : 's'} está a una acción de continuar. Si todavía podés, hacela hoy.`,
    `streak-risk:${today}`,
    '/',
  )
}

function goalCloseCandidates(data: AppData, today: DateKey, hour: number): NotificationCandidate[] {
  if (hour < 17) return []
  const record = data.days[today]
  if (!record) return []
  const out: NotificationCandidate[] = []
  for (const goal of record.goals) {
    if ((goal.trackingKind ?? 'goal') === 'habit') continue
    if (goal.kind === 'boolean' || !goal.targetValue) continue
    const progress = Number(record.goalProgress[goal.goalId] ?? 0)
    const ratio = progress / goal.targetValue
    if (ratio < 0.5 || ratio >= 1) continue
    out.push(
      candidate(
        'goal_close',
        'Casi lo tenés',
        `Vas ${progress}/${goal.targetValue}${goal.unit ? ` ${goal.unit}` : ''} en "${goal.name}". Todavía tenés tiempo hoy para cerrarlo.`,
        `goal-close:${goal.goalId}:${today}`,
        '/',
        { goalId: goal.goalId },
      ),
    )
  }
  return out
}

function recapCandidate(data: AppData, today: DateKey, ctx: UserContext): NotificationCandidate | null {
  const isSunday = new Date(`${today}T12:00:00`).getDay() === 0
  if (!isSunday) return null
  const weekStart = startOfWeek(today)
  const daysWithRecord = weekDays(weekStart).filter((k) => data.days[k]).length
  if (daysWithRecord < 4) return null
  const trendText =
    ctx.weekDelta === null
      ? ''
      : ctx.weekDelta > 0
        ? ` (${ctx.weekDelta > 0 ? '+' : ''}${ctx.weekDelta} puntos vs. la semana anterior)`
        : ctx.weekDelta < 0
          ? ` (${ctx.weekDelta} puntos vs. la semana anterior)`
          : ''
  return candidate(
    'recap_weekly',
    'Así te fue esta semana',
    `Promediaste ${ctx.weekAverage}%${trendText}. Racha actual: ${ctx.currentStreak} día${ctx.currentStreak === 1 ? '' : 's'}.`,
    isoWeekKey(today),
    '/informes',
  )
}

function reminderMorningCandidate(ctx: UserContext, today: DateKey, hour: number): NotificationCandidate | null {
  if (hour >= 12 || ctx.todayGoalsTotal === 0 || ctx.todayGoalsCompleted >= ctx.todayGoalsTotal) return null
  return candidate(
    'reminder_morning',
    'Arranca por acá',
    `${ctx.todayGoalsTotal} objetivo${ctx.todayGoalsTotal === 1 ? '' : 's'} activo${ctx.todayGoalsTotal === 1 ? '' : 's'} hoy. El que más pesa, primero.`,
    `reminder:${today}`,
    '/',
  )
}

export interface EvaluateParams {
  data: AppData
  today: DateKey
  now: Date
  /** Historial reciente (alcanza con ~60 días) para deduplicar y contar cooldown. */
  history: AppNotification[]
  preferences: NotificationPreferences
}

/**
 * Devuelve las notificaciones nuevas a crear ahora mismo, ya deduplicadas,
 * priorizadas y acotadas por los topes diario/semanal. Puede devolver [].
 */
export function evaluateNotifications({ data, today, now, history, preferences }: EvaluateParams): NotificationCandidate[] {
  if (!preferences.enabled) return []

  const hour = now.getHours()
  const ctx = buildUserContext(data, today)

  const awardedIds = new Set(
    history.filter((n) => n.type === 'achievement' || n.type === 'streak_milestone').map((n) => n.metadata?.achievementId as string).filter(Boolean),
  )

  const achievementCandidates = detectAchievements(data, today, ctx, awardedIds).map((a) =>
    candidate(
      a.id.startsWith('streak-') ? 'streak_milestone' : 'achievement',
      a.title,
      a.body,
      `achievement:${a.id}`,
      a.actionPath,
      { achievementId: a.id },
    ),
  )

  const raw: NotificationCandidate[] = [
    ...achievementCandidates,
    streakRiskCandidate(ctx, today, hour),
    ...goalCloseCandidates(data, today, hour),
    motivationCandidate(ctx, today),
    recapCandidate(data, today, ctx),
    reminderMorningCandidate(ctx, today, hour),
  ].filter((c): c is NotificationCandidate => c !== null)

  const enabledByCategory = raw.filter((c) => preferences[categoryForType(c.type)])
  const notDuplicated = enabledByCategory.filter((c) => !wasNotified(history, c.dedupKey))
  const sorted = [...notDuplicated].sort((a, b) => a.priority - b.priority)

  const todayCount = countInRange(history, [today])
  const weekCount = countInRange(history, weekDays(startOfWeek(today)))
  const remainingDay = Math.max(0, MAX_PER_DAY - todayCount)
  const remainingWeek = Math.max(0, MAX_PER_WEEK - weekCount)
  const remaining = Math.min(remainingDay, remainingWeek)

  return sorted.slice(0, remaining)
}

/** Ventana de historial suficiente para dedup/cooldown (semanas + hitos recientes). */
export function historyWindowStart(today: DateKey): DateKey {
  return addDays(today, -60)
}
