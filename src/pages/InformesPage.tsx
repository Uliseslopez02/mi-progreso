import { useMemo } from 'react'
import { Stat } from '../components/Stat'
import { formatLongDate, formatMonthYear } from '../domain/date'
import { monthlyReport } from '../domain/monthlyReport'
import { useAppData } from '../state/context'

export function InformesPage() {
  const { data, today } = useAppData()
  const report = useMemo(
    () => monthlyReport(data.days, today, data.settings.streakThreshold),
    [data.days, today, data.settings.streakThreshold],
  )

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
          <div className="stat-grid">
            <Stat
              label="Cumplimiento del mes"
              value={`${report.stats.average}%`}
              hint="Promedio de los días registrados"
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
          </div>
        )}
      </section>
    </div>
  )
}
