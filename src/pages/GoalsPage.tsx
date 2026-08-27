import { useMemo, useState } from 'react'
import { HabitSuggestionModal } from '../components/HabitSuggestionModal'
import { LifeGoalCard } from '../components/LifeGoalCard'
import { SelectMenu } from '../components/SelectMenu'
import { createId } from '../domain/id'
import type { LifeGoalKind, LifeGoalPriority, LifeGoalScope } from '../domain/types'
import { useAppData } from '../state/context'

type ScopeFilter = 'all' | LifeGoalScope

const SCOPE_FILTER_LABEL: Record<ScopeFilter, string> = {
  all: 'Todas',
  personal: 'Personales',
  professional: 'Profesionales',
}

const SCOPE_OPTIONS: Array<{ value: LifeGoalScope; label: string; color: string }> = [
  { value: 'personal', label: 'Personal', color: 'var(--accent)' },
  { value: 'professional', label: 'Profesional', color: '#93c5fd' },
]

const PRIORITY_OPTIONS: Array<{ value: LifeGoalPriority; label: string; color: string }> = [
  { value: 'low', label: 'Prioridad baja', color: 'var(--text-dim)' },
  { value: 'medium', label: 'Prioridad media', color: 'var(--band-good)' },
  { value: 'high', label: 'Prioridad alta', color: 'var(--band-low)' },
]

const KIND_OPTIONS: Array<{ value: LifeGoalKind; label: string }> = [
  { value: 'percentage', label: 'Porcentaje' },
  { value: 'habits', label: 'Hábitos vinculados' },
  { value: 'quantity', label: 'Cantidad' },
  { value: 'money', label: 'Dinero' },
  { value: 'hours', label: 'Horas' },
  { value: 'sessions', label: 'Sesiones' },
  { value: 'checklist', label: 'Checklist' },
  { value: 'milestones', label: 'Hitos' },
]

const VALUE_KINDS: LifeGoalKind[] = ['quantity', 'money', 'hours', 'sessions']

/** Objetivos y metas: visión de largo plazo, separada de los objetivos diarios. */
export function GoalsPage() {
  const { data, today, dispatch } = useAppData()
  const [filter, setFilter] = useState<ScopeFilter>('all')
  const [newName, setNewName] = useState('')
  const [newScope, setNewScope] = useState<LifeGoalScope>('personal')
  const [newPriority, setNewPriority] = useState<LifeGoalPriority>('medium')
  const [newKind, setNewKind] = useState<LifeGoalKind>('percentage')
  const [newTargetValue, setNewTargetValue] = useState(10)
  const [newUnit, setNewUnit] = useState('')
  const [suggestingFor, setSuggestingFor] = useState<{ id: string; name: string } | null>(null)

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
    const id = createId('meta')
    dispatch({
      type: 'addLifeGoal',
      goal: {
        id,
        name,
        scope: newScope,
        priority: newPriority,
        progress: 0,
        status: 'active',
        subGoals: [],
        linkedHabitIds: [],
        order: data.lifeGoals.length,
        createdAt: new Date().toISOString(),
        kind: newKind,
        targetValue: VALUE_KINDS.includes(newKind) ? newTargetValue : undefined,
        unit: newKind === 'quantity' ? newUnit || undefined : undefined,
      },
    })
    setNewName('')
    setNewPriority('medium')
    setNewKind('percentage')
    setNewUnit('')
    setSuggestingFor({ id, name })
  }

  const move = (id: string, direction: -1 | 1) => dispatch({ type: 'moveLifeGoal', id, direction })

  const ensureCategoryId = (): string => {
    if (data.categories.length > 0) return [...data.categories].sort((a, b) => a.order - b.order)[0].id
    const id = createId('cat')
    dispatch({ type: 'addCategory', category: { id, name: 'General', order: 0 } })
    return id
  }

  const confirmSuggestedHabits = (habitNames: string[], driveProgress: boolean) => {
    if (!suggestingFor) return
    const categoryId = ensureCategoryId()
    const createdIds = habitNames.map((name) => {
      const habitId = createId('habit')
      dispatch({
        type: 'addGoal',
        goal: {
          id: habitId,
          name,
          categoryId,
          weight: 1,
          active: true,
          period: 'daily',
          order: habits.length,
          createdAt: new Date().toISOString(),
          kind: 'boolean',
          trackingKind: 'habit',
        },
      })
      return habitId
    })
    dispatch({
      type: 'updateLifeGoal',
      id: suggestingFor.id,
      patch: { linkedHabitIds: createdIds, ...(driveProgress ? { kind: 'habits' as const } : {}) },
    })
    setSuggestingFor(null)
  }

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
              today={today}
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
          <SelectMenu value={newScope} options={SCOPE_OPTIONS} onChange={setNewScope} ariaLabel="Ámbito" />
          <SelectMenu value={newPriority} options={PRIORITY_OPTIONS} onChange={setNewPriority} ariaLabel="Prioridad" />
          <SelectMenu value={newKind} options={KIND_OPTIONS} onChange={setNewKind} ariaLabel="Tipo" />
          {VALUE_KINDS.includes(newKind) && (
            <div className="field" style={{ flex: '1 1 100px' }}>
              <label className="field__label" htmlFor="new-lifegoal-target">
                Meta
              </label>
              <input
                id="new-lifegoal-target"
                className="input"
                type="number"
                value={newTargetValue}
                onChange={(e) => setNewTargetValue(Number(e.target.value))}
              />
            </div>
          )}
          {newKind === 'quantity' && (
            <div className="field" style={{ flex: '1 1 100px' }}>
              <label className="field__label" htmlFor="new-lifegoal-unit">
                Unidad
              </label>
              <input
                id="new-lifegoal-unit"
                className="input"
                placeholder="Ej. libros"
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
              />
            </div>
          )}
          <button type="button" className="btn btn--primary" onClick={addGoal}>
            Crear meta
          </button>
        </div>
      </section>

      {suggestingFor && (
        <HabitSuggestionModal
          goalName={suggestingFor.name}
          onConfirm={confirmSuggestedHabits}
          onSkip={() => setSuggestingFor(null)}
        />
      )}
    </div>
  )
}
