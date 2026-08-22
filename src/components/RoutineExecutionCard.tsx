import { routineProgress } from '../domain/routine'
import type { Routine, RoutineRun } from '../domain/types'
import { BAND_COLOR } from './colors'

interface Props {
  routine: Routine
  run: RoutineRun | undefined
  onToggleStep: (stepId: string) => void
  onOpenFocusMode: () => void
}

function progressBand(percent: number) {
  if (percent >= 90) return 'top'
  if (percent >= 75) return 'high'
  if (percent >= 50) return 'good'
  if (percent >= 25) return 'mid'
  return 'low'
}

/** Checklist de una rutina para el día de hoy: marcar pasos y ver el progreso. */
export function RoutineExecutionCard({ routine, run, onToggleStep, onOpenFocusMode }: Props) {
  const steps = [...routine.steps].sort((a, b) => a.order - b.order)
  const { done, total, percent } = routineProgress(routine, run)
  const completed = new Set(run?.completedStepIds ?? [])

  return (
    <div className="routine-card">
      <div className="lifegoal-card__head">
        <p className="habit-card__name">{routine.name}</p>
        {total > 0 && (
          <button type="button" className="btn btn--ghost" onClick={onOpenFocusMode}>
            Modo enfocado
          </button>
        )}
      </div>

      {total === 0 ? (
        <p className="empty">Esta rutina todavía no tiene pasos.</p>
      ) : (
        <>
          <div className="lifegoal-card__progress">
            <div className="lifegoal-card__progress-row">
              <span>
                {done} de {total} completados
              </span>
              <span className="numeric">{percent}%</span>
            </div>
            <span className="consistency__bar" style={{ display: 'block' }}>
              <span
                className="consistency__fill"
                style={{ width: `${percent}%`, background: BAND_COLOR[progressBand(percent)] }}
              />
            </span>
          </div>

          <ul className="subgoal-list">
            {steps.map((step) => (
              <li className="subgoal" key={step.id}>
                <input
                  type="checkbox"
                  checked={completed.has(step.id)}
                  aria-label={step.text}
                  onChange={() => onToggleStep(step.id)}
                />
                <span className={completed.has(step.id) ? 'subgoal__done' : undefined}>{step.text}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
