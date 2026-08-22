import { computeDayStats, weekSummary } from '../../domain/scoring'
import { DEMO_STREAK_THRESHOLD, TODAY } from '../demoData'
import { ProgressRing } from '../../components/ProgressRing'
import { ModuleFrame } from '../ModuleFrame'
import { useShowcase } from '../ShowcaseState'

/** Módulo 9 — ancla de la composición: el mismo % que calcularía la app real, nada inventado. */
export function OverallProgressModule() {
  const { days } = useShowcase()
  const stats = computeDayStats(days[TODAY])
  const week = weekSummary(days, TODAY, DEMO_STREAK_THRESHOLD)

  const trendText =
    week.delta === null
      ? 'Así arranca tu semana.'
      : week.delta >= 0
        ? `Esta semana avanzaste un ${week.delta}% más que la anterior.`
        : `Esta semana bajaste ${Math.abs(week.delta)}% — todavía estás a tiempo.`

  return (
    <ModuleFrame eyebrow="Mi Progreso" title="Tu progreso" className="sc-module--overall">
      <ProgressRing percent={stats.percent} size={188} strokeWidth={13} caption="hoy" />
      <p className="sc-overall__trend">{trendText}</p>
    </ModuleFrame>
  )
}
