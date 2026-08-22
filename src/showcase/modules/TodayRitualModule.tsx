import { greetingForHour } from '../../domain/dashboard'
import { computeDayStats } from '../../domain/scoring'
import { BAND_COLOR } from '../../components/colors'
import { bandForPercent } from '../../domain/scoring'
import { GoalCheckIcon } from '../GoalCheckIcon'
import { DEMO_GOALS, TODAY } from '../demoData'
import { ModuleFrame } from '../ModuleFrame'
import { useShowcase } from '../ShowcaseState'

/**
 * Módulo 2 — ritual del día: saludo, foco principal y progreso de hoy.
 * El foco principal es clickeable a propósito: es la forma en la que este
 * módulo mueve en vivo el anillo del Módulo 9 y las estadísticas del 5 —
 * mismo `days[hoy]` compartido.
 */
export function TodayRitualModule() {
  const { days, toggleGoal } = useShowcase()
  const record = days[TODAY]
  const stats = computeDayStats(record)

  const pendingGoal = DEMO_GOALS.find((g) => {
    const progress = record?.goalProgress[g.id] ?? 0
    return g.kind === 'boolean' ? !progress : (progress as number) < (g.targetValue ?? 1)
  })

  const color = BAND_COLOR[bandForPercent(stats.percent)]

  return (
    <ModuleFrame eyebrow={greetingForHour(new Date().getHours())} title="Hoy" className="sc-module--ritual">
      <p className="sc-ritual__label">Tu foco principal</p>
      {pendingGoal ? (
        <button
          type="button"
          role="checkbox"
          aria-checked={false}
          className="goal sc-ritual__focus-btn"
          onClick={() => toggleGoal(pendingGoal.id, pendingGoal.kind === 'quantitative' ? 1 : true)}
        >
          <span className="goal__box" aria-hidden="true">
            <GoalCheckIcon />
          </span>
          <span className="goal__name sc-ritual__focus">{pendingGoal.name}</span>
        </button>
      ) : (
        <p className="sc-ritual__focus">¡Ya completaste todo hoy!</p>
      )}

      <div className="sc-ritual__progress">
        <div className="sc-ritual__progress-row">
          <span>Progreso</span>
          <span className="numeric">
            {stats.completedCount} de {stats.totalCount} objetivos
          </span>
        </div>
        <div className="consistency__bar">
          <span
            className="consistency__fill"
            style={{ width: `${stats.percent}%`, background: color }}
          />
        </div>
      </div>
    </ModuleFrame>
  )
}
