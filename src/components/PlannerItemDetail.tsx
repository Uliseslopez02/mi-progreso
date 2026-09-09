import { useEffect, useState } from 'react'
import { Modal } from './Modal'
import { formatShortDate, formatWeekday, type DateKey } from '../domain/date'
import type { PlannerCategory, PlannerItem, PlannerItemType, PlannerPriority } from '../domain/types'

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120]

interface Props {
  item: PlannerItem
  days: DateKey[]
  habitName?: string
  onClose: () => void
  onToggle: (id: string) => void
  onPatch: (id: string, patch: Partial<Omit<PlannerItem, 'id'>>) => void
  onRemove: (id: string) => void
}

/**
 * Detalle de una tarea del planificador. La tarjeta de la grilla es sólo un
 * resumen (estado + título + hora); acá vive toda la información editable y las
 * acciones. Reusa `updatePlannerItem` para cada cambio — se aplica al instante,
 * sin botón de guardar, igual criterio que el resto de la app.
 */
export function PlannerItemDetail({ item, days, habitName, onClose, onToggle, onPatch, onRemove }: Props) {
  const [title, setTitle] = useState(item.title)

  // Si el ítem cambia por fuera (ej. otro cliente), reflejarlo en el input.
  useEffect(() => setTitle(item.title), [item.id, item.title])

  const commitTitle = () => {
    const trimmed = title.trim()
    if (trimmed && trimmed !== item.title) onPatch(item.id, { title: trimmed })
    else if (!trimmed) setTitle(item.title)
  }

  return (
    <Modal
      title="Detalle de la tarea"
      width={440}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            className="btn btn--danger"
            onClick={() => {
              onRemove(item.id)
              onClose()
            }}
          >
            Eliminar
          </button>
          <button type="button" className="btn btn--primary" onClick={onClose}>
            Listo
          </button>
        </>
      }
    >
      <div className="planner-detail">
        <button
          type="button"
          className={`planner-detail__status${item.done ? ' planner-detail__status--done' : ''}`}
          aria-pressed={item.done}
          onClick={() => onToggle(item.id)}
        >
          <span className="planner-detail__check" aria-hidden="true">
            {item.done ? '✓' : ''}
          </span>
          {item.done ? 'Hecha' : 'Marcar como hecha'}
        </button>

        <div className="field">
          <label className="field__label" htmlFor="planner-detail-title">
            Título
          </label>
          <input
            id="planner-detail-title"
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
            }}
          />
        </div>

        <div className="planner-detail__row">
          <div className="field">
            <label className="field__label" htmlFor="planner-detail-day">
              Día
            </label>
            <select
              id="planner-detail-day"
              className="select"
              value={item.date}
              onChange={(e) => onPatch(item.id, { date: e.target.value })}
            >
              {days.map((date) => (
                <option key={date} value={date}>
                  {formatWeekday(date)} {formatShortDate(date)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field__label" htmlFor="planner-detail-time">
              Hora
            </label>
            <input
              id="planner-detail-time"
              type="time"
              className="input"
              value={item.startTime ?? ''}
              onChange={(e) =>
                onPatch(item.id, {
                  startTime: e.target.value || undefined,
                  durationMinutes: e.target.value ? (item.durationMinutes ?? 30) : undefined,
                })
              }
            />
          </div>
          {item.startTime && (
            <div className="field">
              <label className="field__label" htmlFor="planner-detail-duration">
                Duración
              </label>
              <select
                id="planner-detail-duration"
                className="select"
                value={item.durationMinutes ?? 30}
                onChange={(e) => onPatch(item.id, { durationMinutes: Number(e.target.value) })}
              >
                {DURATION_OPTIONS.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes} min
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="planner-detail__row">
          <div className="field">
            <label className="field__label" htmlFor="planner-detail-type">
              Tipo
            </label>
            <select
              id="planner-detail-type"
              className="select"
              value={item.type}
              onChange={(e) => onPatch(item.id, { type: e.target.value as PlannerItemType })}
            >
              <option value="task">Tarea</option>
              <option value="event">Evento</option>
            </select>
          </div>
          <div className="field">
            <label className="field__label" htmlFor="planner-detail-category">
              Categoría
            </label>
            <select
              id="planner-detail-category"
              className="select"
              value={item.category}
              onChange={(e) => onPatch(item.id, { category: e.target.value as PlannerCategory })}
            >
              <option value="personal">Personal</option>
              <option value="professional">Profesional</option>
            </select>
          </div>
          <div className="field">
            <label className="field__label" htmlFor="planner-detail-priority">
              Prioridad
            </label>
            <select
              id="planner-detail-priority"
              className="select"
              value={item.priority}
              onChange={(e) => onPatch(item.id, { priority: e.target.value as PlannerPriority })}
            >
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
            </select>
          </div>
        </div>

        {habitName && <p className="planner-detail__habit">Vinculada al hábito · {habitName}</p>}
      </div>
    </Modal>
  )
}
