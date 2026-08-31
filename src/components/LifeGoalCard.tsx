import { useState } from 'react'
import type { DateKey } from '../domain/date'
import { habitsProgressBreakdown, pace } from '../domain/lifeGoalProgress'
import type { Category, DayRecord, Goal, LifeGoal, LifeGoalPriority, LifeGoalStatus } from '../domain/types'
import { BAND_COLOR } from './colors'
import { EditGoalModal } from './EditGoalModal'

interface Props {
  goal: LifeGoal
  categories: Category[]
  /** Hábitos activos disponibles para vincular (trackingKind === 'habit'). */
  habits: Goal[]
  days: Record<string, DayRecord>
  today: DateKey
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

const PACE_LABEL = {
  ahead: 'Adelantada',
  'on-pace': 'En ritmo',
  behind: 'Retrasada',
}

function progressBand(progress: number) {
  if (progress >= 90) return 'top'
  if (progress >= 75) return 'high'
  if (progress >= 50) return 'good'
  if (progress >= 25) return 'mid'
  return 'low'
}

/**
 * Tarjeta minimalista de una meta: nombre, badges, % de progreso destacado al
 * inicio, y acciones de editar/eliminar. Todos los campos de edición viven en
 * `EditGoalModal`, detrás del ícono de lápiz — antes estaban siempre visibles
 * acá, lo que saturaba la vista con cada meta que se agregaba.
 */
export function LifeGoalCard({ goal, categories, habits, days, today, onUpdate, onRemove, onMoveUp, onMoveDown }: Props) {
  const [editing, setEditing] = useState(false)
  const goalPace = pace(goal, today)
  const habitsBreakdown = goal.kind === 'habits' ? habitsProgressBreakdown(goal, days, today) : null

  return (
    <div className="lifegoal-card lifegoal-card--minimal">
      <div className="lifegoal-card__head">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, minWidth: 0 }}>
          <span className="lifegoal-card__percent" style={{ color: BAND_COLOR[progressBand(goal.progress)] }}>
            {goal.progress}%
          </span>
          <span className="lifegoal-card__name">{goal.name}</span>
        </div>
        <div className="lifegoal-card__actions">
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
          <button type="button" className="icon-btn" aria-label={`Editar ${goal.name}`} onClick={() => setEditing(true)}>
            ✎
          </button>
          <button type="button" className="icon-btn" aria-label={`Eliminar ${goal.name}`} onClick={onRemove}>
            🗑
          </button>
        </div>
      </div>

      <div className="lifegoal-card__badges">
        <span className={`pill pill--${goal.scope}`}>{goal.scope === 'personal' ? 'Personal' : 'Profesional'}</span>
        <span className={`pill pill--priority-${goal.priority}`}>{PRIORITY_LABEL[goal.priority]}</span>
        {goal.status !== 'active' && <span className={`pill pill--status-${goal.status}`}>{STATUS_LABEL[goal.status]}</span>}
        {goalPace && <span className={`pill pill--pace-${goalPace}`}>{PACE_LABEL[goalPace]}</span>}
      </div>

      {goal.description && <p className="lifegoal-card__description">{goal.description}</p>}

      <span className="consistency__bar" style={{ display: 'block' }}>
        <span
          className="consistency__fill"
          style={{ width: `${goal.progress}%`, background: BAND_COLOR[progressBand(goal.progress)] }}
        />
      </span>

      {habitsBreakdown && (
        <p className="card__hint" style={{ marginTop: 6 }}>
          {habitsBreakdown.linkedHabitCount === 0
            ? 'Vinculá hábitos (desde el ícono de lápiz) para que el progreso se calcule solo.'
            : `${goal.progress}% porque cumpliste ${habitsBreakdown.daysCompleted} de ${habitsBreakdown.daysPresent} acciones de tus ${habitsBreakdown.linkedHabitCount} hábito${habitsBreakdown.linkedHabitCount === 1 ? '' : 's'} vinculado${habitsBreakdown.linkedHabitCount === 1 ? '' : 's'} en los últimos ${habitsBreakdown.windowDays} días. Vincular o desvincular un hábito recalcula el % al instante con su historial — no sólo por lo que cumplas hoy.`}
        </p>
      )}

      {editing && (
        <EditGoalModal
          goal={goal}
          categories={categories}
          habits={habits}
          onUpdate={onUpdate}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  )
}
