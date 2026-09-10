import { GoalList } from '../../components/GoalList'
import { ProgressRing } from '../../components/ProgressRing'
import { greetingForHour, topActiveStreaks } from '../../domain/dashboard'
import { formatLongDate } from '../../domain/date'
import {
  computeDayStats,
  formatGrade,
  labelForPercent,
  messageForPercent,
} from '../../domain/scoring'
import { SectionFrame } from '../SectionFrame'
import { TODAY } from '../demoData'
import { usePresentacion } from '../PresentacionState'

/**
 * Recreación de la pantalla "Hoy" de la app: el mismo `computeDayStats`, el
 * mismo `<ProgressRing>` y la misma `<GoalList>` (agrupada por categoría, con
 * el badge ×peso sólo cuando el peso no es 1, y el input numérico para los
 * objetivos de cantidad). Marcar acá mueve el anillo, la nota y las rachas.
 */
export function DashboardSection() {
  const { goals, days, toggleGoal, setGoalProgress } = usePresentacion()
  const record = days[TODAY]
  const stats = computeDayStats(record)
  const todayGoals = (record?.goals ?? []).filter((g) => g.trackingKind !== 'habit')
  const streaks = topActiveStreaks(goals, days, TODAY)
  const greeting = greetingForHour(new Date().getHours())

  return (
    <SectionFrame
      eyebrow="Tu día"
      title="Así se ve tu progreso, todos los días."
      subtitle="Es la pantalla “Hoy” tal cual: marcá un objetivo y mirá el anillo, la nota y las rachas reaccionar en el momento. El número no es mágico — sale de los pesos de tus objetivos."
      className="pr-dashboard"
    >
      <div className="pr-dashboard__grid">
        <section className="card hero pr-dashboard__hero">
          <p className="hero__eyebrow">
            {greeting} · {formatLongDate(TODAY)}
          </p>
          <ProgressRing percent={stats.percent} />
          <p className="hero__count numeric">
            {stats.completedCount} de {stats.totalCount}{' '}
            {stats.totalCount === 1 ? 'objetivo completado' : 'objetivos completados'}
          </p>
          <div className="hero__grade">
            <p className="hero__grade-value numeric">{formatGrade(stats.grade)} / 10</p>
            <p className="hero__grade-label">Nota del día · {labelForPercent(stats.percent)}</p>
          </div>
          <p className="hero__message">{messageForPercent(stats.percent)}</p>
        </section>

        <div className="pr-dashboard__side">
          <section className="card">
            <div className="card__header">
              <h3 className="card__title">Objetivos de hoy</h3>
              <span className="card__hint">{formatLongDate(TODAY)}</span>
            </div>
            <GoalList
              goals={todayGoals}
              goalProgress={record?.goalProgress ?? {}}
              onToggle={toggleGoal}
              onProgressChange={setGoalProgress}
            />
          </section>

          <section className="card">
            <div className="card__header">
              <h3 className="card__title">Rachas activas</h3>
            </div>
            {streaks.length === 0 ? (
              <p className="empty">Todavía no hay rachas en curso.</p>
            ) : (
              <ul className="day-summary">
                {streaks.map((s) => (
                  <li key={s.id}>
                    <span>🔥 {s.name}</span>
                    <span className="numeric">{s.current}d</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </SectionFrame>
  )
}
