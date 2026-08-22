import type { DateKey } from '../domain/date'
import { formatLongDate } from '../domain/date'
import { computeDayStats, formatGrade, labelForPercent } from '../domain/scoring'
import type { DayRecord } from '../domain/types'
import { GoalList } from './GoalList'

interface Props {
  date: DateKey
  record: DayRecord | undefined
  editable: boolean
  onToggle: (goalId: string) => void
  onProgressChange?: (goalId: string, value: number) => void
}

/** Detalle de un día pasado: qué cumpliste, qué no, porcentaje y nota. */
export function DayDetail({ date, record, editable, onToggle, onProgressChange }: Props) {
  const stats = computeDayStats(record)

  if (!record) {
    return (
      <div className="card">
        <h2 className="card__title">{formatLongDate(date)}</h2>
        <p className="empty">Ese día no quedó registrado.</p>
      </div>
    )
  }

  const done = record.goals.filter((g) => {
    const progress = record.goalProgress[g.goalId]
    if (g.kind === 'boolean') return !!progress
    // Cuantitativo/temporal: completado si alcanzó el target
    if (g.targetValue) return (progress as number) >= g.targetValue
    return !!progress
  })
  const missed = record.goals.filter((g) => {
    const progress = record.goalProgress[g.goalId]
    if (g.kind === 'boolean') return !progress
    if (g.targetValue) return (progress as number) < g.targetValue
    return !progress
  })

  return (
    <div className="card">
      <div className="day-detail__head">
        <div>
          <h2 className="card__title">{formatLongDate(date)}</h2>
          <p className="card__hint">
            {stats.completedCount} de {stats.totalCount} objetivos · {labelForPercent(stats.percent)}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p className="day-detail__percent numeric">{stats.percent}%</p>
          <p className="card__hint numeric">Nota {formatGrade(stats.grade)} / 10</p>
        </div>
      </div>

      {editable ? (
        <div style={{ marginTop: 18 }}>
          <GoalList
            goals={record.goals}
            goalProgress={record.goalProgress}
            onToggle={onToggle}
            onProgressChange={onProgressChange}
          />
        </div>
      ) : (
        <div className="day-detail__lists">
          <div>
            <p className="section-title">Completados</p>
            <ul className="day-detail__list day-detail__list--done">
              {done.length === 0 && <li>Ninguno</li>}
              {done.map((goal) => (
                <li key={goal.goalId}>
                  <span aria-hidden="true">✓</span>
                  <span>{goal.name}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="section-title">Pendientes</p>
            <ul className="day-detail__list">
              {missed.length === 0 && <li>Ninguno</li>}
              {missed.map((goal) => (
                <li key={goal.goalId}>
                  <span aria-hidden="true">·</span>
                  <span>{goal.name}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
