import { useMemo, useState } from 'react'
import { LifeGoalCard } from '../../components/LifeGoalCard'
import type { LifeGoalScope } from '../../domain/types'
import { SectionFrame } from '../SectionFrame'
import { DEMO_CATEGORIES, TODAY } from '../demoData'
import { usePresentacion } from '../PresentacionState'

type ScopeFilter = 'all' | LifeGoalScope

const FILTER_LABEL: Record<ScopeFilter, string> = {
  all: 'Todas',
  personal: 'Personales',
  professional: 'Profesionales',
}

/**
 * Recreación de "Objetivos y metas" (Objetivos → Metas): la misma
 * `<LifeGoalCard>` de la app — % de progreso, badges (ámbito, prioridad,
 * ritmo), barra, y el lápiz que abre el `<EditGoalModal>` real. El progreso de
 * una meta de "hábitos vinculados" se calcula solo con `computeLifeGoalProgress`
 * y cambia cuando marcás el hábito arriba.
 */
export function MetasSection() {
  const { goals, days, lifeGoals, updateLifeGoal, removeLifeGoal, moveLifeGoal } = usePresentacion()
  const [filter, setFilter] = useState<ScopeFilter>('all')

  const habits = useMemo(() => goals.filter((g) => g.trackingKind === 'habit' && g.active), [goals])
  const visible = useMemo(
    () =>
      [...lifeGoals]
        .filter((g) => filter === 'all' || g.scope === filter)
        .sort((a, b) => a.order - b.order),
    [lifeGoals, filter],
  )

  return (
    <SectionFrame
      eyebrow="Largo plazo"
      title="Metas: adónde querés llegar, no sólo qué hacés hoy."
      subtitle="Cada meta calcula su progreso sola según su tipo — hábitos vinculados, cantidad, hitos, checklist. Marcá “Caminar 30 minutos” arriba y mirá subir la meta de correr."
      className="pr-metas"
    >
      <section className="card">
        <div className="card__header">
          <h3 className="card__title">Objetivos y metas</h3>
          <span className="card__hint">{visible.length} de {lifeGoals.length}</span>
        </div>

        <div className="chip-list" style={{ marginBottom: 18 }}>
          {(Object.keys(FILTER_LABEL) as ScopeFilter[]).map((key) => (
            <button
              key={key}
              type="button"
              className={`btn btn--ghost${filter === key ? ' btn--primary' : ''}`}
              onClick={() => setFilter(key)}
            >
              {FILTER_LABEL[key]}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <p className="empty">No hay metas en este filtro.</p>
        ) : (
          visible.map((goal, i) => (
            <LifeGoalCard
              key={goal.id}
              goal={goal}
              categories={DEMO_CATEGORIES}
              habits={habits}
              days={days}
              today={TODAY}
              onUpdate={(patch) => updateLifeGoal(goal.id, patch)}
              onRemove={() => removeLifeGoal(goal.id)}
              onMoveUp={i === 0 ? undefined : () => moveLifeGoal(goal.id, -1)}
              onMoveDown={i === visible.length - 1 ? undefined : () => moveLifeGoal(goal.id, 1)}
            />
          ))
        )}
      </section>
    </SectionFrame>
  )
}
