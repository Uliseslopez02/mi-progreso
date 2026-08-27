/**
 * Cálculo del temporizador de enfoque. Todo basado en timestamps reales, nunca
 * en un contador incremental — así el tiempo restante sigue siendo correcto
 * aunque la pestaña haya estado en segundo plano o el JS se haya pausado.
 */
import type { DateKey } from './date'
import type { FocusSession, FocusSessionType } from './types'

/** "05:09" — minutos:segundos con ceros a la izquierda. */
export function formatDuration(totalSeconds: number): string {
  const clamped = Math.max(0, Math.round(totalSeconds))
  const minutes = Math.floor(clamped / 60)
  const seconds = clamped % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

/** Segundos restantes hasta completar la duración planeada, nunca negativo. */
export function remainingSeconds(startedAt: string, plannedMinutes: number, now: Date): number {
  const endsAt = new Date(startedAt).getTime() + plannedMinutes * 60_000
  return Math.max(0, Math.round((endsAt - now.getTime()) / 1000))
}

/** Minutos reales que duró la sesión (completedAt - startedAt), no los planeados. */
export function sessionMinutes(session: FocusSession): number {
  const ms = new Date(session.completedAt).getTime() - new Date(session.startedAt).getTime()
  return Math.max(0, Math.round(ms / 60_000))
}

/** Minutos totales de un tipo de sesión completados en un día concreto. */
export function focusMinutesOn(sessions: FocusSession[], date: DateKey, type: FocusSessionType = 'focus'): number {
  return sessions
    .filter((s) => s.type === type && s.completedAt.slice(0, 10) === date)
    .reduce((sum, s) => sum + sessionMinutes(s), 0)
}

/** Sesiones de un día concreto, más recientes primero. */
export function sessionsOn(sessions: FocusSession[], date: DateKey): FocusSession[] {
  return sessions
    .filter((s) => s.completedAt.slice(0, 10) === date)
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
}

export const POMODORO_FOCUS_MINUTES = 25
export const POMODORO_SHORT_BREAK_MINUTES = 5
export const POMODORO_LONG_BREAK_MINUTES = 15
export const POMODORO_CYCLE_LENGTH = 4

export interface PomodoroPhase {
  type: FocusSessionType
  minutes: number
  pomodoroCount: number
}

/** Siguiente fase del ciclo Pomodoro clásico, a partir de la fase que acaba de
 * completarse. Cada `POMODORO_CYCLE_LENGTH` enfoques el descanso es largo; el
 * conteo se reinicia a 1 después de un descanso largo. */
export function nextPomodoroPhase(finishedType: FocusSessionType, finishedPomodoroCount: number): PomodoroPhase {
  if (finishedType === 'focus') {
    const isLongBreak = finishedPomodoroCount % POMODORO_CYCLE_LENGTH === 0
    return {
      type: 'break',
      minutes: isLongBreak ? POMODORO_LONG_BREAK_MINUTES : POMODORO_SHORT_BREAK_MINUTES,
      pomodoroCount: finishedPomodoroCount,
    }
  }
  const wasLongBreak = finishedPomodoroCount % POMODORO_CYCLE_LENGTH === 0
  return {
    type: 'focus',
    minutes: POMODORO_FOCUS_MINUTES,
    pomodoroCount: wasLongBreak ? 1 : finishedPomodoroCount + 1,
  }
}
