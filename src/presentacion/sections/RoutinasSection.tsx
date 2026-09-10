import { useMemo, useState } from 'react'
import { RoutineCard } from '../../components/RoutineCard'
import { RoutineExecutionCard } from '../../components/RoutineExecutionCard'
import { RoutineFocusMode } from '../../components/RoutineFocusMode'
import { getRoutineRun } from '../../domain/routine'
import { SectionFrame } from '../SectionFrame'
import { usePresentacion } from '../PresentacionState'
import { TODAY } from '../demoData'

/**
 * Recreación de Rutinas (Objetivos → Rutinas): las mismas `<RoutineExecutionCard>`
 * (checklist de hoy + "Modo enfocado"), `<RoutineCard>` (editar nombre, categoría,
 * pausar/activar, reordenar pasos) y `<RoutineFocusMode>` (un paso a la vez) de
 * la app. A diferencia de los objetivos, una rutina no puntúa el día — se mide
 * por sus propios pasos completados.
 */
export function RoutinasSection() {
  const { routines, routineRuns, updateRoutine, removeRoutine, moveRoutine, toggleRoutineStep } =
    usePresentacion()
  const [focusRoutineId, setFocusRoutineId] = useState<string | null>(null)

  const ordered = useMemo(() => [...routines].sort((a, b) => a.order - b.order), [routines])
  const activeRoutines = useMemo(() => ordered.filter((r) => r.active), [ordered])
  const focusRoutine = focusRoutineId ? routines.find((r) => r.id === focusRoutineId) : undefined

  return (
    <SectionFrame
      eyebrow="Rituales"
      title="Rutinas: secuencias de pasos, no un solo check."
      subtitle="A diferencia de un objetivo, una rutina no puntúa el día — se completa paso a paso, y podés hacerla en modo enfocado sin distracciones."
      className="pr-rutinas"
    >
      <section className="card">
        <div className="card__header">
          <h3 className="card__title">Rutinas de hoy</h3>
        </div>
        {activeRoutines.length === 0 ? (
          <p className="empty">No hay rutinas activas.</p>
        ) : (
          activeRoutines.map((routine) => (
            <RoutineExecutionCard
              key={routine.id}
              routine={routine}
              run={getRoutineRun(routineRuns, routine.id, TODAY)}
              onToggleStep={(stepId) => toggleRoutineStep(routine.id, stepId)}
              onOpenFocusMode={() => setFocusRoutineId(routine.id)}
            />
          ))
        )}
      </section>

      <section className="card">
        <div className="card__header">
          <h3 className="card__title">Tus rutinas</h3>
          <span className="card__hint">
            {ordered.filter((r) => r.active).length} activas de {ordered.length}
          </span>
        </div>
        {ordered.map((routine, i) => (
          <RoutineCard
            key={routine.id}
            routine={routine}
            onUpdate={(patch) => updateRoutine(routine.id, patch)}
            onRemove={() => removeRoutine(routine.id)}
            onMoveUp={i === 0 ? undefined : () => moveRoutine(routine.id, -1)}
            onMoveDown={i === ordered.length - 1 ? undefined : () => moveRoutine(routine.id, 1)}
          />
        ))}
      </section>

      {focusRoutine && (
        <RoutineFocusMode
          routine={focusRoutine}
          run={getRoutineRun(routineRuns, focusRoutine.id, TODAY)}
          onToggleStep={(stepId) => toggleRoutineStep(focusRoutine.id, stepId)}
          onClose={() => setFocusRoutineId(null)}
        />
      )}
    </SectionFrame>
  )
}
