import { computeStreak, formatDelta, weekSummary } from '../../domain/scoring'
import { SectionFrame } from '../SectionFrame'
import { DEMO_STREAK_THRESHOLD, TODAY } from '../demoData'
import { usePresentacion } from '../PresentacionState'

/** Cómo se ve el progreso agregado: resumen semanal real (`weekSummary`), mismo que usa "Hoy" e Informes. */
export function ProgressSection() {
  const { days } = usePresentacion()
  const summary = weekSummary(days, TODAY, DEMO_STREAK_THRESHOLD)
  const streak = computeStreak(days, TODAY, DEMO_STREAK_THRESHOLD)

  return (
    <SectionFrame
      eyebrow="Tu progreso"
      title="No es un solo día. Es el patrón de tus semanas y meses."
      subtitle="El mismo cálculo del día se agrega en el tiempo: promedio semanal, comparación contra la semana anterior, mejor y peor día, racha en curso."
      className="pr-progress"
    >
      <div className="pr-progress__grid">
        <Stat label="Promedio esta semana" value={`${summary.average}%`} />
        <Stat
          label="vs. semana anterior"
          value={summary.delta === null ? '—' : formatDelta(summary.delta)}
          tone={summary.delta !== null && summary.delta < 0 ? 'down' : 'up'}
        />
        <Stat label="Mejor día" value={summary.best ? `${summary.best.percent}%` : '—'} />
        <Stat label="Racha actual" value={`${streak} ${streak === 1 ? 'día' : 'días'}`} />
      </div>
      <p className="pr-progress__note">
        Este mismo motor de cálculo alimenta Informes (promedio del mes, mejor y peor categoría, racha
        máxima del mes, días perfectos) y una Revisión mensual guiada de 4 pasos con preguntas de
        reflexión — pensada para cerrar el mes con más que un número.
      </p>
    </SectionFrame>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'up' | 'down' }) {
  return (
    <div className={`pr-card pr-progress__stat${tone ? ` pr-progress__stat--${tone}` : ''}`}>
      <span className="numeric">{value}</span>
      <span>{label}</span>
    </div>
  )
}
