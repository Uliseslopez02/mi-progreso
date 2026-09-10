import { useMemo } from 'react'
import { LineChart } from '../../components/LineChart'
import { Stat } from '../../components/Stat'
import { diffDays, formatLongDate, formatMonthYear, monthDays, startOfMonth } from '../../domain/date'
import { monthlyConclusions } from '../../domain/monthlyConclusions'
import { monthlyReport } from '../../domain/monthlyReport'
import { computeDayStats, formatDelta } from '../../domain/scoring'
import { SectionFrame } from '../SectionFrame'
import { usePresentacion } from '../PresentacionState'
import { DEMO_STREAK_THRESHOLD, TODAY } from '../demoData'

/**
 * Recreación de Informes → Resumen: el mismo `monthlyReport`/`monthlyConclusions`
 * (domain puro, sin dato inventado) y el mismo stat-grid + `<LineChart>` de
 * `InformesPage`. La Revisión mensual (wizard de 4 pasos) sigue narrada en
 * "Y también" — es un flujo separado, no un informe.
 */
export function InformesSection() {
  const { days, plannerItems } = usePresentacion()

  const report = useMemo(
    () => monthlyReport(days, plannerItems, TODAY, DEMO_STREAK_THRESHOLD),
    [days, plannerItems],
  )
  const conclusions = useMemo(() => monthlyConclusions(report), [report])

  const evolutionPoints = useMemo(() => {
    const monthStart = startOfMonth(TODAY)
    return monthDays(monthStart)
      .filter((date) => diffDays(date, TODAY) >= 0)
      .map((date) => ({
        date,
        percent: computeDayStats(days[date]).percent,
        hasRecord: Boolean(days[date]),
      }))
  }, [days])

  const deltaClass =
    report.deltaVsPreviousMonth === null || report.deltaVsPreviousMonth === 0
      ? 'delta--flat'
      : report.deltaVsPreviousMonth > 0
        ? 'delta--up'
        : 'delta--down'

  return (
    <SectionFrame
      eyebrow="Informes"
      title="El mes, resumido en números que salen solos."
      subtitle="Mismo motor que Historial, agregado por mes: cumplimiento, mejor y peor categoría, racha máxima, días perfectos. Ninguna frase se inventa — sólo aparece si el dato existe."
      className="pr-informes"
    >
      <section className="card">
        <div className="card__header">
          <h3 className="card__title">Informe de {formatMonthYear(report.monthStart)}</h3>
          <span className="card__hint">
            {report.daysElapsed} {report.daysElapsed === 1 ? 'día transcurrido' : 'días transcurridos'}
          </span>
        </div>

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
            <h4 className="card__title" style={{ fontSize: '0.95rem', marginBottom: 8 }}>
              Conclusiones
            </h4>
            <ul className="subgoal-list">
              {conclusions.map((text) => (
                <li className="subgoal" key={text}>
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </SectionFrame>
  )
}
