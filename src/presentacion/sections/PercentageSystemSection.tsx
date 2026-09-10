import { useState } from 'react'
import { GoalList } from '../../components/GoalList'
import { computeDayStats, formatGrade } from '../../domain/scoring'
import { SectionFrame } from '../SectionFrame'
import { TODAY } from '../demoData'
import { usePresentacion } from '../PresentacionState'

type ExplainKey = 'weight' | 'formula' | 'grade' | 'streak' | null

const EXPLAIN: Record<Exclude<ExplainKey, null>, { label: string; text: string }> = {
  weight: {
    label: 'El peso',
    text: 'Cada objetivo tiene un peso (por defecto los objetivos de ejemplo suman 100). No todos valen lo mismo. En la lista sólo se muestra un ×N cuando el peso no es 1; el peso se edita en Objetivos → Editar.',
  },
  formula: {
    label: 'La fórmula',
    text: 'Porcentaje del día = peso completado ÷ peso total × 100, siempre sobre los objetivos reales de ese día. Un objetivo de cantidad suma su peso en proporción (2 de 4 = medio peso).',
  },
  grade: {
    label: 'La nota',
    text: 'El porcentaje mostrado, dividido 10. Si el día dice 73%, la nota es 7,3. Salen del mismo número, nunca se contradicen.',
  },
  streak: {
    label: 'La racha',
    text: 'Días consecutivos cuyo porcentaje llegó al mínimo (70% por defecto, configurable en Ajustes). Si hoy todavía no llegaste, la racha se cuenta desde ayer para no perderla por mirar la app a la mañana.',
  },
}

/** Explicación del sistema de % con la lógica real de `domain/scoring.ts`, y el
 * peso editable igual que en Objetivos → Editar (input numérico, 1–999). */
export function PercentageSystemSection() {
  const { goals, days, toggleGoal, setGoalProgress, updateGoal } = usePresentacion()
  const [active, setActive] = useState<ExplainKey>('formula')
  const record = days[TODAY]
  const stats = computeDayStats(record)
  const todayGoals = (record?.goals ?? []).filter((g) => g.trackingKind !== 'habit')
  const dailyGoals = goals.filter((g) => g.trackingKind !== 'habit' && g.period === 'daily')

  return (
    <SectionFrame
      eyebrow="El sistema de porcentajes"
      title="¿Qué significa realmente ese número?"
      subtitle="Nada de porcentajes mágicos. Marcá objetivos, cambiá un peso, y mirá exactamente de dónde sale."
      className="pr-percent"
    >
      <div className="pr-percent__grid">
        <section className="card">
          <div className="card__header">
            <h3 className="card__title">Marcá tus objetivos</h3>
          </div>
          <GoalList
            goals={todayGoals}
            goalProgress={record?.goalProgress ?? {}}
            onToggle={toggleGoal}
            onProgressChange={setGoalProgress}
          />
          <div className="pr-percent__result">
            <button type="button" className="pr-percent__stat" onClick={() => setActive('formula')}>
              <span className="numeric">{stats.percent}%</span>
              <span>del día</span>
            </button>
            <button type="button" className="pr-percent__stat" onClick={() => setActive('grade')}>
              <span className="numeric">{formatGrade(stats.grade)}</span>
              <span>nota</span>
            </button>
            <button type="button" className="pr-percent__stat" onClick={() => setActive('formula')}>
              <span className="numeric">
                {Math.round(stats.completedWeight)}/{stats.totalWeight}
              </span>
              <span>peso cumplido</span>
            </button>
          </div>
        </section>

        <section className="card">
          <div className="card__header">
            <h3 className="card__title">Editá el peso</h3>
            <span className="card__hint">En la app: Objetivos → Editar</span>
          </div>
          <div className="pr-percent__editor">
            {dailyGoals.map((goal) => (
              <div className="pr-percent__editor-row" key={goal.id}>
                <input
                  className="input"
                  aria-label={`Nombre de ${goal.name}`}
                  value={goal.name}
                  onChange={(e) => updateGoal(goal.id, { name: e.target.value })}
                />
                <input
                  className="input pr-percent__weight-input"
                  type="number"
                  min={1}
                  max={999}
                  aria-label={`Peso de ${goal.name}`}
                  value={goal.weight}
                  onChange={(e) => {
                    const weight = Number(e.target.value)
                    if (!Number.isFinite(weight)) return
                    updateGoal(goal.id, { weight: Math.min(999, Math.max(1, Math.round(weight))) })
                  }}
                />
              </div>
            ))}
          </div>
          <p className="pr-percent__editor-hint">
            Suma de pesos: <span className="numeric">{dailyGoals.reduce((sum, g) => sum + g.weight, 0)}</span>{' '}
            · el % del día se recalcula al instante.
          </p>
        </section>
      </div>

      <div className="pr-percent__explain">
        <div className="pr-percent__chips">
          {(Object.keys(EXPLAIN) as Array<Exclude<ExplainKey, null>>).map((key) => (
            <button
              key={key}
              type="button"
              className={`pr-percent__chip${active === key ? ' pr-percent__chip--active' : ''}`}
              onClick={() => setActive(key)}
            >
              {EXPLAIN[key].label}
            </button>
          ))}
        </div>
        {active && <p className="pr-percent__explain-text">{EXPLAIN[active].text}</p>}
      </div>
    </SectionFrame>
  )
}
