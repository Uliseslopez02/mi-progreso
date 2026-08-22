import { GoalList } from './GoalList'
import { computeDayStats } from '../domain/scoring'
import type { PeriodRecord } from '../domain/types'

interface Props {
  title: string
  subtitle: string
  record: PeriodRecord | undefined
  onToggle: (goalId: string) => void
  onProgressChange?: (goalId: string, value: number) => void
}

/** Misma mecánica que "Objetivos de hoy", pero para la ventana semanal/mensual vigente. */
export function PeriodGoalsCard({ title, subtitle, record, onToggle, onProgressChange }: Props) {
  const stats = computeDayStats(record)

  return (
    <section className="card">
      <div className="card__header">
        <div>
          <h2 className="card__title">{title}</h2>
          <p className="card__hint">{subtitle}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p className="day-detail__percent numeric">{stats.percent}%</p>
          <p className="card__hint numeric">
            {stats.completedCount}/{stats.totalCount}
          </p>
        </div>
      </div>
      <GoalList
        goals={record?.goals ?? []}
        goalProgress={record?.goalProgress ?? {}}
        onToggle={onToggle}
        onProgressChange={onProgressChange}
      />
    </section>
  )
}
