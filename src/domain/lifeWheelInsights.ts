/**
 * Conecta un área de la Rueda de la vida (= una `Category`) con los hábitos y metas
 * reales de esa categoría — sin esto, la Rueda sólo diagnostica, nunca ayuda a actuar.
 * Mismo criterio que el resto de `domain/`: nada de texto inventado, sólo reglas fijas
 * sobre datos que ya existen (ver `messageForPercent` en `scoring.ts`).
 */
import { goalCompletionOn } from './consistency'
import type { DateKey } from './date'
import type { DayRecord, Goal, LifeGoal } from './types'

export interface AreaHabitStatus {
  id: string
  name: string
  doneToday: boolean
}

export interface AreaDetail {
  habits: AreaHabitStatus[]
  /** Promedio de `progress` de las metas activas de esta área. `null` si no hay ninguna. */
  goalsProgress: number | null
  suggestion: string
}

function areaSuggestion(score: number, habits: AreaHabitStatus[]): string {
  const pending = habits.filter((h) => !h.doneToday)

  if (habits.length === 0) {
    return score <= 6
      ? 'Todavía no tenés hábitos vinculados a esta área — podría ayudar a mejorarla.'
      : 'No tenés hábitos vinculados a esta área todavía.'
  }

  if (score <= 6 && pending.length > 0) {
    return `Esta área viene floja, y coincide con que ${pending.map((h) => h.name).join(', ')} no se está cumpliendo hoy.`
  }

  if (score >= 7 && pending.length === 0) {
    return 'Buen puntaje, y tus hábitos relacionados están al día.'
  }

  return 'Seguí de cerca esta área — hay margen para mejorar.'
}

export function areaDetail(
  categoryId: string,
  score: number,
  goals: Goal[],
  lifeGoals: LifeGoal[],
  days: Record<string, DayRecord>,
  today: DateKey,
): AreaDetail {
  const habits: AreaHabitStatus[] = goals
    .filter((g) => g.trackingKind === 'habit' && g.active && g.categoryId === categoryId)
    .map((g) => ({
      id: g.id,
      name: g.name,
      doneToday: goalCompletionOn(days[today], g.id) === true,
    }))

  const relatedGoals = lifeGoals.filter((g) => g.categoryId === categoryId && g.status === 'active')
  const goalsProgress =
    relatedGoals.length === 0
      ? null
      : Math.round(relatedGoals.reduce((sum, g) => sum + g.progress, 0) / relatedGoals.length)

  return {
    habits,
    goalsProgress,
    suggestion: areaSuggestion(score, habits),
  }
}
