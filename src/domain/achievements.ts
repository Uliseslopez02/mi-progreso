/**
 * Catálogo de logros — motor de REGLAS, no de IA: cada logro es una condición
 * objetiva sobre datos reales (nunca lo decide un modelo). Agregar un logro
 * nuevo es agregar una entrada a `STREAK_MILESTONES`/`CUMULATIVE_MILESTONES`
 * o una función a `detectAchievements` — no hace falta tocar el motor de
 * notificaciones ni la IA.
 *
 * Deduplicación: cada logro tiene un `id` estable. `notificationEngine.ts` no
 * vuelve a proponerlo si ya existe una notificación pasada con ese
 * `dedupKey` — así que un logro nunca se repite, sin necesitar una tabla de
 * estado aparte (la fuente de verdad es el propio historial de notificaciones).
 */
import { startOfWeek, type DateKey } from './date'
import { computeDayStats } from './scoring'
import type { AppData } from './types'
import type { UserContext } from './notifications'

export interface Achievement {
  id: string
  title: string
  body: string
  actionPath?: string
}

/** Días de racha que cuentan como hito (ver prompt: 3, 7, 14, 30, 50, 100...). */
const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100, 150, 200, 365]

/** Cortes de objetivos/hábitos completados en total (histórico acumulado). */
const CUMULATIVE_MILESTONES = [10, 50, 100, 250, 500, 1000]

function countCompletionsByKind(data: AppData, kind: 'goal' | 'habit'): number {
  let total = 0
  for (const record of Object.values(data.days)) {
    for (const goal of record.goals) {
      if ((goal.trackingKind ?? 'goal') !== kind) continue
      const value = record.goalProgress[goal.goalId]
      const done = goal.kind === 'boolean' ? !!value : goal.targetValue ? Number(value ?? 0) >= goal.targetValue : !!value
      if (done) total += 1
    }
  }
  return total
}

/** Promedio de % por semana (lunes de esa semana → promedio), sólo semanas con algún día registrado. */
function weeklyAverages(data: AppData): Map<DateKey, number> {
  const sums = new Map<DateKey, { sum: number; count: number }>()
  for (const [date, record] of Object.entries(data.days)) {
    const week = startOfWeek(date)
    const percent = computeDayStats(record).percent
    const acc = sums.get(week) ?? { sum: 0, count: 0 }
    acc.sum += percent
    acc.count += 1
    sums.set(week, acc)
  }
  const out = new Map<DateKey, number>()
  for (const [week, { sum, count }] of sums) out.set(week, Math.round(sum / count))
  return out
}

/** Mayor hito de `milestones` que sea ≤ `value` y no esté en `awarded`. */
function highestUnawardedMilestone(value: number, milestones: number[], awarded: Set<string>, prefix: string): number | null {
  const eligible = milestones.filter((m) => m <= value && !awarded.has(`${prefix}${m}`))
  return eligible.length > 0 ? Math.max(...eligible) : null
}

/**
 * Detecta todos los logros que aplican HOY y todavía no fueron otorgados.
 * `awardedIds` = `dedupKey` de logros ya notificados alguna vez (ver
 * `notificationEngine.ts`). Puede devolver más de uno el mismo día (p. ej.
 * racha de 7 días + primer objetivo) — el motor de prioridad/anti-spam decide
 * cuántos llegan a notificarse hoy.
 */
export function detectAchievements(data: AppData, today: DateKey, ctx: UserContext, awardedIds: Set<string>): Achievement[] {
  const out: Achievement[] = []

  const totalGoals = countCompletionsByKind(data, 'goal')
  const totalHabits = countCompletionsByKind(data, 'habit')

  if (totalGoals >= 1 && !awardedIds.has('first-goal')) {
    out.push({
      id: 'first-goal',
      title: 'Primer objetivo completado',
      body: 'Acabás de completar tu primer objetivo en Mi Progreso. Así arranca todo.',
      actionPath: '/',
    })
  }

  if (totalHabits >= 1 && !awardedIds.has('first-habit')) {
    out.push({
      id: 'first-habit',
      title: 'Primer hábito completado',
      body: 'Marcaste tu primer hábito. La próxima vez ya es una racha.',
      actionPath: '/objetivos/habitos',
    })
  }

  const streakMilestone = highestUnawardedMilestone(ctx.currentStreak, STREAK_MILESTONES, awardedIds, 'streak-')
  if (streakMilestone !== null) {
    out.push({
      id: `streak-${streakMilestone}`,
      title: `🔥 ${streakMilestone} días seguidos`,
      body:
        streakMilestone >= 30
          ? `Llevás ${streakMilestone} días de racha. Ya no es motivación, es un hábito construido.`
          : `${streakMilestone} días seguidos. Lo importante no fue hacerlo perfecto, fue volver a hacerlo cada día.`,
      actionPath: '/historial',
    })
  }

  const goalsMilestone = highestUnawardedMilestone(totalGoals, CUMULATIVE_MILESTONES, awardedIds, 'goals-total-')
  if (goalsMilestone !== null) {
    out.push({
      id: `goals-total-${goalsMilestone}`,
      title: `${goalsMilestone} objetivos completados`,
      body: `Ya completaste ${goalsMilestone} objetivos en total. Se nota la constancia.`,
      actionPath: '/historial',
    })
  }

  const habitsMilestone = highestUnawardedMilestone(totalHabits, CUMULATIVE_MILESTONES, awardedIds, 'habits-total-')
  if (habitsMilestone !== null) {
    out.push({
      id: `habits-total-${habitsMilestone}`,
      title: `${habitsMilestone} hábitos completados`,
      body: `Sumaste ${habitsMilestone} marcas de hábitos completados. Cada una construyó la siguiente.`,
      actionPath: '/objetivos/habitos',
    })
  }

  // Mejor racha personal: sólo si supera un récord anterior real (no la
  // primera vez que hay racha, para no premiar un streak de 1-2 días).
  if (ctx.isNewBestStreak && ctx.currentStreak >= 3 && !awardedIds.has(`best-streak-${ctx.currentStreak}`)) {
    out.push({
      id: `best-streak-${ctx.currentStreak}`,
      title: 'Nueva mejor racha personal',
      body: `${ctx.currentStreak} días es tu racha más larga hasta ahora. Superaste tu propio récord.`,
      actionPath: '/historial',
    })
  }

  // Mejor semana personal: sólo si hay al menos una semana previa real contra la que comparar.
  const weeklies = weeklyAverages(data)
  const currentWeekKey = startOfWeek(today)
  let priorBest: number | null = null
  for (const [week, avg] of weeklies) {
    if (week === currentWeekKey) continue
    if (priorBest === null || avg > priorBest) priorBest = avg
  }
  if (priorBest !== null && ctx.weekAverage > priorBest) {
    const id = `best-week-${currentWeekKey}`
    if (!awardedIds.has(id)) {
      out.push({
        id,
        title: 'Tu mejor semana personal',
        body: `Esta semana promediás ${ctx.weekAverage}%, tu mejor marca semanal hasta ahora (antes: ${priorBest}%).`,
        actionPath: '/informes',
      })
    }
  }

  // Metas de largo plazo recién completadas.
  for (const goal of data.lifeGoals) {
    if (goal.status !== 'completed') continue
    const id = `life-goal-${goal.id}`
    if (awardedIds.has(id)) continue
    out.push({
      id,
      title: 'Meta completada',
      body: `Completaste "${goal.name}". Vale la pena tomarte un segundo para reconocerlo.`,
      actionPath: '/proyectos',
    })
  }

  return out
}
