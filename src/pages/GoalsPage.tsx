import { useMemo, useState } from 'react'
import { LifeGoalCard } from '../components/LifeGoalCard'
import { createId } from '../domain/id'
import type { LifeGoalPriority, LifeGoalScope } from '../domain/types'
import { useAppData } from '../state/context'

type ScopeFilter = 'all' | LifeGoalScope

const SCOPE_FILTER_LABEL: Record<ScopeFilter, string> = {
  all: 'Todas',
  personal: 'Personales',
  professional: 'Profesionales',
}

/** Objetivos y metas: visión de largo plazo, separada de los objetivos diarios. */
export function GoalsPage() {
  const { data, dispatch } = useAppData()
  const [filter, setFilter] = useState<ScopeFilter>('all')
  const [newName, setNewName] = useState('')
  const [newScope, setNewScope] = useState<LifeGoalScope>('personal')
  const [newPriority, setNewPriority] = useState<LifeGoalPriority>('medium')

  const habits = useMemo(
    () => data.goals.filter((g) => g.trackingKind === 'habit' && g.active),
    [data.goals],
  )

  const lifeGoals = useMemo(
    () =>
      [...data.lifeGoals]
        .filter((g) => filter === 'all' || g.scope === filter)
        .sort((a, b) => a.order - b.order),
    [data.lifeGoals, filter],
  )

  const addGoal = () => {
    const name = newName.trim()
    if (!name) return
    dispatch({
      type: 'addLifeGoal',
      goal: {
        id: createId('meta'),
        name,
        scope: newScope,
        priority: newPriority,
        progress: 0,
        status: 'active',
        subGoals: [],
        linkedHabitIds: [],
        order: data.lifeGoals.length,
        createdAt: new Date().toISOString(),
      },
    })
    setNewName('')
    setNewPriority('medium')
  }

  const move = (id: string, direction: -1 | 1) => dispatch({ type: 'moveLifeGoal', id, direction })

  return (
    <div className="stack">
      <section className="card">
        <div className="card__header">
          <h2 className="card__title">Objetivos y metas</h2>
          <span className="card__hint">
            {data.lifeGoals.filter((g) => g.status === 'active').length} activas de{' '}
            {data.lifeGoals.length}
          </span>
        </div>

        <div className="chip-list" style={{ marginBottom: 18 }}>
          {(Object.keys(SCOPE_FILTER_LABEL) as ScopeFilter[]).map((key) => (
            <button
              key={key}
              type="button"
              className={`btn btn--ghost${filter === key ? ' btn--primary' : ''}`}
              onClick={() => setFilter(key)}
            >
              {SCOPE_FILTER_LABEL[key]}
            </button>
          ))}
        </div>

        {lifeGoals.length === 0 ? (
          <p className="empty">
            {data.lifeGoals.length === 0
              ? 'Todavía no creaste ninguna meta. Empezá por la primera abajo.'
              : 'No hay metas en este filtro.'}
          </p>
        ) : (
          lifeGoals.map((goal) => (
            <LifeGoalCard
              key={goal.id}
              goal={goal}
              categories={data.categories}
              habits={habits}
              onUpdate={(patch) => dispatch({ type: 'updateLifeGoal', id: goal.id, patch })}
              onRemove={() => dispatch({ type: 'removeLifeGoal', id: goal.id })}
              onMoveUp={() => move(goal.id, -1)}
              onMoveDown={() => move(goal.id, 1)}
            />
          ))
        )}
      </section>

      <section className="card">
        <div className="card__header">
          <h2 className="card__title">Nueva meta</h2>
        </div>
        <div className="row">
          <div className="field" style={{ flex: '2 1 260px' }}>
            <label className="field__label" htmlFor="new-lifegoal-name">
              Nombre
            </label>
            <input
              id="new-lifegoal-name"
              className="input"
              placeholder="Ej. Mejorar mi condición física"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addGoal()
              }}
            />
          </div>
          <div className="field" style={{ flex: '1 1 160px' }}>
            <label className="field__label" htmlFor="new-lifegoal-scope">
              Ámbito
            </label>
            <select
              id="new-lifegoal-scope"
              className="select"
              value={newScope}
              onChange={(e) => setNewScope(e.target.value as LifeGoalScope)}
            >
              <option value="personal">Personal</option>
              <option value="professional">Profesional</option>
            </select>
          </div>
          <div className="field" style={{ flex: '1 1 160px' }}>
            <label className="field__label" htmlFor="new-lifegoal-priority">
              Prioridad
            </label>
            <select
              id="new-lifegoal-priority"
              className="select"
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as LifeGoalPriority)}
            >
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
            </select>
          </div>
          <button type="button" className="btn btn--primary" onClick={addGoal}>
            Crear meta
          </button>
        </div>
      </section>
    </div>
  )
}
