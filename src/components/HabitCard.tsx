import { useMemo, useState } from 'react'
import { addDays, formatShortDate, type DateKey } from '../domain/date'
import { goalCompletionOn, goalStreaks } from '../domain/consistency'
import type { Category, DayRecord, Goal } from '../domain/types'
import { BAND_COLOR } from './colors'
import { EditHabitModal } from './EditHabitModal'
import { Stat } from './Stat'

interface Props {
  habit: Goal
  categoryName: string
  categories: Category[]
  days: Record<string, DayRecord>
  today: DateKey
  onUpdate: (patch: Partial<Omit<Goal, 'id'>>) => void
  onRemove: () => void
  /** Cuántos días mostrar en la grilla (30 por defecto). */
  windowDays?: number
}

const DIFFICULTY_LABEL: Record<NonNullable<Goal['difficulty']>, string> = {
  easy: 'Fácil',
  medium: 'Media',
  hard: 'Difícil',
}

const FREQUENCY_LABEL: Record<string, string> = {
  daily: 'Todos los días',
  daysOfWeek: 'Días específicos',
  timesPerWeek: 'Veces por semana',
  monthly: 'Mensual',
}

function frequencyLabel(habit: Goal): string {
  const freq = habit.frequency
  if (!freq) return FREQUENCY_LABEL.daily
  if (freq.type === 'timesPerWeek') return `${freq.timesPerWeek}x por semana`
  return FREQUENCY_LABEL[freq.type] ?? FREQUENCY_LABEL.daily
}

/** Tarjeta de un hábito: racha actual/mejor, % de cumplimiento y grilla de últimos días.
 * La edición (nombre/categoría/frecuencia/dificultad/pausar/eliminar) vive detrás del
 * ícono de lápiz, en `EditHabitModal` — única fuente de verdad, sin duplicar en Ajustes. */
export function HabitCard({ habit, categoryName, categories, days, today, onUpdate, onRemove, windowDays = 30 }: Props) {
  const [editing, setEditing] = useState(false)
  const dates = useMemo(
    () => Array.from({ length: windowDays }, (_, i) => addDays(today, -(windowDays - 1 - i))),
    [today, windowDays],
  )

  const streaks = useMemo(() => goalStreaks(days, habit.id, today), [days, habit.id, today])

  const percent = useMemo(() => {
    let present = 0
    let completed = 0
    for (const date of dates) {
      const done = goalCompletionOn(days[date], habit.id)
      if (done === null) continue
      present += 1
      if (done) completed += 1
    }
    return present === 0 ? 0 : Math.round((completed / present) * 100)
  }, [dates, days, habit.id])

  return (
    <div className="habit-card">
      <div className="habit-card__head">
        <div style={{ minWidth: 0 }}>
          <p className="habit-card__name">{habit.name}</p>
          <p className="habit-card__category">
            {categoryName} · {frequencyLabel(habit)}
            {habit.difficulty && ` · ${DIFFICULTY_LABEL[habit.difficulty]}`}
          </p>
        </div>
        <div className="habit-card__actions">
          {!habit.active && <span className="habit-card__paused">Pausado</span>}
          <button type="button" className="icon-btn" aria-label={`Editar ${habit.name}`} onClick={() => setEditing(true)}>
            ✎
          </button>
        </div>
      </div>

      <div className="stat-grid">
        <Stat label="Racha actual" value={`🔥 ${streaks.current}`} />
        <Stat label="Mejor racha" value={streaks.best} />
        <Stat label={`Últimos ${windowDays} días`} value={`${percent}%`} />
      </div>

      <div className="habit-heatmap" aria-hidden="true">
        {dates.map((date) => {
          const done = goalCompletionOn(days[date], habit.id)
          const band = done === null ? 'none' : done ? 'top' : 'low'
          return (
            <span
              key={date}
              className="habit-heatmap__cell"
              title={`${formatShortDate(date)} — ${done === null ? 'sin registro' : done ? 'cumplido' : 'no cumplido'}`}
              style={{ background: BAND_COLOR[band] }}
            />
          )
        })}
      </div>

      {editing && (
        <EditHabitModal
          habit={habit}
          categories={categories}
          onUpdate={onUpdate}
          onRemove={onRemove}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  )
}
