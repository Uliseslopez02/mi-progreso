import { useState } from 'react'
import { computeDayStats } from '../../domain/scoring'
import { DEMO_GOALS, TODAY } from '../demoData'
import { ModuleFrame } from '../ModuleFrame'
import { useShowcase } from '../ShowcaseState'

type ExplainKey = 'weight' | 'formula' | 'grade' | 'streak'

const EXPLAIN: Record<ExplainKey, { label: string; text: string }> = {
  weight: {
    label: 'El peso',
    text: '"Entrenar" pesa 2 y el resto pesa 1. No todos los objetivos valen lo mismo — el cálculo lo respeta desde el primer día, sin tocar código.',
  },
  formula: {
    label: 'La fórmula',
    text: 'Porcentaje = peso completado ÷ peso total × 100. Con todos los pesos en 1 equivale a "completados / total"; con pesos reales, refleja lo que de verdad importa más.',
  },
  grade: {
    label: 'La nota',
    text: 'El porcentaje mostrado, dividido 10. Si el día dice 73%, la nota es 7,3. Nunca se contradicen entre sí porque salen del mismo número.',
  },
  streak: {
    label: 'El peso cumplido',
    text: 'Cuánto peso completaste sobre el total del día. Es el numerador y el denominador de la fórmula, a la vista.',
  },
}

/**
 * Módulo — Sistema de porcentajes: el mismo `computeDayStats` que usa la app
 * real, con la ponderación a la vista. Tocá un objetivo para moverlo, o un
 * número para ver de dónde sale.
 */
export function PercentModule() {
  const { days, toggleGoal } = useShowcase()
  const [active, setActive] = useState<ExplainKey>('formula')
  const record = days[TODAY]
  const stats = computeDayStats(record)

  return (
    <ModuleFrame
      eyebrow="Sistema de porcentajes"
      title="Qué significa ese número"
      className="sc-module--percent"
      hint="Tocá un objetivo o un dato"
    >
      <ul className="sc-percent__goals">
        {DEMO_GOALS.map((goal) => {
          const progress = record?.goalProgress[goal.id]
          const done = goal.kind === 'boolean' ? !!progress : Number(progress ?? 0) >= (goal.targetValue ?? 1)
          return (
            <li key={goal.id} className="sc-percent__goal">
              <button
                type="button"
                className={`sc-percent__goal-toggle${done ? ' sc-percent__goal-toggle--done' : ''}`}
                onClick={() => toggleGoal(goal.id, goal.kind === 'boolean' ? true : 1)}
              >
                {goal.name}
              </button>
              <button
                type="button"
                className="sc-percent__pill numeric"
                onClick={() => setActive('weight')}
              >
                peso {goal.weight}
              </button>
            </li>
          )
        })}
      </ul>

      <div className="sc-percent__result">
        <button type="button" className="sc-percent__stat" onClick={() => setActive('formula')}>
          <span className="numeric">{stats.percent}%</span>
          <span>del día</span>
        </button>
        <button type="button" className="sc-percent__stat" onClick={() => setActive('grade')}>
          <span className="numeric">{(stats.percent / 10).toFixed(1).replace('.', ',')}</span>
          <span>nota</span>
        </button>
        <button type="button" className="sc-percent__stat" onClick={() => setActive('streak')}>
          <span className="numeric">
            {+stats.completedWeight.toFixed(1)}/{stats.totalWeight}
          </span>
          <span>peso cumplido</span>
        </button>
      </div>

      <div className="sc-percent__explain">
        <p className="sc-percent__explain-label">{EXPLAIN[active].label}</p>
        <p>{EXPLAIN[active].text}</p>
      </div>
    </ModuleFrame>
  )
}
