import { useState } from 'react'
import { routineProgress } from '../domain/routine'
import type { Routine, RoutineRun } from '../domain/types'

interface Props {
  routine: Routine
  run: RoutineRun | undefined
  onToggleStep: (stepId: string) => void
  onClose: () => void
}

/** Ejecución paso a paso de una rutina, sin distracciones: un paso a la vez. */
export function RoutineFocusMode({ routine, run, onToggleStep, onClose }: Props) {
  const steps = [...routine.steps].sort((a, b) => a.order - b.order)
  const completed = new Set(run?.completedStepIds ?? [])
  const firstPending = steps.findIndex((s) => !completed.has(s.id))
  const [index, setIndex] = useState(firstPending === -1 ? 0 : firstPending)

  const { done, total } = routineProgress(routine, run)
  const step = steps[index]
  const allDone = total > 0 && done === total

  const markDoneAndAdvance = () => {
    if (step && !completed.has(step.id)) onToggleStep(step.id)
    if (index < steps.length - 1) setIndex(index + 1)
  }

  return (
    <div className="routine-focus">
      <div className="routine-focus__backdrop" onClick={onClose} />
      <div className="routine-focus__panel" role="dialog" aria-label={`Modo enfocado — ${routine.name}`}>
        <div className="routine-focus__header">
          <span>{routine.name}</span>
          <button type="button" className="icon-btn" aria-label="Cerrar modo enfocado" onClick={onClose}>
            ×
          </button>
        </div>

        <p className="routine-focus__progress">
          {done} de {total} completados
        </p>

        {allDone || !step ? (
          <div className="routine-focus__step">
            <p className="routine-focus__step-text">¡Rutina completa! 🎉</p>
          </div>
        ) : (
          <div className="routine-focus__step">
            <p className="routine-focus__step-label">
              Paso {index + 1} de {steps.length}
            </p>
            <p className="routine-focus__step-text">{step.text}</p>
          </div>
        )}

        <div className="routine-focus__actions">
          <button type="button" className="btn btn--ghost" onClick={() => setIndex(Math.max(0, index - 1))} disabled={index === 0}>
            Anterior
          </button>
          {!allDone && step && (
            <button type="button" className="btn btn--primary" onClick={markDoneAndAdvance}>
              {completed.has(step.id) ? 'Siguiente' : 'Hecho, siguiente'}
            </button>
          )}
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setIndex(Math.min(steps.length - 1, index + 1))}
            disabled={index >= steps.length - 1}
          >
            Saltar
          </button>
        </div>
      </div>
    </div>
  )
}
