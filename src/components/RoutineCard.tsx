import { useState } from 'react'
import { createId } from '../domain/id'
import type { Routine, RoutineCategory, RoutineStep } from '../domain/types'

interface Props {
  routine: Routine
  onUpdate: (patch: Partial<Omit<Routine, 'id'>>) => void
  onRemove: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
}

const CATEGORY_LABEL: Record<RoutineCategory, string> = {
  morning: 'Matutina',
  evening: 'Nocturna',
  workout: 'Entrenamiento',
  work: 'Trabajo',
  custom: 'Personalizada',
}

/** CRUD de una rutina: nombre, categoría, pausar/activar y pasos ordenados. */
export function RoutineCard({ routine, onUpdate, onRemove, onMoveUp, onMoveDown }: Props) {
  const [newStepText, setNewStepText] = useState('')
  const steps = [...routine.steps].sort((a, b) => a.order - b.order)

  const addStep = () => {
    const text = newStepText.trim()
    if (!text) return
    const step: RoutineStep = { id: createId('paso'), text, order: routine.steps.length }
    onUpdate({ steps: [...routine.steps, step] })
    setNewStepText('')
  }

  const updateStepText = (id: string, text: string) => {
    onUpdate({ steps: routine.steps.map((s) => (s.id === id ? { ...s, text } : s)) })
  }

  const removeStep = (id: string) => {
    onUpdate({ steps: routine.steps.filter((s) => s.id !== id) })
  }

  const moveStep = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= steps.length) return
    const swapped = [...steps]
    ;[swapped[index], swapped[target]] = [swapped[target], swapped[index]]
    onUpdate({ steps: swapped.map((s, order) => ({ ...s, order })) })
  }

  return (
    <div className="routine-card">
      <div className="lifegoal-card__head">
        <input
          className="input"
          style={{ fontSize: '1.05rem', fontWeight: 650 }}
          aria-label="Nombre de la rutina"
          value={routine.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
        />
        {!routine.active && <span className="habit-card__paused">Pausada</span>}
      </div>

      <div className="lifegoal-card__meta">
        <select
          className="select"
          aria-label="Categoría de la rutina"
          value={routine.category}
          onChange={(e) => onUpdate({ category: e.target.value as RoutineCategory })}
        >
          {(Object.keys(CATEGORY_LABEL) as RoutineCategory[]).map((key) => (
            <option key={key} value={key}>
              {CATEGORY_LABEL[key]}
            </option>
          ))}
        </select>
        <button type="button" className="btn btn--ghost" onClick={() => onUpdate({ active: !routine.active })}>
          {routine.active ? 'Pausar' : 'Activar'}
        </button>
      </div>

      {steps.length > 0 && (
        <ul className="subgoal-list" style={{ marginBottom: 10 }}>
          {steps.map((step, index) => (
            <li className="routine-step-row" key={step.id}>
              <input
                className="input"
                aria-label={`Paso ${index + 1}`}
                value={step.text}
                onChange={(e) => updateStepText(step.id, e.target.value)}
              />
              <button
                type="button"
                className="icon-btn"
                aria-label={`Subir paso ${index + 1}`}
                onClick={() => moveStep(index, -1)}
                disabled={index === 0}
              >
                ↑
              </button>
              <button
                type="button"
                className="icon-btn"
                aria-label={`Bajar paso ${index + 1}`}
                onClick={() => moveStep(index, 1)}
                disabled={index === steps.length - 1}
              >
                ↓
              </button>
              <button
                type="button"
                className="subgoal__remove"
                aria-label={`Quitar paso ${index + 1}`}
                onClick={() => removeStep(step.id)}
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
          placeholder="Nuevo paso"
          aria-label="Nuevo paso"
          value={newStepText}
          onChange={(e) => setNewStepText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addStep()
          }}
        />
        <button type="button" className="btn btn--ghost" onClick={addStep}>
          Agregar paso
        </button>
      </div>

      <div className="settings-goal__actions">
        {onMoveUp && (
          <button type="button" className="icon-btn" aria-label="Subir rutina" onClick={onMoveUp}>
            ↑
          </button>
        )}
        {onMoveDown && (
          <button type="button" className="icon-btn" aria-label="Bajar rutina" onClick={onMoveDown}>
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
