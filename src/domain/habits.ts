import type { GoalFrequency } from './types'

export type FrequencyType = GoalFrequency['type']

/** Arma la frecuencia a partir de los controles del formulario (nuevo hábito o
 * edición). 'daily' es el default implícito (undefined), igual que siempre. */
export function frequencyFrom(
  type: FrequencyType,
  days: string[],
  timesPerWeek: number,
): GoalFrequency | undefined {
  if (type === 'daily') return undefined
  if (type === 'daysOfWeek') return { type, days }
  if (type === 'timesPerWeek') return { type, timesPerWeek }
  return { type }
}
