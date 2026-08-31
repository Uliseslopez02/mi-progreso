import { describe, expect, it } from 'vitest'
import { buildHabitInsightsPayload } from '../domain/habitInsights'
import type { AppData, DayRecord, GoalSnapshot } from '../domain/types'

const meditarSnap: GoalSnapshot = {
  goalId: 'meditar',
  name: 'Meditar',
  categoryId: 'salud',
  categoryName: 'Salud',
  weight: 1,
  kind: 'boolean',
  trackingKind: 'habit',
}

function day(date: string, goals: GoalSnapshot[], completed: string[]): DayRecord {
  return {
    date,
    goals,
    goalProgress: Object.fromEntries(completed.map((id) => [id, true])),
    closed: true,
  }
}

function baseData(overrides: Partial<AppData> = {}): AppData {
  return {
    version: 10,
    settings: { appName: 'Mi Progreso', streakThreshold: 70, allowEditingPastDays: true },
    categories: [{ id: 'salud', name: 'Salud', order: 0 }],
    goals: [
      {
        id: 'meditar',
        name: 'Meditar',
        categoryId: 'salud',
        weight: 1,
        active: true,
        period: 'daily',
        order: 0,
        createdAt: '2026-08-01T00:00:00.000Z',
        kind: 'boolean',
        trackingKind: 'habit',
      },
    ],
    days: {},
    periods: {},
    lifeGoals: [],
    plannerItems: [],
    routines: [],
    routineRuns: {},
    reflections: [],
    projects: [],
    projectTasks: [],
    notes: [],
    ...overrides,
  }
}

describe('buildHabitInsightsPayload', () => {
  it('arma agregados por hábito, día de semana y categoría — nunca días crudos', () => {
    const data = baseData({
      days: {
        '2026-08-17': day('2026-08-17', [meditarSnap], ['meditar']),
        '2026-08-18': day('2026-08-18', [meditarSnap], []),
      },
    })

    const payload = buildHabitInsightsPayload(data, '2026-08-18')

    expect(payload.habits).toHaveLength(1)
    expect(payload.habits[0]).toMatchObject({
      name: 'Meditar',
      daysPresent: 2,
      // Todavía no se marcó hoy (18/08): la racha se sigue contando desde ayer
      // (17/08, cumplido), mismo criterio que goalStreaks — no se rompió, sólo
      // no se cerró todavía.
      currentStreak: 1,
      bestStreak: 1,
      daysSinceLastCompletion: 1,
    })
    expect(payload.weekdays.length).toBeGreaterThan(0)
    expect(payload.categories).toEqual([{ name: 'Salud', percent: 50 }])

    // El payload es serializable a JSON plano (lo que viaja a la Edge Function) —
    // no debe tener ninguna referencia a DayRecord/goalProgress crudo.
    const serialized = JSON.parse(JSON.stringify(payload))
    expect(serialized).not.toHaveProperty('days')
  })

  it('sin hábitos activos, todo queda vacío', () => {
    const data = baseData({ goals: [] })
    const payload = buildHabitInsightsPayload(data, '2026-08-18')
    expect(payload.habits).toEqual([])
  })

  it('excluye hábitos pausados (active: false)', () => {
    const data = baseData()
    data.goals[0].active = false
    const payload = buildHabitInsightsPayload(data, '2026-08-18')
    expect(payload.habits).toEqual([])
  })
})
