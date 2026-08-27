import { useState } from 'react'
import { formatShortDate } from '../domain/date'
import { createId } from '../domain/id'
import { nextMilestone } from '../domain/lifeGoalProgress'
import type {
  Category,
  Goal,
  LifeGoal,
  LifeGoalKind,
  LifeGoalPriority,
  LifeGoalScope,
  LifeGoalStatus,
  Milestone,
  SubGoal,
} from '../domain/types'
import { Modal } from './Modal'
import { SelectMenu } from './SelectMenu'

interface Props {
  goal: LifeGoal
  categories: Category[]
  /** Hábitos activos disponibles para vincular (trackingKind === 'habit'). */
  habits: Goal[]
  onUpdate: (patch: Partial<Omit<LifeGoal, 'id'>>) => void
  onClose: () => void
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

const STATUS_OPTIONS: Array<{ value: LifeGoalStatus; label: string; color: string }> = [
  { value: 'active', label: 'Activa', color: 'var(--band-top)' },
  { value: 'completed', label: 'Completada', color: 'var(--accent)' },
  { value: 'abandoned', label: 'Abandonada', color: 'var(--text-dim)' },
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

const UNIT_LABEL: Partial<Record<LifeGoalKind, string>> = {
  money: '$',
  hours: 'h',
  sessions: 'sesiones',
}

/** Modal de edición completa de una meta: todo lo que antes estaba siempre visible en la tarjeta. */
export function EditGoalModal({ goal, categories, habits, onUpdate, onClose }: Props) {
  const [newSubGoal, setNewSubGoal] = useState('')
  const [newMilestone, setNewMilestone] = useState('')
  const kind = goal.kind ?? 'percentage'
  const linkedHabits = habits.filter((h) => goal.linkedHabitIds.includes(h.id))
  const availableHabits = habits.filter((h) => !goal.linkedHabitIds.includes(h.id))
  const upcomingMilestone = kind === 'milestones' ? nextMilestone(goal) : null

  const addMilestone = () => {
    const name = newMilestone.trim()
    if (!name) return
    const milestone: Milestone = { id: createId('hito'), name, done: false }
    onUpdate({ milestones: [...(goal.milestones ?? []), milestone] })
    setNewMilestone('')
  }

  const toggleMilestone = (id: string) => {
    onUpdate({ milestones: (goal.milestones ?? []).map((m) => (m.id === id ? { ...m, done: !m.done } : m)) })
  }

  const removeMilestone = (id: string) => {
    onUpdate({ milestones: (goal.milestones ?? []).filter((m) => m.id !== id) })
  }

  const addSubGoal = () => {
    const text = newSubGoal.trim()
    if (!text) return
    const subGoal: SubGoal = { id: createId('sub'), text, done: false }
    onUpdate({ subGoals: [...goal.subGoals, subGoal] })
    setNewSubGoal('')
  }

  const toggleSubGoal = (id: string) => {
    onUpdate({ subGoals: goal.subGoals.map((s) => (s.id === id ? { ...s, done: !s.done } : s)) })
  }

  const removeSubGoal = (id: string) => {
    onUpdate({ subGoals: goal.subGoals.filter((s) => s.id !== id) })
  }

  return (
    <Modal title="Editar meta" onClose={onClose} width={620}>
      <div className="goal-edit-modal">
        <div className="field">
          <label className="field__label" htmlFor={`edit-name-${goal.id}`}>
            Nombre
          </label>
          <input
            id={`edit-name-${goal.id}`}
            className="input"
            value={goal.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
          />
        </div>

        <div className="field">
          <label className="field__label" htmlFor={`edit-desc-${goal.id}`}>
            Descripción
          </label>
          <textarea
            id={`edit-desc-${goal.id}`}
            className="input"
            style={{ minHeight: 60, resize: 'vertical' }}
            placeholder="Descripción (opcional)"
            value={goal.description ?? ''}
            onChange={(e) => onUpdate({ description: e.target.value })}
          />
        </div>

        <div className="goal-edit-modal__row">
          <SelectMenu value={kind} options={KIND_OPTIONS} onChange={(v) => onUpdate({ kind: v })} ariaLabel="Tipo de meta" />
          <SelectMenu
            value={goal.categoryId ?? ''}
            options={[{ value: '', label: 'Sin categoría' }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
            onChange={(v) => onUpdate({ categoryId: v || undefined })}
            ariaLabel="Categoría de la meta"
          />
        </div>

        <div className="goal-edit-modal__row">
          <SelectMenu value={goal.scope} options={SCOPE_OPTIONS} onChange={(v) => onUpdate({ scope: v })} ariaLabel="Ámbito de la meta" />
          <SelectMenu value={goal.priority} options={PRIORITY_OPTIONS} onChange={(v) => onUpdate({ priority: v })} ariaLabel="Prioridad de la meta" />
          <SelectMenu value={goal.status} options={STATUS_OPTIONS} onChange={(v) => onUpdate({ status: v })} ariaLabel="Estado de la meta" />
        </div>

        <div className="field" style={{ maxWidth: 200 }}>
          <label className="field__label" htmlFor={`edit-date-${goal.id}`}>
            Fecha objetivo
          </label>
          <input
            id={`edit-date-${goal.id}`}
            className="input"
            type="date"
            value={goal.targetDate ?? ''}
            onChange={(e) => onUpdate({ targetDate: e.target.value || undefined })}
          />
        </div>

        {kind === 'percentage' && (
          <div className="field">
            <span className="field__label">Progreso: {goal.progress}%</span>
            <input
              type="range"
              min={0}
              max={100}
              value={goal.progress}
              aria-label="Ajustar progreso"
              onChange={(e) => onUpdate({ progress: Number(e.target.value) })}
            />
          </div>
        )}

        {kind === 'habits' && (
          <p className="card__hint">
            El progreso se calcula solo, según el cumplimiento de los hábitos vinculados abajo en los
            últimos 30 días.
          </p>
        )}

        {(kind === 'quantity' || kind === 'money' || kind === 'hours' || kind === 'sessions') && (
          <div className="goal-edit-modal__row">
            <div className="field">
              <label className="field__label" htmlFor={`edit-current-${goal.id}`}>
                Actual
              </label>
              <input
                id={`edit-current-${goal.id}`}
                className="input"
                type="number"
                value={goal.currentValue ?? 0}
                onChange={(e) => onUpdate({ currentValue: Number(e.target.value) })}
              />
            </div>
            <div className="field">
              <label className="field__label" htmlFor={`edit-target-${goal.id}`}>
                Meta
              </label>
              <input
                id={`edit-target-${goal.id}`}
                className="input"
                type="number"
                value={goal.targetValue ?? 0}
                onChange={(e) => onUpdate({ targetValue: Number(e.target.value) })}
              />
            </div>
            <div className="field">
              <label className="field__label" htmlFor={`edit-unit-${goal.id}`}>
                Unidad
              </label>
              {kind === 'quantity' ? (
                <input
                  id={`edit-unit-${goal.id}`}
                  className="input"
                  value={goal.unit ?? ''}
                  onChange={(e) => onUpdate({ unit: e.target.value })}
                />
              ) : (
                <input id={`edit-unit-${goal.id}`} className="input" value={UNIT_LABEL[kind]} disabled />
              )}
            </div>
          </div>
        )}

        {kind === 'checklist' && (
          <p className="card__hint">El progreso sale de los subobjetivos de abajo.</p>
        )}

        {kind === 'milestones' && (
          <div className="field">
            <span className="field__label">Hitos</span>
            {(goal.milestones ?? []).length > 0 && (
              <ul className="subgoal-list">
                {(goal.milestones ?? []).map((m) => (
                  <li className="subgoal" key={m.id}>
                    <input type="checkbox" checked={m.done} aria-label={m.name} onChange={() => toggleMilestone(m.id)} />
                    <span className={m.done ? 'subgoal__done' : undefined}>
                      {m.name}
                      {m.targetDate ? ` · ${formatShortDate(m.targetDate)}` : ''}
                    </span>
                    <button type="button" className="subgoal__remove" aria-label={`Quitar ${m.name}`} onClick={() => removeMilestone(m.id)}>
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="row">
              <input
                className="input"
                placeholder="Nuevo hito"
                aria-label="Nuevo hito"
                value={newMilestone}
                onChange={(e) => setNewMilestone(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addMilestone()
                }}
              />
              <button type="button" className="btn btn--ghost" onClick={addMilestone}>
                Agregar hito
              </button>
            </div>
            {upcomingMilestone && (
              <p className="card__hint" style={{ marginTop: 8 }}>
                Próximo hito: {upcomingMilestone.name}
                {upcomingMilestone.targetDate ? ` · ${formatShortDate(upcomingMilestone.targetDate)}` : ''}
              </p>
            )}
          </div>
        )}

        <div className="field">
          <span className="field__label">Subobjetivos</span>
          {goal.subGoals.length > 0 && (
            <ul className="subgoal-list">
              {goal.subGoals.map((sub) => (
                <li className="subgoal" key={sub.id}>
                  <input type="checkbox" checked={sub.done} aria-label={sub.text} onChange={() => toggleSubGoal(sub.id)} />
                  <span className={sub.done ? 'subgoal__done' : undefined}>{sub.text}</span>
                  <button type="button" className="subgoal__remove" aria-label={`Quitar ${sub.text}`} onClick={() => removeSubGoal(sub.id)}>
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="row">
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
        </div>

        <div className="field">
          <span className="field__label">Hábitos vinculados</span>
          <div className="chip-list">
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
              <SelectMenu
                value="__pick__"
                options={[
                  { value: '__pick__', label: '+ Vincular hábito' },
                  ...availableHabits.map((h) => ({ value: h.id, label: h.name })),
                ]}
                onChange={(v) => {
                  if (v === '__pick__') return
                  onUpdate({ linkedHabitIds: [...goal.linkedHabitIds, v] })
                }}
                ariaLabel="Vincular hábito"
              />
            )}
            {linkedHabits.length === 0 && availableHabits.length === 0 && (
              <span className="card__hint">Todavía no tenés hábitos para vincular.</span>
            )}
          </div>
        </div>

        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn--primary" onClick={onClose}>
            Listo
          </button>
        </div>
      </div>
    </Modal>
  )
}
