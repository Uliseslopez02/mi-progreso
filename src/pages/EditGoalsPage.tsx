import { useState } from 'react'
import { createId } from '../domain/id'
import type { GoalKind, GoalPeriod } from '../domain/types'
import { useAppData } from '../state/context'

const PERIOD_LABEL: Record<GoalPeriod, string> = {
  daily: 'Diario',
  weekly: 'Semanal',
  monthly: 'Mensual',
}

const KIND_LABEL: Record<GoalKind, string> = {
  boolean: 'Sí / No',
  quantitative: 'Cantidad',
  timed: 'Tiempo',
}

/** Alta/edición/borrado de objetivos (no hábitos, ver HabitsPage) — los mismos
 * que aparecen en Hoy bajo "Objetivos de hoy". Única fuente de verdad: la
 * edición ya no vive también en Ajustes. */
export function EditGoalsPage() {
  const { data, dispatch } = useAppData()
  const [newGoalName, setNewGoalName] = useState('')
  const [newGoalCategory, setNewGoalCategory] = useState(data.categories[0]?.id ?? '')
  const [newGoalWeight, setNewGoalWeight] = useState(1)
  const [newGoalPeriod, setNewGoalPeriod] = useState<GoalPeriod>('daily')
  const [newGoalKind, setNewGoalKind] = useState<GoalKind>('boolean')
  const [newGoalTarget, setNewGoalTarget] = useState(10)
  const [newGoalUnit, setNewGoalUnit] = useState('')

  const allGoals = [...data.goals].sort((a, b) => a.order - b.order)
  const goals = allGoals.filter((g) => g.trackingKind !== 'habit')
  const categories = [...data.categories].sort((a, b) => a.order - b.order)

  const addGoal = () => {
    const name = newGoalName.trim()
    if (!name || !newGoalCategory) return
    const isBoolean = newGoalKind === 'boolean'
    dispatch({
      type: 'addGoal',
      goal: {
        id: createId('goal'),
        name,
        categoryId: newGoalCategory,
        weight: newGoalWeight > 0 ? newGoalWeight : 1,
        active: true,
        period: newGoalPeriod,
        order: goals.length,
        createdAt: new Date().toISOString(),
        kind: newGoalKind,
        targetValue: isBoolean ? undefined : newGoalTarget,
        unit: isBoolean ? undefined : newGoalUnit.trim() || undefined,
      },
    })
    setNewGoalName('')
    setNewGoalWeight(1)
    setNewGoalPeriod('daily')
    setNewGoalKind('boolean')
    setNewGoalTarget(10)
    setNewGoalUnit('')
  }

  return (
    <div className="stack">
      <section className="card">
        <div className="card__header">
          <h2 className="card__title">Objetivos</h2>
          <span className="card__hint">
            {goals.filter((g) => g.active).length} activos de {goals.length}
          </span>
        </div>

        <div className="goal-list">
          {goals.map((goal, index) => (
            <div
              key={goal.id}
              className={`settings-goal${goal.active ? '' : ' settings-goal--inactive'}`}
            >
              <input
                className="input"
                aria-label={`Nombre de ${goal.name}`}
                value={goal.name}
                onChange={(e) =>
                  dispatch({ type: 'updateGoal', id: goal.id, patch: { name: e.target.value } })
                }
              />
              <select
                className="select"
                aria-label={`Categoría de ${goal.name}`}
                value={goal.categoryId}
                onChange={(e) =>
                  dispatch({
                    type: 'updateGoal',
                    id: goal.id,
                    patch: { categoryId: e.target.value },
                  })
                }
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <select
                className="select"
                aria-label={`Frecuencia de ${goal.name}`}
                value={goal.period}
                onChange={(e) =>
                  dispatch({
                    type: 'updateGoal',
                    id: goal.id,
                    patch: { period: e.target.value as GoalPeriod },
                  })
                }
              >
                {(Object.keys(PERIOD_LABEL) as GoalPeriod[]).map((period) => (
                  <option key={period} value={period}>
                    {PERIOD_LABEL[period]}
                  </option>
                ))}
              </select>
              <input
                className="input"
                type="number"
                min={1}
                max={999}
                aria-label={`Peso de ${goal.name}`}
                value={goal.weight}
                onChange={(e) => {
                  const weight = Number(e.target.value)
                  if (!Number.isFinite(weight)) return
                  dispatch({
                    type: 'updateGoal',
                    id: goal.id,
                    patch: { weight: Math.min(999, Math.max(1, Math.round(weight))) },
                  })
                }}
              />
              <div className="settings-goal__advanced">
                <select
                  className="select"
                  aria-label={`Tipo de ${goal.name}`}
                  value={goal.kind}
                  onChange={(e) => {
                    const kind = e.target.value as GoalKind
                    dispatch({
                      type: 'updateGoal',
                      id: goal.id,
                      patch:
                        kind === 'boolean'
                          ? { kind, targetValue: undefined, unit: undefined }
                          : { kind, targetValue: goal.targetValue ?? 10 },
                    })
                  }}
                >
                  {(Object.keys(KIND_LABEL) as GoalKind[]).map((kind) => (
                    <option key={kind} value={kind}>
                      {KIND_LABEL[kind]}
                    </option>
                  ))}
                </select>
                {goal.kind !== 'boolean' && (
                  <>
                    <input
                      className="input"
                      type="number"
                      min={1}
                      aria-label={`Meta de ${goal.name}`}
                      placeholder="Meta"
                      style={{ width: 90 }}
                      value={goal.targetValue ?? ''}
                      onChange={(e) => {
                        const value = Number(e.target.value)
                        dispatch({
                          type: 'updateGoal',
                          id: goal.id,
                          patch: { targetValue: Number.isFinite(value) && value > 0 ? value : undefined },
                        })
                      }}
                    />
                    <input
                      className="input"
                      aria-label={`Unidad de ${goal.name}`}
                      placeholder="Unidad (L, min...)"
                      style={{ width: 150 }}
                      value={goal.unit ?? ''}
                      onChange={(e) =>
                        dispatch({
                          type: 'updateGoal',
                          id: goal.id,
                          patch: { unit: e.target.value || undefined },
                        })
                      }
                    />
                  </>
                )}
              </div>
              <div className="settings-goal__actions">
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Subir ${goal.name}`}
                  disabled={index === 0}
                  onClick={() => dispatch({ type: 'moveGoal', id: goal.id, direction: -1 })}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Bajar ${goal.name}`}
                  disabled={index === goals.length - 1}
                  onClick={() => dispatch({ type: 'moveGoal', id: goal.id, direction: 1 })}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() =>
                    dispatch({ type: 'updateGoal', id: goal.id, patch: { active: !goal.active } })
                  }
                >
                  {goal.active ? 'Desactivar' : 'Activar'}
                </button>
                <button
                  type="button"
                  className="btn btn--danger"
                  aria-label={`Eliminar ${goal.name}`}
                  onClick={() => dispatch({ type: 'removeGoal', id: goal.id })}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="row" style={{ marginTop: 18 }}>
          <div className="field" style={{ flex: '2 1 240px' }}>
            <label className="field__label" htmlFor="new-goal">
              Nuevo objetivo
            </label>
            <input
              id="new-goal"
              className="input"
              placeholder="Ej. Meditar 10 minutos"
              value={newGoalName}
              onChange={(e) => setNewGoalName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addGoal()
              }}
            />
          </div>
          <div className="field" style={{ flex: '1 1 170px' }}>
            <label className="field__label" htmlFor="new-goal-category">
              Categoría
            </label>
            <select
              id="new-goal-category"
              className="select"
              value={newGoalCategory}
              onChange={(e) => setNewGoalCategory(e.target.value)}
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ flex: '1 1 130px' }}>
            <label className="field__label" htmlFor="new-goal-period">
              Frecuencia
            </label>
            <select
              id="new-goal-period"
              className="select"
              value={newGoalPeriod}
              onChange={(e) => setNewGoalPeriod(e.target.value as GoalPeriod)}
            >
              {(Object.keys(PERIOD_LABEL) as GoalPeriod[]).map((period) => (
                <option key={period} value={period}>
                  {PERIOD_LABEL[period]}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ flex: '0 0 92px' }}>
            <label className="field__label" htmlFor="new-goal-weight">
              Peso
            </label>
            <input
              id="new-goal-weight"
              className="input"
              type="number"
              min={1}
              max={999}
              value={newGoalWeight}
              onChange={(e) => {
                const weight = Number(e.target.value)
                setNewGoalWeight(Number.isFinite(weight) ? Math.min(999, Math.max(1, weight)) : 1)
              }}
            />
          </div>
          <div className="field" style={{ flex: '1 1 150px' }}>
            <label className="field__label" htmlFor="new-goal-kind">
              Tipo
            </label>
            <select
              id="new-goal-kind"
              className="select"
              value={newGoalKind}
              onChange={(e) => setNewGoalKind(e.target.value as GoalKind)}
            >
              {(Object.keys(KIND_LABEL) as GoalKind[]).map((kind) => (
                <option key={kind} value={kind}>
                  {KIND_LABEL[kind]}
                </option>
              ))}
            </select>
          </div>
          {newGoalKind !== 'boolean' && (
            <>
              <div className="field" style={{ flex: '0 0 100px' }}>
                <label className="field__label" htmlFor="new-goal-target">
                  Meta
                </label>
                <input
                  id="new-goal-target"
                  className="input"
                  type="number"
                  min={1}
                  value={newGoalTarget}
                  onChange={(e) => {
                    const value = Number(e.target.value)
                    setNewGoalTarget(Number.isFinite(value) && value > 0 ? value : 1)
                  }}
                />
              </div>
              <div className="field" style={{ flex: '1 1 140px' }}>
                <label className="field__label" htmlFor="new-goal-unit">
                  Unidad
                </label>
                <input
                  id="new-goal-unit"
                  className="input"
                  placeholder="L, min, km..."
                  value={newGoalUnit}
                  onChange={(e) => setNewGoalUnit(e.target.value)}
                />
              </div>
            </>
          )}
          <button type="button" className="btn btn--primary" onClick={addGoal}>
            Agregar
          </button>
        </div>
      </section>
    </div>
  )
}
