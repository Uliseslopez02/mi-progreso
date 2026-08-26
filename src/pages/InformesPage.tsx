import { useMemo } from 'react'
import { LineChart } from '../components/LineChart'
import { Stat } from '../components/Stat'
import { diffDays, formatLongDate, formatMonthYear, monthDays, startOfMonth } from '../domain/date'
import { monthlyConclusions } from '../domain/monthlyConclusions'
import { monthlyReport } from '../domain/monthlyReport'
import { computeDayStats, formatDelta } from '../domain/scoring'
import { useAppData } from '../state/context'

export function InformesPage() {
  const { data, today } = useAppData()
  const report = useMemo(
    () => monthlyReport(data.days, data.plannerItems, today, data.settings.streakThreshold),
    [data.days, data.plannerItems, today, data.settings.streakThreshold],
  )
  const conclusions = useMemo(() => monthlyConclusions(report), [report])

  const evolutionPoints = useMemo(() => {
    const monthStart = startOfMonth(today)
    return monthDays(monthStart)
      .filter((date) => diffDays(date, today) >= 0)
      .map((date) => ({
        date,
        percent: computeDayStats(data.days[date]).percent,
        hasRecord: Boolean(data.days[date]),
      }))
  }, [data.days, today])

  const deltaClass =
    report.deltaVsPreviousMonth === null || report.deltaVsPreviousMonth === 0
      ? 'delta--flat'
      : report.deltaVsPreviousMonth > 0
        ? 'delta--up'
        : 'delta--down'

  return (
    <div className="stack">
      <section className="card">
        <div className="card__header">
          <h2 className="card__title">Informe de {formatMonthYear(report.monthStart)}</h2>
          <span className="card__hint">
            {report.daysElapsed} {report.daysElapsed === 1 ? 'día transcurrido' : 'días transcurridos'}
          </span>
        </div>

        {report.stats.daysWithRecord === 0 ? (
          <p className="empty">
            Todavía no hay registros este mes. A medida que vayas marcando tus días, este informe se va a
            ir completando.
          </p>
        ) : (
          <>
            <div className="stat-grid">
              <Stat
                label="Cumplimiento del mes"
                value={`${report.stats.average}%`}
                hint={
                  report.deltaVsPreviousMonth === null ? (
                    'Sin mes anterior para comparar'
                  ) : (
                    <span className={deltaClass}>
                      {formatDelta(report.deltaVsPreviousMonth)} respecto al mes anterior
                    </span>
                  )
                }
              />
              <Stat
                label="Mejor día"
                value={report.stats.best ? `${report.stats.best.percent}%` : '—'}
                hint={report.stats.best ? formatLongDate(report.stats.best.date) : 'Sin datos'}
              />
              <Stat
                label="Peor día"
                value={report.stats.worst ? `${report.stats.worst.percent}%` : '—'}
                hint={report.stats.worst ? formatLongDate(report.stats.worst.date) : 'Sin datos'}
              />
              <Stat label="Racha actual" value={`${report.streak} ${report.streak === 1 ? 'día' : 'días'}`} />
              <Stat
                label="Racha máxima del mes"
                value={`${report.bestStreakInMonth} ${report.bestStreakInMonth === 1 ? 'día' : 'días'}`}
              />
              <Stat
                label="Días perfectos"
                value={report.perfectDays}
                hint={report.perfectDays === 1 ? 'día al 100%' : 'días al 100%'}
              />
              <Stat
                label="Categoría más fuerte"
                value={report.bestCategory ? `${report.bestCategory.percent}%` : '—'}
                hint={report.bestCategory ? report.bestCategory.name : 'Sin datos todavía'}
              />
              {report.worstCategory && (
                <Stat
                  label="Categoría a reforzar"
                  value={`${report.worstCategory.percent}%`}
                  hint={report.worstCategory.name}
                />
              )}
              {report.mostConsistentGoal && (
                <Stat
                  label="Objetivo más consistente"
                  value={`${report.mostConsistentGoal.percent}%`}
                  hint={report.mostConsistentGoal.name}
                />
              )}
              {report.hardestGoal && (
                <Stat
                  label="Objetivo más difícil"
                  value={`${report.hardestGoal.percent}%`}
                  hint={report.hardestGoal.name}
                />
              )}
              {report.bestWeekday && (
                <Stat
                  label="Mejor día de la semana"
                  value={`${report.bestWeekday.average}%`}
                  hint={report.bestWeekday.day}
                />
              )}
              {report.plannedVsRealized.planned > 0 && (
                <Stat
                  label="Planificado vs. realizado"
                  value={`${report.plannedVsRealized.done}/${report.plannedVsRealized.planned}`}
                  hint={`${report.plannedVsRealized.percent}% realizado`}
                />
              )}
            </div>

            <div style={{ marginTop: 16 }}>
              <LineChart points={evolutionPoints} average={report.stats.average} />
            </div>

            {conclusions.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h3 className="card__title" style={{ fontSize: '0.95rem', marginBottom: 8 }}>
                  Conclusiones
                </h3>
                <ul className="subgoal-list">
                  {conclusions.map((text) => (
                    <li className="subgoal" key={text}>
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
