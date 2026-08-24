import { useMemo } from 'react'
import { GoalList } from '../components/GoalList'
import { PeriodGoalsCard } from '../components/PeriodGoalsCard'
import { ProgressRing } from '../components/ProgressRing'
import { WeekCard } from '../components/WeekCard'
import { goalCompletionOn } from '../domain/consistency'
import {
  activeRoutineToday,
  greetingForHour,
  mainPriorityToday,
  nextEventToday,
  topActiveStreaks,
} from '../domain/dashboard'
import { addDays, formatLongDate, formatMonthYear, formatShortDate } from '../domain/date'
import { periodKey, periodStartFor } from '../domain/period'
import {
  computeDayStats,
  formatGrade,
  labelForPercent,
  messageForPercent,
  weekSummary,
} from '../domain/scoring'
import { useAppData } from '../state/context'

const PRIORITY_LABEL: Record<string, string> = { low: 'Baja', medium: 'Media', high: 'Alta' }

interface Props {
  onNavigate: (path: string) => void
}

export function TodayPage({ onNavigate }: Props) {
  const { data, today, dispatch } = useAppData()
  const record = data.days[today]
  const stats = computeDayStats(record)
  // Los hábitos tienen su propia sección (Hábitos): acá sólo objetivos que puntúan.
  const todayGoals = useMemo(
    () => (record?.goals ?? []).filter((g) => g.trackingKind !== 'habit'),
    [record?.goals],
  )
  const todayHabits = useMemo(
    () => (record?.goals ?? []).filter((g) => g.trackingKind === 'habit'),
    [record?.goals],
  )
  const habitsCompleted = useMemo(
    () => todayHabits.filter((h) => goalCompletionOn(record, h.goalId) === true).length,
    [todayHabits, record],
  )

  const summary = useMemo(
    () => weekSummary(data.days, today, data.settings.streakThreshold),
    [data.days, today, data.settings.streakThreshold],
  )

  const weekStart = periodStartFor(today, 'weekly')
  const weekRecord = data.periods[periodKey('weekly', weekStart)]
  const monthStart = periodStartFor(today, 'monthly')
  const monthRecord = data.periods[periodKey('monthly', monthStart)]

  const greeting = useMemo(() => greetingForHour(new Date().getHours()), [])
  const priority = useMemo(() => mainPriorityToday(data.plannerItems, today), [data.plannerItems, today])
  const nextEvent = useMemo(() => nextEventToday(data.plannerItems, today), [data.plannerItems, today])
  const routine = useMemo(
    () => activeRoutineToday(data.routines, data.routineRuns, today),
    [data.routines, data.routineRuns, today],
  )
  const streaks = useMemo(
    () => topActiveStreaks(data.goals, data.days, today),
    [data.goals, data.days, today],
  )

  return (
    <div className="stack">
      <div className="today-grid">
        <section className="card hero">
          <p className="hero__eyebrow">
            {greeting} · {formatLongDate(today)}
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

        <section className="card" id="objetivos-de-hoy">
          <div className="card__header">
            <h2 className="card__title">Objetivos de hoy</h2>
            <span className="card__hint">{formatLongDate(today)}</span>
          </div>
          <GoalList
            goals={todayGoals}
            goalProgress={record?.goalProgress ?? {}}
            onToggle={(goalId) => dispatch({ type: 'toggleGoal', date: today, goalId })}
            onProgressChange={(goalId, value) =>
              dispatch({ type: 'setGoalProgress', date: today, goalId, value })
            }
          />
        </section>
      </div>

      <div className="period-grid">
        <section className="card">
          <div className="card__header">
            <h2 className="card__title">Tu día</h2>
          </div>
          <ul className="day-summary">
            <li>
              <span>Objetivos pendientes</span>
              <span className="numeric">
                {stats.totalCount - stats.completedCount} de {stats.totalCount}
              </span>
            </li>
            <li>
              <span>Hábitos pendientes</span>
              <span className="numeric">
                {todayHabits.length - habitsCompleted} de {todayHabits.length}
              </span>
            </li>
            <li>
              <span>Rutina activa</span>
              <span>
                {routine ? (
                  <>
                    {routine.routine.name}{' '}
                    <span className="numeric">
                      ({routine.done}/{routine.total})
                    </span>
                  </>
                ) : (
                  'Sin pendientes'
                )}
              </span>
            </li>
            <li>
              <span>Próximo evento</span>
              <span>{nextEvent ? nextEvent.title : 'Sin eventos hoy'}</span>
            </li>
          </ul>
        </section>

        <section className="card">
          <div className="card__header">
            <h2 className="card__title">Prioridad principal</h2>
          </div>
          {priority ? (
            <>
              <p style={{ fontSize: '1.05rem', fontWeight: 650, marginBottom: 8 }}>{priority.title}</p>
              <span className={`pill pill--priority-${priority.priority}`}>
                {PRIORITY_LABEL[priority.priority]}
              </span>
            </>
          ) : (
            <p className="empty">No tenés tareas pendientes para hoy en el planificador.</p>
          )}
        </section>

        <section className="card">
          <div className="card__header">
            <h2 className="card__title">Rachas activas</h2>
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

        <section className="card">
          <div className="card__header">
            <h2 className="card__title">Accesos rápidos</h2>
          </div>
          <div className="chip-list">
            <button type="button" className="btn btn--ghost" onClick={() => onNavigate('/objetivos/rutinas')}>
              Iniciar rutina
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => onNavigate('/agenda')}>
              Planificar semana
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => onNavigate('/agenda/enfoque')}>
              Iniciar enfoque
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => onNavigate('/agenda')}>
              Agregar tarea
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() =>
                document.getElementById('objetivos-de-hoy')?.scrollIntoView({ behavior: 'smooth' })
              }
            >
              Registrar progreso
            </button>
          </div>
        </section>
      </div>

      {(weekRecord || monthRecord) && (
        <div className="period-grid">
          {weekRecord && (
            <PeriodGoalsCard
              title="Objetivos de la semana"
              subtitle={`${formatShortDate(weekStart)} – ${formatShortDate(addDays(weekStart, 6))}`}
              record={weekRecord}
              onToggle={(goalId) => dispatch({ type: 'togglePeriodGoal', period: 'weekly', goalId })}
              onProgressChange={(goalId, value) =>
                dispatch({ type: 'setPeriodGoalProgress', period: 'weekly', goalId, value })
              }
            />
          )}
          {monthRecord && (
            <PeriodGoalsCard
              title="Objetivos del mes"
              subtitle={formatMonthYear(monthStart)}
              record={monthRecord}
              onToggle={(goalId) => dispatch({ type: 'togglePeriodGoal', period: 'monthly', goalId })}
              onProgressChange={(goalId, value) =>
                dispatch({ type: 'setPeriodGoalProgress', period: 'monthly', goalId, value })
              }
            />
          )}
        </div>
      )}

      <WeekCard summary={summary} threshold={data.settings.streakThreshold} />
    </div>
  )
}
