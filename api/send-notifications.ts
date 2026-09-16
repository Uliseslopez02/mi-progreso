import webpush from 'web-push'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { phraseNotification } from './_lib/phraseNotification.js'
import { evaluateNotifications, historyWindowStart } from '../src/domain/notificationEngine.js'
import { buildUserContext, categoryForType, isQuietHour } from '../src/domain/notifications.js'
import type { AppNotification, NotificationPreferences } from '../src/domain/notifications.js'
import { toDateKey } from '../src/domain/date.js'
import { SCHEMA_VERSION } from '../src/domain/types.js'
import type { AppData, DayRecord, LifeGoal } from '../src/domain/types.js'

/**
 * Cron de push real (ver vercel.json). Corre server-side, sin sesión de
 * usuario: lee con la service-role key (bypassa RLS a propósito, sólo acá) y
 * reusa el MISMO motor de reglas que corre en el cliente
 * (`src/domain/notificationEngine.ts`) para que una notificación por push
 * nunca pueda decidir algo distinto de lo que el centro de notificaciones
 * in-app mostraría — ver el mismo principio en habit-insights.ts.
 *
 * Node (no Edge): firmar VAPID con `web-push` necesita el módulo `crypto` de
 * Node, que el runtime Edge de Vercel no expone.
 *
 * Límite conocido: `DateKey`/"hoy" son siempre el día calendario LOCAL del
 * usuario (ver domain/date.ts) — pero acá, sin sesión de usuario ni huso
 * horario guardado en `Settings`, no hay forma de saber la zona horaria real
 * de cada cuenta. Se asume Argentina (UTC-3), el huso horario real de la
 * base de usuarios actual. Si la app se usa fuera de esa zona, esto corre
 * “corrido” un rato respecto a la medianoche real de esa persona — no rompe
 * nada (el motor sigue siendo correcto), simplemente el amanecer/atardecer
 * asumido no coincide exactamente. Guardar un huso horario real en Settings
 * es la mejora natural si esto se vuelve un problema.
 */
export const config = { maxDuration: 60 }

const ASSUMED_TZ_OFFSET_HOURS = -3
const MAX_USERS_PER_RUN = 300
const CONCURRENCY = 8

function assumedNow(): Date {
  const utc = new Date()
  return new Date(utc.getTime() + ASSUMED_TZ_OFFSET_HOURS * 60 * 60 * 1000)
}

interface SupaConfig {
  url: string
  serviceKey: string
}

async function supaFetch(cfg: SupaConfig, path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${cfg.url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: cfg.serviceKey,
      authorization: `Bearer ${cfg.serviceKey}`,
      'content-type': 'application/json',
      ...init.headers,
    },
  })
}

async function supaGet<T>(cfg: SupaConfig, path: string): Promise<T[]> {
  const res = await supaFetch(cfg, path)
  if (!res.ok) {
    console.error('[send-notifications] GET falló', path, res.status, await res.text())
    return []
  }
  return (await res.json()) as T[]
}

interface PreferenceRow {
  user_id: string
  enabled: boolean
  achievements: boolean
  streaks: boolean
  motivation: boolean
  reminders: boolean
  push_enabled: boolean
  quiet_hours_start: number
  quiet_hours_end: number
}

function toPreferences(row: PreferenceRow): NotificationPreferences {
  return {
    enabled: row.enabled,
    achievements: row.achievements,
    streaks: row.streaks,
    motivation: row.motivation,
    reminders: row.reminders,
    pushEnabled: row.push_enabled,
    quietHoursStart: row.quiet_hours_start,
    quietHoursEnd: row.quiet_hours_end,
  }
}

interface DayRow {
  date: string
  goals: DayRecord['goals']
  goal_progress: DayRecord['goalProgress']
  closed: boolean
}

interface LifeGoalRow {
  id: string
  name: string
  description: string | null
  category_id: string | null
  scope: LifeGoal['scope']
  priority: LifeGoal['priority']
  target_date: string | null
  progress: number
  status: LifeGoal['status']
  sub_goals: LifeGoal['subGoals']
  linked_habit_ids: string[]
  order_index: number
  created_at: string
  kind?: LifeGoal['kind']
  current_value?: number
  target_value?: number
  unit?: string
  milestones?: LifeGoal['milestones']
}

interface SettingsRow {
  streak_threshold: number
}

interface NotificationRow {
  id: string
  type: AppNotification['type']
  category: AppNotification['category']
  priority: number
  title: string
  body: string
  action_path: string | null
  dedup_key: string
  ai_phrased: boolean
  created_at: string
  read_at: string | null
}

interface SubscriptionRow {
  id: string
  endpoint: string
  p256dh: string
  auth_key: string
}

/** Arma un AppData mínimo (sólo lo que el motor de reglas realmente lee) a partir de las tablas normalizadas. */
async function loadUserAppData(cfg: SupaConfig, userId: string, today: string): Promise<AppData> {
  const since = historyWindowStart(today)
  const [settingsRows, dayRows, lifeGoalRows] = await Promise.all([
    supaGet<SettingsRow>(cfg, `user_settings?select=streak_threshold&user_id=eq.${userId}`),
    supaGet<DayRow>(cfg, `day_records?select=date,goals,goal_progress,closed&user_id=eq.${userId}&date=gte.${since}`),
    supaGet<LifeGoalRow>(cfg, `life_goals?select=*&user_id=eq.${userId}`),
  ])

  const days: AppData['days'] = {}
  for (const row of dayRows) {
    days[row.date] = { date: row.date, goals: row.goals ?? [], goalProgress: row.goal_progress ?? {}, closed: row.closed }
  }

  const lifeGoals: LifeGoal[] = lifeGoalRows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    categoryId: row.category_id ?? undefined,
    scope: row.scope,
    priority: row.priority,
    targetDate: row.target_date ?? undefined,
    progress: row.progress,
    status: row.status,
    subGoals: row.sub_goals ?? [],
    linkedHabitIds: row.linked_habit_ids ?? [],
    order: row.order_index,
    createdAt: row.created_at,
    kind: row.kind,
    currentValue: row.current_value,
    targetValue: row.target_value,
    unit: row.unit,
    milestones: row.milestones ?? [],
  }))

  return {
    version: SCHEMA_VERSION,
    settings: {
      appName: 'Mi Progreso',
      streakThreshold: settingsRows[0]?.streak_threshold ?? 70,
      allowEditingPastDays: false,
    },
    categories: [],
    goals: [],
    days,
    periods: {},
    lifeGoals,
    plannerItems: [],
    routines: [],
    routineRuns: {},
    reflections: [],
    projects: [],
    projectTasks: [],
    notes: [],
  }
}

function toAppNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    type: row.type,
    category: row.category,
    priority: row.priority,
    title: row.title,
    body: row.body,
    actionPath: row.action_path ?? undefined,
    dedupKey: row.dedup_key,
    aiPhrased: row.ai_phrased,
    createdAt: row.created_at,
    readAt: row.read_at,
  }
}

async function insertNotification(cfg: SupaConfig, userId: string, notification: AppNotification): Promise<void> {
  const res = await supaFetch(cfg, 'notifications', {
    method: 'POST',
    body: JSON.stringify({
      id: notification.id,
      user_id: userId,
      type: notification.type,
      category: notification.category,
      priority: notification.priority,
      title: notification.title,
      body: notification.body,
      action_path: notification.actionPath ?? null,
      dedup_key: notification.dedupKey,
      ai_phrased: notification.aiPhrased,
      metadata: notification.metadata ?? {},
      created_at: notification.createdAt,
    }),
  })
  if (!res.ok) console.error('[send-notifications] no se pudo insertar la notificación', await res.text())
}

async function deleteDeadSubscription(cfg: SupaConfig, id: string): Promise<void> {
  await supaFetch(cfg, `push_subscriptions?id=eq.${id}`, { method: 'DELETE' })
}

async function sendPushToUser(cfg: SupaConfig, subscriptions: SubscriptionRow[], payload: string): Promise<void> {
  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
          payload,
        )
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode
        if (statusCode === 404 || statusCode === 410) {
          await deleteDeadSubscription(cfg, sub.id)
        } else {
          console.error('[send-notifications] fallo al enviar push', statusCode, err)
        }
      }
    }),
  )
}

async function processUser(cfg: SupaConfig, apiKey: string | undefined, pref: PreferenceRow, now: Date): Promise<void> {
  const preferences = toPreferences(pref)
  const hour = now.getHours()
  if (isQuietHour(hour, preferences)) return

  const today = toDateKey(now)
  const [data, notificationRows, subscriptionRows] = await Promise.all([
    loadUserAppData(cfg, pref.user_id, today),
    supaGet<NotificationRow>(
      cfg,
      `notifications?select=*&user_id=eq.${pref.user_id}&created_at=gte.${historyWindowStart(today)}&order=created_at.desc&limit=200`,
    ),
    supaGet<SubscriptionRow>(cfg, `push_subscriptions?select=id,endpoint,p256dh,auth_key&user_id=eq.${pref.user_id}`),
  ])
  if (subscriptionRows.length === 0) return

  const history = notificationRows.map(toAppNotification)
  const candidates = evaluateNotifications({ data, today, now, history, preferences })
  if (candidates.length === 0) return

  const [top, ...rest] = candidates
  const alreadyAiToday = history.some((n) => n.aiPhrased && toDateKey(new Date(n.createdAt)) === today)

  let topTitle = top.title
  let topBody = top.body
  let topAiPhrased = false
  if (!alreadyAiToday && apiKey) {
    const ctx = buildUserContext(data, today)
    const phrased = await phraseNotification(apiKey, top.type, ctx, top.title, top.body)
    if (phrased) {
      topTitle = phrased.title
      topBody = phrased.body
      topAiPhrased = true
    }
  }

  const createdAt = now.toISOString()
  const created: AppNotification[] = [
    {
      id: crypto.randomUUID(),
      type: top.type,
      category: categoryForType(top.type),
      priority: top.priority,
      title: topTitle,
      body: topBody,
      actionPath: top.actionPath,
      dedupKey: top.dedupKey,
      aiPhrased: topAiPhrased,
      metadata: top.metadata,
      createdAt,
      readAt: null,
    },
    ...rest.map(
      (c): AppNotification => ({
        id: crypto.randomUUID(),
        type: c.type,
        category: categoryForType(c.type),
        priority: c.priority,
        title: c.title,
        body: c.body,
        actionPath: c.actionPath,
        dedupKey: c.dedupKey,
        aiPhrased: false,
        metadata: c.metadata,
        createdAt,
        readAt: null,
      }),
    ),
  ]

  await Promise.all(created.map((n) => insertNotification(cfg, pref.user_id, n)))

  // Un solo push por corrida (la de mayor prioridad) — el resto queda en el
  // centro de notificaciones para cuando abra la app. Evita que alguien con
  // varios logros el mismo día reciba una ráfaga de pushes seguidos.
  await sendPushToUser(cfg, subscriptionRows, JSON.stringify({ title: topTitle, body: topBody, url: top.actionPath ?? '/' }))
}

async function runInBatches<T>(items: T[], size: number, fn: (item: T) => Promise<void>): Promise<void> {
  for (let i = 0; i < items.length; i += size) {
    await Promise.allSettled(items.slice(i, i + size).map(fn))
  }
}

export default async function handler(request: VercelRequest, response: VercelResponse): Promise<void> {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.authorization
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    response.status(401).json({ error: 'No autorizado.' })
    return
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
  const vapidSubject = process.env.VAPID_SUBJECT
  if (!supabaseUrl || !serviceKey || !vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    console.error('[send-notifications] faltan variables de entorno (Supabase service role o VAPID)')
    response.status(503).json({ error: 'Servicio no configurado.' })
    return
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
  const cfg: SupaConfig = { url: supabaseUrl, serviceKey }
  const apiKey = process.env.ANTHROPIC_API_KEY

  const eligible = await supaGet<PreferenceRow>(
    cfg,
    `notification_preferences?select=*&enabled=eq.true&push_enabled=eq.true&limit=${MAX_USERS_PER_RUN}`,
  )

  const now = assumedNow()
  let processed = 0
  await runInBatches(eligible, CONCURRENCY, async (pref) => {
    try {
      await processUser(cfg, apiKey, pref, now)
      processed += 1
    } catch (err) {
      console.error('[send-notifications] fallo procesando usuario', pref.user_id, err)
    }
  })

  response.status(200).json({ eligible: eligible.length, processed })
}
