import { ModuleFrame } from '../ModuleFrame'
import { GoalCheckIcon } from '../GoalCheckIcon'
import { useShowcase } from '../ShowcaseState'

/** Módulo 3 — objetivo de largo plazo dividido en subobjetivos accionables. */
export function GoalModule() {
  const { lifeGoal, toggleSubGoal } = useShowcase()

  return (
    <ModuleFrame eyebrow="Objetivos" title={lifeGoal.name.toUpperCase()} className="sc-module--goal">
      <div className="sc-goal__progress">
        <span className="sc-goal__percent numeric">{lifeGoal.progress}%</span>
        <div className="consistency__bar">
          <span className="consistency__fill" style={{ width: `${lifeGoal.progress}%`, background: 'var(--accent)' }} />
        </div>
      </div>

      <ul className="subgoal-list">
        {lifeGoal.subGoals.map((sub) => (
          <li key={sub.id}>
            <button
              type="button"
              role="checkbox"
              aria-checked={sub.done}
              className={`goal${sub.done ? ' goal--done' : ''}`}
              onClick={() => toggleSubGoal(sub.id)}
            >
              <span className="goal__box" aria-hidden="true">
                <GoalCheckIcon />
              </span>
              <span className="goal__name">{sub.text}</span>
            </button>
          </li>
        ))}
      </ul>
    </ModuleFrame>
  )
}
