import { useMemo } from 'react'
import { EisenhowerMatrix } from '../components/EisenhowerMatrix'
import { groupByQuadrant } from '../domain/eisenhower'
import { useAppData } from '../state/context'

/** Matriz Eisenhower: triage de tareas de Agenda pendientes por urgencia/importancia. */
export function EisenhowerPage() {
  const { data, today, dispatch } = useAppData()

  const groups = useMemo(
    () => groupByQuadrant(data.plannerItems, today),
    [data.plannerItems, today],
  )

  return (
    <EisenhowerMatrix
      groups={groups}
      today={today}
      onToggle={(id) => dispatch({ type: 'updatePlannerItem', id, patch: { done: true } })}
      onRemove={(id) => dispatch({ type: 'removePlannerItem', id })}
    />
  )
}
