import { useState } from 'react'
import { createId } from '../domain/id'
import type { Category, Goal, LifeGoal, LifeGoalPriority, LifeGoalScope, LifeGoalStatus, SubGoal } from '../domain/types'
import { BAND_COLOR } from './colors'

interface Props {
  goal: LifeGoal
  categories: Category[]
  /** Hábitos activos disponibles para vincular (trackingKind === 'habit'). */
  habits: Goal[]
  onUpdate: (patch: Partial<Omit<LifeGoal, 'id'>>) => void
  onRemove: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
}

const PRIORITY_LABEL: Record<LifeGoalPriority, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
}

const STATUS_LABEL: Record<LifeGoalStatus, string> = {
  active: 'Activa',
  completed: 'Completada',
  abandoned: 'Abandonada',
}

function progressBand(progress: number) {
  if (progress >= 90) return 'top'
  if (progress >= 75) return 'high'
  if (progress >= 50) return 'good'
  if (progress >= 25) return 'mid'
  return 'low'
}

export function LifeGoalCard({ goal, categories, habits, onUpdate, onRemove, onMoveUp, onMoveDown }: Props) {
  const [newSubGoal, setNewSubGoal] = useState('')
  const linkedHabits = habits.filter((h) => goal.linkedHabitIds.includes(h.id))
  const availableHabits = habits.filter((h) => !goal.linkedHabitIds.includes(h.id))

  const addSubGoal = () => {
    const text = newSubGoal.trim()
    if (!text) return
    const subGoal: SubGoal = { id: createId('sub'), text, done: false }
    onUpdate({ subGoals: [...goal.subGoals, subGoal] })
    setNewSubGoal('')
  }

  const toggleSubGoal = (id: string) => {
    onUpdate({
      subGoals: goal.subGoals.map((s) => (s.id === id ? { ...s, done: !s.done } : s)),
    })
  }

  const removeSubGoal = (id: string) => {
    onUpdate({ subGoals: goal.subGoals.filter((s) => s.id !== id) })
  }

  return (
    <div className="lifegoal-card">
      <div className="lifegoal-card__head">
        <input
          className="input"
          style={{ fontSize: '1.05rem', fontWeight: 650 }}
          aria-label="Nombre de la meta"
          value={goal.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
        />
        <div className="lifegoal-card__badges">
          <span className={`pill pill--${goal.scope}`}>
            {goal.scope === 'personal' ? 'Personal' : 'Profesional'}
          </span>
          <span className={`pill pill--priority-${goal.priority}`}>{PRIORITY_LABEL[goal.priority]}</span>
          {goal.status !== 'active' && (
            <span className={`pill pill--status-${goal.status}`}>{STATUS_LABEL[goal.status]}</span>
          )}
        </div>
      </div>

      <textarea
        className="input"
        style={{ width: '100%', minHeight: 50, resize: 'vertical' }}
        placeholder="Descripción (opcional)"
        aria-label="Descripción de la meta"
        value={goal.description ?? ''}
        onChange={(e) => onUpdate({ description: e.target.value })}
      />

      <div className="lifegoal-card__meta" style={{ marginTop: 12 }}>
        <select
          className="select"
          aria-label="Categoría de la meta"
          value={goal.categoryId ?? ''}
          onChange={(e) => onUpdate({ categoryId: e.target.value || undefined })}
        >
          <option value="">Sin categoría</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className="select"
          aria-label="Ámbito de la meta"
          value={goal.scope}
          onChange={(e) => onUpdate({ scope: e.target.value as LifeGoalScope })}
        >
          <option value="personal">Personal</option>
          <option value="professional">Profesional</option>
        </select>
        <select
          className="select"
          aria-label="Prioridad de la meta"
          value={goal.priority}
          onChange={(e) => onUpdate({ priority: e.target.value as LifeGoalPriority })}
        >
          <option value="low">Prioridad baja</option>
          <option value="medium">Prioridad media</option>
          <option value="high">Prioridad alta</option>
        </select>
        <select
          className="select"
          aria-label="Estado de la meta"
          value={goal.status}
          onChange={(e) => onUpdate({ status: e.target.value as LifeGoalStatus })}
        >
          <option value="active">Activa</option>
          <option value="completed">Completada</option>
          <option value="abandoned">Abandonada</option>
        </select>
        <input
          className="input"
          type="date"
          style={{ width: 150 }}
          aria-label="Fecha objetivo"
          value={goal.targetDate ?? ''}
          onChange={(e) => onUpdate({ targetDate: e.target.value || undefined })}
        />
      </div>

      <div className="lifegoal-card__progress">
        <div className="lifegoal-card__progress-row">
          <span>Progreso</span>
          <span className="numeric">{goal.progress}%</span>
        </div>
        <span className="consistency__bar" style={{ display: 'block', marginBottom: 8 }}>
          <span
            className="consistency__fill"
            style={{ width: `${goal.progress}%`, background: BAND_COLOR[progressBand(goal.progress)] }}
          />
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={goal.progress}
          aria-label="Ajustar progreso"
          onChange={(e) => onUpdate({ progress: Number(e.target.value) })}
          style={{ width: '100%' }}
        />
      </div>

      {goal.subGoals.length > 0 && (
        <ul className="subgoal-list" style={{ marginBottom: 10 }}>
          {goal.subGoals.map((sub) => (
            <li className="subgoal" key={sub.id}>
              <input
                type="checkbox"
                checked={sub.done}
                aria-label={sub.text}
                onChange={() => toggleSubGoal(sub.id)}
              />
              <span className={sub.done ? 'subgoal__done' : undefined}>{sub.text}</span>
              <button
                type="button"
                className="subgoal__remove"
                aria-label={`Quitar ${sub.text}`}
                onClick={() => removeSubGoal(sub.id)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="row" style={{ marginBottom: 12 }}>
        <input
          className="input"
          placeholder="Nuevo subobjetivo"
          aria-label="Nuevo subobjetivo"
          value={newSubGoal}
          onChange={(e) => setNewSubGoal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addSubGoal()
          }}
        />
        <button type="button" className="btn btn--ghost" onClick={addSubGoal}>
          Agregar subobjetivo
        </button>
      </div>

      {habits.length > 0 && (
        <div className="chip-list" style={{ marginBottom: 12 }}>
          {linkedHabits.map((h) => (
            <span className="category-chip" key={h.id}>
              🔗 {h.name}
              <button
                type="button"
                className="icon-btn"
                onClick={() => onUpdate({ linkedHabitIds: goal.linkedHabitIds.filter((id) => id !== h.id) })}
                aria-label={`Desvincular ${h.name}`}
              >
                ×
              </button>
            </span>
          ))}
          {availableHabits.length > 0 && (
            <select
              className="select"
              aria-label="Vincular hábito"
              value=""
              onChange={(e) => {
                if (!e.target.value) return
                onUpdate({ linkedHabitIds: [...goal.linkedHabitIds, e.target.value] })
              }}
            >
              <option value="">+ Vincular hábito</option>
              {availableHabits.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <div className="settings-goal__actions">
        {onMoveUp && (
          <button type="button" className="icon-btn" aria-label="Subir" onClick={onMoveUp}>
            ↑
          </button>
        )}
        {onMoveDown && (
          <button type="button" className="icon-btn" aria-label="Bajar" onClick={onMoveDown}>
            ↓
          </button>
        )}
        <button type="button" className="btn btn--danger" onClick={onRemove}>
          Eliminar
        </button>
      </div>
    </div>
  )
}
