import { useMemo, useState } from 'react'
import { LineChart } from '../../components/LineChart'
import { Stat } from '../../components/Stat'
import { WeekCard } from '../../components/WeekCard'
import { formatLongDate } from '../../domain/date'
import { aggregate, computeStreak, historySeries, weekSummary } from '../../domain/scoring'
import { SectionFrame } from '../SectionFrame'
import { DEMO_STREAK_THRESHOLD, TODAY } from '../demoData'
import { usePresentacion } from '../PresentacionState'

const RANGES = [7, 14, 30, 90] as const

/**
 * Recreación de "Esta semana" (`<WeekCard>`, en Hoy e Historial) y del
 * "Resumen de los últimos N días" de Historial: mismo `weekSummary`, mismo
 * `aggregate`, mismo `computeStreak`, mismo `<LineChart>`. La racha son días
 * seguidos con {umbral}% o más — no una racha de "abrir la app".
 */
export function ProgressSection() {
  const { days } = usePresentacion()
  const [range, setRange] = useState<(typeof RANGES)[number]>(14)

  const summary = useMemo(() => weekSummary(days, TODAY, DEMO_STREAK_THRESHOLD), [days])
  const series = useMemo(() => historySeries(days, TODAY, range), [days, range])
  const stats = useMemo(() => aggregate(days, series.map((p) => p.date)), [days, series])
  const streak = useMemo(() => computeStreak(days, TODAY, DEMO_STREAK_THRESHOLD), [days])

  return (
    <SectionFrame
      eyebrow="Tu progreso"
      title="No es un solo día. Es el patrón de tus semanas y meses."
      subtitle="El mismo cálculo del día se agrega en el tiempo: promedio, comparación contra el período anterior, mejor y peor día, y la racha — días seguidos que llegaron al mínimo."
      className="pr-progress"
    >
      <div className="pr-progress__stack">
        <WeekCard summary={summary} threshold={DEMO_STREAK_THRESHOLD} />

        <section className="card">
          <div className="card__header">
            <h3 className="card__title">Resumen de los últimos {range} días</h3>
            <div className="nav" role="group" aria-label="Rango del historial">
              {RANGES.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`nav__item${option === range ? ' nav__item--active' : ''}`}
                  onClick={() => setRange(option)}
                >
                  {option} días
                </button>
              ))}
            </div>
          </div>

          <LineChart points={series} average={stats.average} />

          <div className="stat-grid" style={{ marginTop: 16 }}>
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
              hint={`Con ${DEMO_STREAK_THRESHOLD}% o más`}
            />
            <Stat
              label="Objetivos completados"
              value={stats.completedGoals}
              hint={`En los últimos ${range} días`}
            />
          </div>
        </section>
      </div>

      <p className="pr-progress__note">
        Este mismo motor alimenta Informes (cumplimiento del mes, mejor y peor categoría, racha
        máxima del mes, días perfectos al 100%) y una Revisión mensual guiada de 4 pasos con
        preguntas de reflexión — para cerrar el mes con más que un número.
      </p>
    </SectionFrame>
  )
}
