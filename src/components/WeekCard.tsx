import { formatShortDate } from '../domain/date'
import { formatDelta } from '../domain/scoring'
import type { WeekSummary } from '../domain/scoring'
import { Stat } from './Stat'

interface Props {
  summary: WeekSummary
  threshold: number
}

/** Tarjeta "Esta semana": el número que dice si estoy mejorando o no. */
export function WeekCard({ summary, threshold }: Props) {
  const deltaClass =
    summary.delta === null || summary.delta === 0
      ? 'delta--flat'
      : summary.delta > 0
        ? 'delta--up'
        : 'delta--down'

  return (
    <section className="card">
      <div className="card__header">
        <h2 className="card__title">Esta semana</h2>
        <span className="card__hint">Desde el {formatShortDate(summary.weekStart)}</span>
      </div>

      <div className="stat-grid">
        <Stat
          label="Promedio"
          value={`${summary.average}%`}
          hint={
            summary.delta === null ? (
              'Sin semana anterior para comparar'
            ) : (
              <span className={deltaClass}>
                {formatDelta(summary.delta)} respecto de la semana anterior
              </span>
            )
          }
        />
        <Stat
          label="Objetivos completados"
          value={summary.completedGoals}
          hint={`En ${summary.daysWithRecord} ${summary.daysWithRecord === 1 ? 'día' : 'días'}`}
        />
        <Stat
          label="Mejor día"
          value={summary.best ? `${summary.best.percent}%` : '—'}
          hint={summary.best ? formatShortDate(summary.best.date) : 'Sin datos'}
        />
        <Stat
          label="Peor día"
          value={summary.worst ? `${summary.worst.percent}%` : '—'}
          hint={summary.worst ? formatShortDate(summary.worst.date) : 'Sin datos'}
        />
        <Stat
          label="Racha"
          value={
            <span className="streak">
              <span className="streak__flame" aria-hidden="true">
                🔥
              </span>
              {summary.streak} {summary.streak === 1 ? 'día' : 'días'}
            </span>
          }
          hint={`Días seguidos con ${threshold}% o más`}
        />
      </div>
    </section>
  )
}
