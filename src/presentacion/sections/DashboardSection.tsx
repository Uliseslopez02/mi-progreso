import { ProgressRing } from '../../components/ProgressRing'
import { CheckIcon } from '../../components/icons'
import { topActiveStreaks } from '../../domain/dashboard'
import { computeDayStats, formatGrade, labelForPercent } from '../../domain/scoring'
import { SectionFrame } from '../SectionFrame'
import { ALL_DEMO_GOALS, TODAY } from '../demoData'
import { usePresentacion } from '../PresentacionState'

/** Recreación interactiva de "Hoy": el mismo cálculo (`computeDayStats`) que usa la app real. */
export function DashboardSection() {
  const { days, toggleGoal } = usePresentacion()
  const record = days[TODAY]
  const stats = computeDayStats(record)
  const todayGoals = (record?.goals ?? []).filter((g) => g.trackingKind !== 'habit')
  const streaks = topActiveStreaks(ALL_DEMO_GOALS, days, TODAY)

  return (
    <SectionFrame
      eyebrow="Tu día"
      title="Así se ve tu progreso, todos los días."
      subtitle="Esto es una recreación real de la pantalla “Hoy”: marcá un objetivo y mirá el anillo, la nota y la racha reaccionar en el momento."
      className="pr-dashboard"
    >
      <div className="pr-dashboard__grid">
        <div className="pr-card pr-dashboard__ring">
          <ProgressRing percent={stats.percent} size={168} strokeWidth={12} caption="hoy" />
          <p className="pr-dashboard__grade numeric">{formatGrade(stats.grade)} / 10</p>
          <p className="pr-dashboard__label">{labelForPercent(stats.percent)}</p>
        </div>

        <div className="pr-card pr-dashboard__goals">
          <p className="pr-card__hint">Objetivos de hoy — tocá para completar</p>
          <ul className="pr-goal-list">
            {todayGoals.map((goal) => {
              const progress = record?.goalProgress[goal.goalId]
              const done = goal.kind === 'boolean' ? !!progress : Number(progress ?? 0) >= (goal.targetValue ?? 1)
              return (
                <li key={goal.goalId}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={done}
                    className={`pr-goal-row${done ? ' pr-goal-row--done' : ''}`}
                    onClick={() => toggleGoal(goal.goalId, goal.kind === 'boolean' ? undefined : 0.5)}
                  >
                    <span className="pr-goal-row__check">{done && <CheckIcon size={12} />}</span>
                    <span className="pr-goal-row__name">{goal.name}</span>
                    <span className="pr-goal-row__weight numeric">peso {goal.weight}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="pr-card pr-dashboard__streaks">
          <p className="pr-card__hint">Rachas activas</p>
          {streaks.length === 0 ? (
            <p className="pr-dashboard__empty">Todavía no hay rachas en curso.</p>
          ) : (
            <ul className="pr-streak-list">
              {streaks.map((s) => (
                <li key={s.id}>
                  <span>{s.name}</span>
                  <span className="numeric">{s.current} días</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </SectionFrame>
  )
}
