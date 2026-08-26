/**
 * Matriz Eisenhower sobre las tareas de Agenda (`PlannerItem`) — sin dominio
 * nuevo, urgencia deriva de `date` e importancia de `priority`. Las tareas de
 * Proyectos (`ProjectTask`) quedan fuera a propósito: son sin fecha/prioridad.
 */
import { diffDays, type DateKey } from './date'
import type { PlannerItem } from './types'

export type EisenhowerQuadrant = 'do' | 'schedule' | 'delegate' | 'eliminate'

/** Urgente = hoy o vencida. */
export function isUrgent(item: PlannerItem, today: DateKey): boolean {
  return diffDays(today, item.date) <= 0
}

/** Importante = prioridad alta. `medium`/`low` no cuentan, para que "importante"
 * siga siendo una minoría significativa (si `medium` contara, la mayoría de las
 * tareas caería ahí y la matriz no triaría nada). */
export function isImportant(item: PlannerItem): boolean {
  return item.priority === 'high'
}

export function eisenhowerQuadrant(item: PlannerItem, today: DateKey): EisenhowerQuadrant {
  const urgent = isUrgent(item, today)
  const important = isImportant(item)
  if (urgent && important) return 'do'
  if (!urgent && important) return 'schedule'
  if (urgent && !important) return 'delegate'
  return 'eliminate'
}

export function groupByQuadrant(
  items: PlannerItem[],
  today: DateKey,
): Record<EisenhowerQuadrant, PlannerItem[]> {
  const groups: Record<EisenhowerQuadrant, PlannerItem[]> = {
    do: [],
    schedule: [],
    delegate: [],
    eliminate: [],
  }
  for (const item of items) {
    if (item.done) continue
    groups[eisenhowerQuadrant(item, today)].push(item)
  }
  for (const key of Object.keys(groups) as EisenhowerQuadrant[]) {
    groups[key].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  }
  return groups
}
