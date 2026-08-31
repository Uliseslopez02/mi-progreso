import { WEEKDAY_KEYS, weekdayInitials } from '../domain/date'
import { frequencyFrom, type FrequencyType } from '../domain/habits'
import type { Category, Goal, GoalDifficulty } from '../domain/types'
import { Modal } from './Modal'
import { SelectMenu } from './SelectMenu'

interface Props {
  habit: Goal
  categories: Category[]
  onUpdate: (patch: Partial<Omit<Goal, 'id'>>) => void
  onRemove: () => void
  onClose: () => void
}

const FREQUENCY_OPTIONS: Array<{ value: FrequencyType; label: string }> = [
  { value: 'daily', label: 'Todos los días' },
  { value: 'daysOfWeek', label: 'Días específicos' },
  { value: 'timesPerWeek', label: 'N veces por semana' },
  { value: 'monthly', label: 'Mensual' },
]

const DIFFICULTY_OPTIONS: Array<{ value: GoalDifficulty; label: string; color: string }> = [
  { value: 'easy', label: 'Fácil', color: 'var(--band-top)' },
  { value: 'medium', label: 'Media', color: 'var(--band-good)' },
  { value: 'hard', label: 'Difícil', color: 'var(--band-low)' },
]

/** Única fuente de edición de un hábito ya existente: nombre, categoría,
 * frecuencia, dificultad, pausar/reanudar, eliminar. Mismo patrón que
 * `EditGoalModal` para `LifeGoal` — un modal por entidad, sin editar in-place
 * en la lista. */
export function EditHabitModal({ habit, categories, onUpdate, onRemove, onClose }: Props) {
  const frequencyType: FrequencyType = habit.frequency?.type ?? 'daily'
  const days = habit.frequency?.type === 'daysOfWeek' ? habit.frequency.days : []
  const timesPerWeek = habit.frequency?.type === 'timesPerWeek' ? habit.frequency.timesPerWeek : 3

  return (
    <Modal
      title="Editar hábito"
      onClose={onClose}
      footer={
        <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, width: '100%' }}>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <button type="button" className="btn btn--ghost" onClick={() => onUpdate({ active: !habit.active })}>
              {habit.active ? 'Pausar' : 'Reanudar'}
            </button>
            <button
              type="button"
              className="btn btn--danger"
              aria-label={`Eliminar ${habit.name}`}
              onClick={() => {
                onRemove()
                onClose()
              }}
            >
              Eliminar
            </button>
          </div>
          <button type="button" className="btn btn--primary" onClick={onClose}>
            Listo
          </button>
        </div>
      }
    >
      <div className="stack">
        <div className="field">
          <label className="field__label" htmlFor={`habit-name-${habit.id}`}>
            Nombre
          </label>
          <input
            id={`habit-name-${habit.id}`}
            className="input"
            value={habit.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
          />
        </div>

        <div className="goal-edit-modal__row">
          <SelectMenu
            value={habit.categoryId}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            onChange={(v) => onUpdate({ categoryId: v })}
            ariaLabel="Categoría del hábito"
          />
          <SelectMenu
            value={habit.difficulty ?? 'medium'}
            options={DIFFICULTY_OPTIONS}
            onChange={(v) => onUpdate({ difficulty: v })}
            ariaLabel="Dificultad del hábito"
          />
        </div>

        <div className="field">
          <span className="field__label">Repetición</span>
          <SelectMenu
            value={frequencyType}
            options={FREQUENCY_OPTIONS}
            onChange={(type) => onUpdate({ frequency: frequencyFrom(type, days, timesPerWeek) })}
            ariaLabel="Repetición del hábito"
          />
        </div>

        {frequencyType === 'daysOfWeek' && (
          <div className="chip-list" role="group" aria-label={`Días de ${habit.name}`}>
            {WEEKDAY_KEYS.map((day, i) => {
              const active = days.includes(day)
              return (
                <button
                  key={day}
                  type="button"
                  className={`btn btn--ghost${active ? ' btn--primary' : ''}`}
                  style={{ padding: '4px 10px' }}
                  onClick={() => {
                    const next = active ? days.filter((d) => d !== day) : [...days, day]
                    onUpdate({ frequency: { type: 'daysOfWeek', days: next } })
                  }}
                >
                  {weekdayInitials[i]}
                </button>
              )
            })}
          </div>
        )}

        {frequencyType === 'timesPerWeek' && (
          <div className="field" style={{ maxWidth: 140 }}>
            <label className="field__label" htmlFor={`habit-times-${habit.id}`}>
              Veces por semana
            </label>
            <input
              id={`habit-times-${habit.id}`}
              className="input"
              type="number"
              min={1}
              max={7}
              value={timesPerWeek}
              onChange={(e) => {
                const value = Number(e.target.value)
                if (!Number.isFinite(value) || value < 1) return
                onUpdate({ frequency: { type: 'timesPerWeek', timesPerWeek: Math.min(7, value) } })
              }}
            />
          </div>
        )}
      </div>
    </Modal>
  )
}
