import { useMemo, useState } from 'react'
import { ConsistencyCard } from '../components/ConsistencyCard'
import { HabitStreaksCard } from '../components/HabitStreaksCard'
import { LifeGoalHealthCard } from '../components/LifeGoalHealthCard'
import { LineChart } from '../components/LineChart'
import { Stat } from '../components/Stat'
import { WeekCard } from '../components/WeekCard'
import { ProBadge } from '../components/ProBadge'
import { UpgradeCard } from '../components/UpgradeCard'
import { categoryConsistency, goalConsistency, habitStreakBreakdown } from '../domain/consistency'
import { formatLongDate } from '../domain/date'
import { lifeGoalHealth } from '../domain/lifeGoalHealth'
import { PRO_HISTORY_RANGES, historyRangesFor, isProHistoryRange } from '../domain/plan'
import { aggregate, computeStreak, historySeries, weekSummary } from '../domain/scoring'
import { useAppData } from '../state/context'

const RANGE_LABEL: Record<number, string> = { 7: '7 días', 14: '14 días', 30: '30 días', 90: '90 días', 365: '1 año' }

export function HistoryPage() {
  const { data, today, plan } = useAppData()
  const [range, setRange] = useState<number>(14)
  const [rangeUpgrade, setRangeUpgrade] = useState(false)
  const allowedRanges = historyRangesFor(plan)

  const chooseRange = (option: number) => {
    if (allowedRanges.includes(option)) {
      setRange(option)
      setRangeUpgrade(false)
    } else {
      setRangeUpgrade(true)
    }
  }

  const series = useMemo(() => historySeries(data.days, today, range), [data.days, today, range])
  const stats = useMemo(
    () => aggregate(data.days, series.map((point) => point.date)),
    [data.days, series],
  )
  const streak = useMemo(
    () => computeStreak(data.days, today, data.settings.streakThreshold),
    [data.days, today, data.settings.streakThreshold],
  )
  const summary = useMemo(
    () => weekSummary(data.days, today, data.settings.streakThreshold),
    [data.days, today, data.settings.streakThreshold],
  )
  const rangeKeys = useMemo(() => series.map((p) => p.date), [series])
  const goals = useMemo(() => goalConsistency(data.days, rangeKeys, 'goal'), [data.days, rangeKeys])
  const categories = useMemo(
    () => categoryConsistency(data.days, rangeKeys, 'goal'),
    [data.days, rangeKeys],
  )
  const habitConsistency = useMemo(
    () => goalConsistency(data.days, rangeKeys, 'habit'),
    [data.days, rangeKeys],
  )
  const habitCategories = useMemo(
    () => categoryConsistency(data.days, rangeKeys, 'habit'),
    [data.days, rangeKeys],
  )
  const habits = useMemo(
    () => data.goals.filter((g) => g.trackingKind === 'habit' && g.active),
    [data.goals],
  )
  const streaks = useMemo(
    () => habitStreakBreakdown(habits, data.days, today),
    [habits, data.days, today],
  )
  const goalsHealth = useMemo(() => lifeGoalHealth(data.lifeGoals, today), [data.lifeGoals, today])

  return (
    <div className="stack">
      <section className="card">
        <div className="card__header">
          <h2 className="card__title">Progreso diario (%)</h2>
          <div className="nav" role="group" aria-label="Rango del historial">
            {PRO_HISTORY_RANGES.map((option) => {
              const locked = !allowedRanges.includes(option)
              return (
                <button
                  key={option}
                  type="button"
                  className={`nav__item${option === range ? ' nav__item--active' : ''}`}
                  onClick={() => chooseRange(option)}
                >
                  {RANGE_LABEL[option]}
                  {locked && isProHistoryRange(option) && (
                    <>
                      {' '}
                      <ProBadge from="historyRange" static />
                    </>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <LineChart points={series} average={stats.average} />
        {rangeUpgrade && <UpgradeCard limit="historyRange" compact />}
      </section>

      <section className="card">
        <div className="card__header">
          <h2 className="card__title">Resumen de los últimos {range} días</h2>
          <span className="card__hint">
            {stats.daysWithRecord} {stats.daysWithRecord === 1 ? 'día' : 'días'} con registro
          </span>
        </div>
        <div className="stat-grid">
          <Stat label="Promedio" value={`${stats.average}%`} hint="Sobre los días registrados" />
          <Stat
            label="Mejor día"
            value={stats.best ? `${stats.best.percent}%` : '—'}
            hint={stats.best ? formatLongDate(stats.best.date) : 'Sin datos'}
          />
          <Stat
            label="Peor día"
            value={stats.worst ? `${stats.worst.percent}%` : '—'}
            hint={stats.worst ? formatLongDate(stats.worst.date) : 'Sin datos'}
          />
          <Stat
            label="Días consecutivos"
            value={`${streak} ${streak === 1 ? 'día' : 'días'}`}
            hint={`Con ${data.settings.streakThreshold}% o más`}
          />
          <Stat
            label="Objetivos completados"
            value={stats.completedGoals}
            hint={`En los últimos ${range} días`}
          />
        </div>
      </section>

      <ConsistencyCard goals={goals} categories={categories} rangeDays={range} />

      <ConsistencyCard
        goals={habitConsistency}
        categories={habitCategories}
        rangeDays={range}
        title="Constancia por hábito"
        emptyMessage="Todavía no tenés hábitos con historial para comparar."
      />

      <HabitStreaksCard active={streaks.active} broken={streaks.broken} />

      <LifeGoalHealthCard health={goalsHealth} today={today} />

      <WeekCard summary={summary} threshold={data.settings.streakThreshold} />
    </div>
  )
}
