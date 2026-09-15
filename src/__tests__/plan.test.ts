import { describe, expect, it } from 'vitest'
import type { Goal, LifeGoal, Project } from '../domain/types'
import {
  PLAN_LIMITS,
  canOpenPlannerWeek,
  countActiveLifeGoals,
  countActiveProjects,
  countDailyGoals,
  countGoalsByPeriod,
  countHabits,
  goalPeriodLimitKey,
  historyRangesFor,
  isAtLimit,
  isProHistoryRange,
  limitFor,
  remainingFor,
  shouldShowCounter,
  yearMapWeeksFor,
} from '../domain/plan'

const goal = (over: Partial<Goal>): Goal => ({
  id: over.id ?? Math.random().toString(),
  name: 'g',
  categoryId: 'c',
  weight: 1,
  active: true,
  period: 'daily',
  order: 0,
  createdAt: '',
  kind: 'boolean',
  trackingKind: 'goal',
  ...over,
})

describe('contadores', () => {
  it('countDailyGoals ignora hábitos y otros períodos', () => {
    const goals: Goal[] = [
      goal({ period: 'daily' }),
      goal({ period: 'daily' }),
      goal({ period: 'weekly' }),
      goal({ trackingKind: 'habit', period: 'daily' }),
      goal({ trackingKind: undefined, period: 'daily' }), // sin trackingKind = 'goal'
    ]
    expect(countDailyGoals(goals)).toBe(3)
    expect(countGoalsByPeriod(goals, 'weekly')).toBe(1)
    expect(countHabits(goals)).toBe(1)
  })

  it('countActiveLifeGoals / countActiveProjects sólo cuentan lo activo', () => {
    const lifeGoals = [
      { status: 'active' },
      { status: 'active' },
      { status: 'completed' },
      { status: 'abandoned' },
    ] as LifeGoal[]
    const projects = [{ status: 'active' }, { status: 'archived' }, { status: 'completed' }] as Project[]
    expect(countActiveLifeGoals(lifeGoals)).toBe(2)
    expect(countActiveProjects(projects)).toBe(1)
  })
})

describe('límites', () => {
  it('isAtLimit compara contra el tope del plan', () => {
    expect(isAtLimit('free', 'dailyGoals', 4)).toBe(false)
    expect(isAtLimit('free', 'dailyGoals', 5)).toBe(true)
    expect(isAtLimit('free', 'dailyGoals', 11)).toBe(true) // grandfathered: igual bloquea agregar
    expect(isAtLimit('premium', 'dailyGoals', 40)).toBe(false)
  })

  it('remainingFor nunca es negativo', () => {
    expect(remainingFor('free', 'habits', 1)).toBe(2)
    expect(remainingFor('free', 'habits', 9)).toBe(0)
  })

  it('shouldShowCounter: sólo Free y sólo desde el 80% del límite', () => {
    expect(shouldShowCounter('premium', 'dailyGoals', 5)).toBe(false)
    expect(shouldShowCounter('free', 'dailyGoals', 3)).toBe(false) // < 80% de 5
    expect(shouldShowCounter('free', 'dailyGoals', 4)).toBe(true)
    expect(shouldShowCounter('free', 'dailyGoals', 5)).toBe(true)
  })

  it('goalPeriodLimitKey mapea el período a su clave', () => {
    expect(goalPeriodLimitKey('daily')).toBe('dailyGoals')
    expect(goalPeriodLimitKey('weekly')).toBe('weeklyGoals')
    expect(goalPeriodLimitKey('monthly')).toBe('monthlyGoals')
  })

  it('los números de Free coinciden con lo documentado', () => {
    expect(limitFor('free', 'dailyGoals')).toBe(5)
    expect(limitFor('free', 'weeklyGoals')).toBe(1)
    expect(limitFor('free', 'monthlyGoals')).toBe(1)
    expect(limitFor('free', 'habits')).toBe(3)
    expect(limitFor('free', 'activeLifeGoals')).toBe(2)
    expect(limitFor('free', 'activeProjects')).toBe(1)
    expect(limitFor('free', 'routines')).toBe(1)
    expect(PLAN_LIMITS.free.notes).toBe(10)
    expect(PLAN_LIMITS.free.categories).toBe(6)
  })
})

describe('profundidad histórica', () => {
  it('historyRangesFor: Free hasta 14 días, Premium suma 30/90/365', () => {
    expect(historyRangesFor('free')).toEqual([7, 14])
    expect(historyRangesFor('premium')).toEqual([7, 14, 30, 90, 365])
  })

  it('isProHistoryRange marca los rangos exclusivos', () => {
    expect(isProHistoryRange(14)).toBe(false)
    expect(isProHistoryRange(30)).toBe(true)
    expect(isProHistoryRange(90)).toBe(true)
    expect(isProHistoryRange(365)).toBe(true)
  })

  it('yearMapWeeksFor recorta el heatmap para Free', () => {
    expect(yearMapWeeksFor('free', 53)).toBe(8)
    expect(yearMapWeeksFor('premium', 53)).toBe(53)
  })
})

describe('planificador', () => {
  it('Free abre la semana actual y la siguiente; el pasado siempre', () => {
    expect(canOpenPlannerWeek('free', 0)).toBe(true)
    expect(canOpenPlannerWeek('free', 1)).toBe(true)
    expect(canOpenPlannerWeek('free', 2)).toBe(false)
    expect(canOpenPlannerWeek('free', -4)).toBe(true)
    expect(canOpenPlannerWeek('premium', 30)).toBe(true)
  })
})
