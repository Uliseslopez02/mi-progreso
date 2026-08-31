import { supabase } from '../lib/supabaseClient'
import { addDays, rangeKeys, type DateKey } from './date'
import { categoryConsistency, daysSinceLastCompletion, goalConsistency, goalStreaks, weekdayConsistency } from './consistency'
import type { AppData } from './types'

const INSIGHTS_WINDOW_DAYS = 30

export interface HabitAggregate {
  name: string
  percent: number
  daysPresent: number
  currentStreak: number
  bestStreak: number
  /** `null` = no se cumplió en los últimos 90 días (o nunca). */
  daysSinceLastCompletion: number | null
}

export interface WeekdayAggregate {
  weekday: string
  percent: number
}

export interface CategoryAggregate {
  name: string
  percent: number
}

export interface HabitInsightsPayload {
  habits: HabitAggregate[]
  weekdays: WeekdayAggregate[]
  categories: CategoryAggregate[]
}

/**
 * Arma los agregados que se le mandan a la IA de sugerencias proactivas —
 * nunca días crudos (`DayRecord`), sólo números ya resumidos por hábito/día
 * de semana/categoría. Reusa las mismas funciones de `consistency.ts` que ya
 * alimentan Historial/Informes/`habitsProgressBreakdown`, para que un
 * insight de la IA nunca pueda contradecir lo que el usuario ve en pantalla.
 */
export function buildHabitInsightsPayload(data: AppData, today: DateKey): HabitInsightsPayload {
  const habits = data.goals.filter((g) => g.trackingKind === 'habit' && g.active)
  const from = addDays(today, -(INSIGHTS_WINDOW_DAYS - 1))
  const keys = rangeKeys(from, today)

  const consistencyById = new Map(goalConsistency(data.days, keys, 'habit').map((c) => [c.id, c]))

  const habitAggregates: HabitAggregate[] = habits.map((habit) => {
    const c = consistencyById.get(habit.id)
    const streaks = goalStreaks(data.days, habit.id, today)
    return {
      name: habit.name,
      percent: c?.percent ?? 0,
      daysPresent: c?.daysPresent ?? 0,
      currentStreak: streaks.current,
      bestStreak: streaks.best,
      daysSinceLastCompletion: daysSinceLastCompletion(data.days, habit.id, today),
    }
  })

  const weekdays = weekdayConsistency(data.days, keys, 'habit').map((w) => ({
    weekday: w.weekday,
    percent: w.percent,
  }))
  const categories = categoryConsistency(data.days, keys, 'habit').map((c) => ({
    name: c.name,
    percent: c.percent,
  }))

  return { habits: habitAggregates, weekdays, categories }
}

export type HabitInsightsResult = { ok: true; insights: string[] } | { ok: false; error: string }

/**
 * Pide sugerencias proactivas basadas en el historial de hábitos, vía la Edge
 * Function `/api/habit-insights`. Mismo criterio de seguridad que
 * `suggestHabits`: JWT de sesión, nunca lanza (un fallo devuelve `{ok:false}`
 * para que la UI lo muestre sin romper nada).
 */
export async function fetchHabitInsights(payload: HabitInsightsPayload): Promise<HabitInsightsResult> {
  try {
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    if (!token) return { ok: false, error: 'Necesitás una sesión activa para pedir sugerencias.' }

    const res = await fetch('/api/habit-insights', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null
      return { ok: false, error: body?.error ?? 'No se pudieron generar sugerencias.' }
    }
    const data = (await res.json()) as { insights?: unknown }
    const insights = Array.isArray(data.insights)
      ? data.insights.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
      : []
    return { ok: true, insights }
  } catch {
    return { ok: false, error: 'No se pudo conectar con el servicio de sugerencias.' }
  }
}
