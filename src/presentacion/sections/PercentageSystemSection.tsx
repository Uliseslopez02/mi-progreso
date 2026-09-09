import { useState } from 'react'
import { computeDayStats } from '../../domain/scoring'
import { SectionFrame } from '../SectionFrame'
import { TODAY } from '../demoData'
import { usePresentacion } from '../PresentacionState'

type ExplainKey = 'weight' | 'formula' | 'grade' | 'streak' | null

const EXPLAIN: Record<Exclude<ExplainKey, null>, { label: string; text: string }> = {
  weight: {
    label: 'El peso',
    text: '"Entrenar" pesa 2 y el resto pesa 1. No todos los objetivos valen lo mismo — el cálculo lo respeta desde el primer día, sin tocar código.',
  },
  formula: {
    label: 'La fórmula',
    text: 'Porcentaje = peso completado ÷ peso total × 100. Con todos los pesos en 1 equivale simplemente a "completados / total" — pero acepta cualquier ponderación real.',
  },
  grade: {
    label: 'La nota',
    text: 'El porcentaje mostrado, dividido 10. Si el día dice 73%, la nota es 7,3. Nunca se contradicen entre sí porque salen del mismo número.',
  },
  streak: {
    label: 'La racha',
    text: 'Días consecutivos que llegaron al mínimo (70% por defecto). Si hoy todavía no llegaste, la racha se cuenta desde ayer — así no la "perdés" por mirar la app a la mañana.',
  },
}

/** Pieza fuerte: el sistema de % explicado con la lógica real de `domain/scoring.ts`, no una versión inventada. */
export function PercentageSystemSection() {
  const { days, toggleGoal } = usePresentacion()
  const [active, setActive] = useState<ExplainKey>(null)
  const record = days[TODAY]
  const stats = computeDayStats(record)
  const todayGoals = (record?.goals ?? []).filter((g) => g.trackingKind !== 'habit')

  return (
    <SectionFrame
      eyebrow="El sistema de porcentajes"
      title="¿Qué significa realmente ese número?"
      subtitle="Nada de porcentajes mágicos. Tocá cada pieza y mirá exactamente de dónde sale."
      className="pr-percent"
    >
      <div className="pr-percent__grid">
        <div className="pr-card pr-percent__demo">
          <p className="pr-card__hint">Marcá objetivos y mirá el cálculo moverse</p>
          <ul className="pr-percent__goals">
            {todayGoals.map((goal) => {
              const progress = record?.goalProgress[goal.goalId]
              const done = goal.kind === 'boolean' ? !!progress : Number(progress ?? 0) >= (goal.targetValue ?? 1)
              return (
                <li key={goal.goalId} className="pr-percent__goal">
                  <button
                    type="button"
                    className={`pr-percent__goal-toggle${done ? ' pr-percent__goal-toggle--done' : ''}`}
                    onClick={() => toggleGoal(goal.goalId, goal.kind === 'boolean' ? undefined : 0.5)}
                  >
                    {goal.name}
                  </button>
                  <button
                    type="button"
                    className="pr-percent__pill numeric"
                    onMouseEnter={() => setActive('weight')}
                    onClick={() => setActive('weight')}
                  >
                    peso {goal.weight}
                  </button>
                </li>
              )
            })}
          </ul>

          <div className="pr-percent__result">
            <button type="button" className="pr-percent__stat" onClick={() => setActive('formula')}>
              <span className="numeric">{stats.percent}%</span>
              <span>del día</span>
            </button>
            <button type="button" className="pr-percent__stat" onClick={() => setActive('grade')}>
              <span className="numeric">{(stats.percent / 10).toFixed(1).replace('.', ',')}</span>
              <span>nota</span>
            </button>
            <button type="button" className="pr-percent__stat" onClick={() => setActive('streak')}>
              <span className="numeric">{stats.completedWeight}/{stats.totalWeight}</span>
              <span>peso cumplido</span>
            </button>
          </div>
        </div>

        <div className="pr-card pr-percent__explain">
          {active ? (
            <>
              <p className="pr-percent__explain-label">{EXPLAIN[active].label}</p>
              <p>{EXPLAIN[active].text}</p>
            </>
          ) : (
            <p className="pr-percent__explain-placeholder">Tocá un peso o un número de la izquierda para ver qué representa.</p>
          )}
        </div>
      </div>
    </SectionFrame>
  )
}
