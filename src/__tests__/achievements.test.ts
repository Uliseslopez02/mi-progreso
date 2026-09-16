import { describe, expect, it } from 'vitest'
import { detectAchievements } from '../domain/achievements'
import { addDays } from '../domain/date'
import { createEmptyData } from '../domain/defaults'
import { buildUserContext } from '../domain/notifications'
import type { AppData, DayRecord, GoalSnapshot, TrackingKind } from '../domain/types'

const TODAY = '2026-09-16'

function goalSnapshot(id: string, trackingKind: TrackingKind = 'goal'): GoalSnapshot {
  return { goalId: id, name: `Objetivo ${id}`, categoryId: 'cat', categoryName: 'Categoría', weight: 1, kind: 'boolean', trackingKind }
}

/** Día con un solo objetivo/hábito booleano, cumplido o no. */
function day(id: string, done: boolean, trackingKind: TrackingKind = 'goal'): DayRecord {
  return { date: '', goals: [goalSnapshot(id, trackingKind)], goalProgress: done ? { [id]: true } : {}, closed: true }
}

/** Arma un historial de `count` días consecutivos hasta `today`, todos con el mismo resultado. */
function buildStreak(data: AppData, today: string, count: number, done: boolean, trackingKind: TrackingKind = 'goal'): AppData {
  const days = { ...data.days }
  for (let i = 0; i < count; i++) {
    const date = addDays(today, -i)
    days[date] = { ...day('g1', done, trackingKind), date }
  }
  return { ...data, days }
}

function base(): AppData {
  return createEmptyData('2026-01-01T00:00:00.000Z')
}

describe('detectAchievements', () => {
  it('detecta el primer objetivo completado', () => {
    const data = buildStreak(base(), TODAY, 1, true)
    const ctx = buildUserContext(data, TODAY)
    const achievements = detectAchievements(data, TODAY, ctx, new Set())
    expect(achievements.some((a) => a.id === 'first-goal')).toBe(true)
  })

  it('no repite el primer objetivo si ya fue otorgado', () => {
    const data = buildStreak(base(), TODAY, 1, true)
    const ctx = buildUserContext(data, TODAY)
    const achievements = detectAchievements(data, TODAY, ctx, new Set(['first-goal']))
    expect(achievements.some((a) => a.id === 'first-goal')).toBe(false)
  })

  it('detecta el primer hábito completado, independiente de los objetivos', () => {
    const data = buildStreak(base(), TODAY, 1, true, 'habit')
    const ctx = buildUserContext(data, TODAY)
    const achievements = detectAchievements(data, TODAY, ctx, new Set())
    expect(achievements.some((a) => a.id === 'first-habit')).toBe(true)
    expect(achievements.some((a) => a.id === 'first-goal')).toBe(false)
  })

  it('detecta el hito de racha de 7 días exacto, no uno menor', () => {
    const data = buildStreak(base(), TODAY, 7, true)
    const ctx = buildUserContext(data, TODAY)
    const achievements = detectAchievements(data, TODAY, ctx, new Set())
    const streakAchievement = achievements.find((a) => a.id.startsWith('streak-'))
    expect(streakAchievement?.id).toBe('streak-7')
  })

  it('no vuelve a otorgar un hito de racha ya notificado, aunque la racha lo siga cumpliendo', () => {
    const data = buildStreak(base(), TODAY, 7, true)
    const ctx = buildUserContext(data, TODAY)
    const achievements = detectAchievements(data, TODAY, ctx, new Set(['streak-7', 'streak-3']))
    expect(achievements.some((a) => a.id.startsWith('streak-'))).toBe(false)
  })

  it('con racha de 10 días sólo otorga el hito de 7 (el mayor alcanzado), no el de 3', () => {
    const data = buildStreak(base(), TODAY, 10, true)
    const ctx = buildUserContext(data, TODAY)
    const achievements = detectAchievements(data, TODAY, ctx, new Set())
    const streakIds = achievements.filter((a) => a.id.startsWith('streak-')).map((a) => a.id)
    expect(streakIds).toEqual(['streak-7'])
  })

  it('mejor racha personal sólo se otorga si supera un récord real (racha >= 3)', () => {
    const data = buildStreak(base(), TODAY, 3, true)
    const ctx = buildUserContext(data, TODAY)
    expect(ctx.isNewBestStreak).toBe(true)
    const achievements = detectAchievements(data, TODAY, ctx, new Set())
    expect(achievements.some((a) => a.id === 'best-streak-3')).toBe(true)
  })

  it('detecta una meta de largo plazo recién completada', () => {
    const data: AppData = {
      ...base(),
      lifeGoals: [
        {
          id: 'lg1',
          name: 'Correr una maratón',
          scope: 'personal',
          priority: 'medium',
          progress: 100,
          status: 'completed',
          subGoals: [],
          linkedHabitIds: [],
          order: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    }
    const ctx = buildUserContext(data, TODAY)
    const achievements = detectAchievements(data, TODAY, ctx, new Set())
    expect(achievements.some((a) => a.id === 'life-goal-lg1')).toBe(true)
  })

  it('no repite una meta de largo plazo ya notificada', () => {
    const data: AppData = {
      ...base(),
      lifeGoals: [
        {
          id: 'lg1',
          name: 'Correr una maratón',
          scope: 'personal',
          priority: 'medium',
          progress: 100,
          status: 'completed',
          subGoals: [],
          linkedHabitIds: [],
          order: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    }
    const ctx = buildUserContext(data, TODAY)
    const achievements = detectAchievements(data, TODAY, ctx, new Set(['life-goal-lg1']))
    expect(achievements.some((a) => a.id === 'life-goal-lg1')).toBe(false)
  })
})
