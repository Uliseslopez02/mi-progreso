import { describe, expect, it } from 'vitest'
import { focusMinutesOn, formatDuration, remainingSeconds, sessionMinutes, sessionsOn } from '../domain/focus'
import type { FocusSession } from '../domain/types'

describe('formatDuration', () => {
  it('formatea segundos como mm:ss con ceros a la izquierda', () => {
    expect(formatDuration(69)).toBe('01:09')
    expect(formatDuration(5)).toBe('00:05')
    expect(formatDuration(0)).toBe('00:00')
  })

  it('nunca devuelve negativo', () => {
    expect(formatDuration(-30)).toBe('00:00')
  })
})

describe('remainingSeconds', () => {
  it('calcula lo que falta a partir de timestamps, no de un contador', () => {
    const startedAt = '2026-08-21T10:00:00.000Z'
    const now = new Date('2026-08-21T10:03:00.000Z')
    expect(remainingSeconds(startedAt, 5, now)).toBe(120)
  })

  it('nunca es negativo aunque se haya pasado del tiempo planeado', () => {
    const startedAt = '2026-08-21T10:00:00.000Z'
    const now = new Date('2026-08-21T10:10:00.000Z')
    expect(remainingSeconds(startedAt, 5, now)).toBe(0)
  })
})

const session = (overrides: Partial<FocusSession> & Pick<FocusSession, 'id'>): FocusSession => ({
  startedAt: '2026-08-21T10:00:00.000Z',
  completedAt: '2026-08-21T10:25:00.000Z',
  plannedMinutes: 25,
  type: 'focus',
  status: 'completed',
  ...overrides,
})

describe('sessionMinutes', () => {
  it('usa la duración real (completedAt - startedAt), no la planeada', () => {
    const stopped = session({
      id: 's1',
      completedAt: '2026-08-21T10:12:00.000Z',
      status: 'stopped',
    })
    expect(sessionMinutes(stopped)).toBe(12)
  })
})

describe('focusMinutesOn', () => {
  it('suma sólo las sesiones del tipo y día pedidos', () => {
    const sessions: FocusSession[] = [
      session({ id: 'a', type: 'focus' }), // 25 min, 2026-08-21
      session({
        id: 'b',
        type: 'break',
        startedAt: '2026-08-21T11:00:00.000Z',
        completedAt: '2026-08-21T11:05:00.000Z',
      }),
      session({
        id: 'c',
        type: 'focus',
        startedAt: '2026-08-20T10:00:00.000Z',
        completedAt: '2026-08-20T10:25:00.000Z',
      }),
    ]

    expect(focusMinutesOn(sessions, '2026-08-21', 'focus')).toBe(25)
    expect(focusMinutesOn(sessions, '2026-08-21', 'break')).toBe(5)
    expect(focusMinutesOn(sessions, '2026-08-20', 'focus')).toBe(25)
  })
})

describe('sessionsOn', () => {
  it('filtra por día y ordena de más reciente a más antigua', () => {
    const sessions: FocusSession[] = [
      session({ id: 'temprano', completedAt: '2026-08-21T09:00:00.000Z' }),
      session({ id: 'tarde', completedAt: '2026-08-21T18:00:00.000Z' }),
      session({ id: 'otro-dia', completedAt: '2026-08-20T09:00:00.000Z' }),
    ]

    expect(sessionsOn(sessions, '2026-08-21').map((s) => s.id)).toEqual(['tarde', 'temprano'])
  })
})
