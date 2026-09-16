import { describe, expect, it } from 'vitest'
import { addDays } from '../domain/date'
import { createEmptyData } from '../domain/defaults'
import { evaluateNotifications, MAX_PER_DAY } from '../domain/notificationEngine'
import { DEFAULT_NOTIFICATION_PREFERENCES } from '../domain/notifications'
import type { AppNotification, NotificationPreferences, NotificationType } from '../domain/notifications'
import type { AppData, DayRecord, GoalSnapshot, TrackingKind } from '../domain/types'

const TODAY = '2026-09-16' // miércoles

function goalSnapshot(id: string, trackingKind: TrackingKind = 'goal'): GoalSnapshot {
  return { goalId: id, name: `Objetivo ${id}`, categoryId: 'cat', categoryName: 'Categoría', weight: 1, kind: 'boolean', trackingKind }
}

function day(done: boolean, trackingKind: TrackingKind = 'goal'): Omit<DayRecord, 'date'> {
  return { goals: [goalSnapshot('g1', trackingKind)], goalProgress: done ? { g1: true } : {}, closed: true }
}

function base(): AppData {
  return createEmptyData('2026-01-01T00:00:00.000Z')
}

function hourOf(hour: number): Date {
  return new Date(2026, 8, 16, hour, 0, 0)
}

function notification(overrides: Partial<AppNotification> & { type: NotificationType; dedupKey: string }): AppNotification {
  return {
    id: overrides.id ?? `n-${overrides.dedupKey}`,
    category: 'motivation',
    priority: 5,
    title: 't',
    body: 'b',
    aiPhrased: false,
    createdAt: `${TODAY}T10:00:00.000Z`,
    readAt: null,
    ...overrides,
  }
}

describe('evaluateNotifications', () => {
  it('no devuelve nada si las notificaciones están desactivadas', () => {
    const data = { ...base(), days: { [TODAY]: { date: TODAY, ...day(true) } } }
    const result = evaluateNotifications({
      data,
      today: TODAY,
      now: hourOf(10),
      history: [],
      preferences: { ...DEFAULT_NOTIFICATION_PREFERENCES, enabled: false },
    })
    expect(result).toEqual([])
  })

  it('genera el logro de primer objetivo completado la primera vez', () => {
    const data = { ...base(), days: { [TODAY]: { date: TODAY, ...day(true) } } }
    const result = evaluateNotifications({
      data,
      today: TODAY,
      now: hourOf(10),
      history: [],
      preferences: DEFAULT_NOTIFICATION_PREFERENCES,
    })
    expect(result.some((c) => c.dedupKey === 'achievement:first-goal')).toBe(true)
  })

  it('no repite un logro que ya está en el historial (deduplicación)', () => {
    const data = { ...base(), days: { [TODAY]: { date: TODAY, ...day(true) } } }
    const history = [notification({ type: 'achievement', dedupKey: 'achievement:first-goal', category: 'achievements', priority: 1 })]
    const result = evaluateNotifications({ data, today: TODAY, now: hourOf(10), history, preferences: DEFAULT_NOTIFICATION_PREFERENCES })
    expect(result.some((c) => c.dedupKey === 'achievement:first-goal')).toBe(false)
  })

  it('respeta las preferencias por categoría: logros apagados no aparecen', () => {
    const data = { ...base(), days: { [TODAY]: { date: TODAY, ...day(true) } } }
    const preferences: NotificationPreferences = { ...DEFAULT_NOTIFICATION_PREFERENCES, achievements: false }
    const result = evaluateNotifications({ data, today: TODAY, now: hourOf(10), history: [], preferences })
    expect(result.some((c) => c.type === 'achievement')).toBe(false)
  })

  it('no supera el tope diario aunque haya candidatos válidos de sobra', () => {
    const data = { ...base(), days: { [TODAY]: { date: TODAY, ...day(true) } } }
    const history = Array.from({ length: MAX_PER_DAY }, (_, i) =>
      notification({ type: 'motivation_positive', dedupKey: `filler-${i}`, createdAt: `${TODAY}T08:0${i}:00.000Z` }),
    )
    const result = evaluateNotifications({ data, today: TODAY, now: hourOf(10), history, preferences: DEFAULT_NOTIFICATION_PREFERENCES })
    expect(result).toEqual([])
  })

  it('avisa riesgo de perder la racha sólo a partir de la tarde/noche', () => {
    const days: AppData['days'] = {
      [addDays(TODAY, -1)]: { date: addDays(TODAY, -1), ...day(true) },
      [TODAY]: { date: TODAY, ...day(false) },
    }
    const data = { ...base(), days }

    const morning = evaluateNotifications({ data, today: TODAY, now: hourOf(9), history: [], preferences: DEFAULT_NOTIFICATION_PREFERENCES })
    expect(morning.some((c) => c.type === 'streak_risk')).toBe(false)

    const evening = evaluateNotifications({ data, today: TODAY, now: hourOf(19), history: [], preferences: DEFAULT_NOTIFICATION_PREFERENCES })
    expect(evening.some((c) => c.type === 'streak_risk')).toBe(true)
  })

  it('el recordatorio matutino sólo aparece a la mañana con objetivos pendientes', () => {
    const data = { ...base(), days: { [TODAY]: { date: TODAY, ...day(false) } } }
    const morning = evaluateNotifications({ data, today: TODAY, now: hourOf(8), history: [], preferences: DEFAULT_NOTIFICATION_PREFERENCES })
    expect(morning.some((c) => c.type === 'reminder_morning')).toBe(true)

    const afternoon = evaluateNotifications({ data, today: TODAY, now: hourOf(14), history: [], preferences: DEFAULT_NOTIFICATION_PREFERENCES })
    expect(afternoon.some((c) => c.type === 'reminder_morning')).toBe(false)
  })

  it('ordena los candidatos por prioridad: un logro siempre antes que un recordatorio', () => {
    const data = { ...base(), days: { [TODAY]: { date: TODAY, ...day(true) } } }
    const result = evaluateNotifications({
      data,
      today: TODAY,
      now: hourOf(9),
      history: [],
      preferences: DEFAULT_NOTIFICATION_PREFERENCES,
    })
    expect(result.length).toBeGreaterThan(0)
    expect(result[0].type === 'achievement' || result[0].type === 'streak_milestone').toBe(true)
  })
})
