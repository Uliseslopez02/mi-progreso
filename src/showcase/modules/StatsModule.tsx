import { addDays } from '../../domain/date'
import { goalConsistency } from '../../domain/consistency'
import { computeStreak, historySeries, weekSummary } from '../../domain/scoring'
import { DEMO_STREAK_THRESHOLD, TODAY } from '../demoData'
import { ModuleFrame } from '../ModuleFrame'
import { useShowcase } from '../ShowcaseState'

const WINDOW = 14
const RECENT_KEYS = Array.from({ length: WINDOW }, (_, i) => addDays(TODAY, -(WINDOW - 1 - i)))

function Sparkline({ points }: { points: number[] }) {
  const w = 160
  const h = 40
  const step = w / Math.max(1, points.length - 1)
  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${(i * step).toFixed(1)} ${(h - (p / 100) * h).toFixed(1)}`)
    .join(' ')

  return (
    <svg className="sc-sparkline" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Evolución de los últimos 14 días">
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Módulo 5 — estadísticas y rachas, derivadas del mismo historial que Módulo 1/9. */
export function StatsModule() {
  const { days } = useShowcase()

  const streak = computeStreak(days, TODAY, DEMO_STREAK_THRESHOLD)
  const week = weekSummary(days, TODAY, DEMO_STREAK_THRESHOLD)
  const bestHabit = goalConsistency(days, RECENT_KEYS, 'habit')[0]
  const series = historySeries(days, TODAY, WINDOW).map((p) => p.percent)

  return (
    <ModuleFrame eyebrow="Estadísticas" title="Lo que venís sosteniendo" className="sc-module--stats">
      <div className="stat-grid">
        <div className="stat">
          <p className="stat__label">Racha actual</p>
          <p className="stat__value numeric">{streak} días</p>
        </div>
        <div className="stat">
          <p className="stat__label">Mejor hábito</p>
          <p className="stat__value numeric">{bestHabit ? `${bestHabit.percent}%` : '—'}</p>
          <p className="stat__hint">{bestHabit?.name ?? 'Sin datos todavía'}</p>
        </div>
        <div className="stat">
          <p className="stat__label">Progreso semanal</p>
          <p className="stat__value numeric">{week.average}%</p>
          {week.delta !== null && (
            <p className={`stat__hint ${week.delta >= 0 ? 'delta--up' : 'delta--down'}`}>
              {week.delta >= 0 ? '+' : ''}
              {week.delta}% vs. semana anterior
            </p>
          )}
        </div>
      </div>
      <Sparkline points={series} />
    </ModuleFrame>
  )
}
