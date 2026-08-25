import { useMemo, useState } from 'react'
import { DayTimeline } from '../components/DayTimeline'
import { addDays, formatLongDate, type DateKey } from '../domain/date'
import { createId } from '../domain/id'
import type { PlannerCategory, PlannerItem, PlannerItemType, PlannerPriority } from '../domain/types'
import { useAppData } from '../state/context'

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120]

export function DayAgendaPage() {
  const { data, today, dispatch } = useAppData()
  const [date, setDate] = useState<DateKey>(today)
  const [newTitle, setNewTitle] = useState('')
  const [newTime, setNewTime] = useState('')
  const [newDuration, setNewDuration] = useState(30)
  const [newType, setNewType] = useState<PlannerItemType>('task')
  const [newCategory, setNewCategory] = useState<PlannerCategory>('personal')
  const [newPriority, setNewPriority] = useState<PlannerPriority>('medium')

  const items = useMemo(
    () => data.plannerItems.filter((i) => i.date === date).sort((a, b) => a.order - b.order),
    [data.plannerItems, date],
  )

  const nowMinutes = useMemo(() => {
    if (date !== today) return null
    const now = new Date()
    return now.getHours() * 60 + now.getMinutes()
  }, [date, today])

  const patchItem = (id: string, patch: Partial<Omit<PlannerItem, 'id'>>) =>
    dispatch({ type: 'updatePlannerItem', id, patch })

  const addItem = () => {
    const trimmed = newTitle.trim()
    if (!trimmed) return
    dispatch({
      type: 'addPlannerItem',
      item: {
        id: createId('task'),
        date,
        title: trimmed,
        type: newType,
        category: newCategory,
        priority: newPriority,
        done: false,
        order: items.length,
        createdAt: new Date().toISOString(),
        startTime: newTime || undefined,
        durationMinutes: newTime ? newDuration : undefined,
      },
    })
    setNewTitle('')
    setNewTime('')
  }

  const duplicateItem = (id: string) => {
    const item = data.plannerItems.find((i) => i.id === id)
    if (!item) return
    dispatch({
      type: 'addPlannerItem',
      item: { ...item, id: createId('task'), done: false, order: items.length, createdAt: new Date().toISOString() },
    })
  }

  return (
    <div className="stack">
      <section className="card">
        <div className="card__header">
          <h2 className="card__title">Agenda del día</h2>
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn btn--ghost" onClick={() => setDate(addDays(date, -1))}>
              ‹ Día anterior
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setDate(today)}>
              Hoy
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setDate(addDays(date, 1))}>
              Día siguiente ›
            </button>
          </div>
        </div>
        <p className="card__hint" style={{ marginBottom: 14 }}>
          {formatLongDate(date)} · arrastrá un bloque para cambiar la hora, o su borde inferior para cambiar la
          duración
        </p>

        <DayTimeline
          items={items}
          nowMinutes={nowMinutes}
          onToggle={(id) => {
            const item = data.plannerItems.find((i) => i.id === id)
            if (item) patchItem(id, { done: !item.done })
          }}
          onRemove={(id) => dispatch({ type: 'removePlannerItem', id })}
          onDuplicate={duplicateItem}
          onPostpone={(id) => {
            const item = data.plannerItems.find((i) => i.id === id)
            if (item) patchItem(id, { date: addDays(item.date, 1) })
          }}
          onMove={(id, startTime) => patchItem(id, { startTime })}
          onResize={(id, durationMinutes) => patchItem(id, { durationMinutes })}
        />
      </section>

      <section className="card">
        <div className="card__header">
          <h2 className="card__title">Agregar a este día</h2>
          <span className="card__hint">{formatLongDate(date)}</span>
        </div>
        <div className="row">
          <div className="field" style={{ flex: '2 1 220px' }}>
            <label className="field__label" htmlFor="day-title">
              Título
            </label>
            <input
              id="day-title"
              className="input"
              placeholder="Ej. Revisar propuesta"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addItem()
              }}
            />
          </div>
          <div className="field" style={{ flex: '1 1 110px' }}>
            <label className="field__label" htmlFor="day-time">
              Hora (opcional)
            </label>
            <input
              id="day-time"
              type="time"
              className="input"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
            />
          </div>
          {newTime && (
            <div className="field" style={{ flex: '1 1 120px' }}>
              <label className="field__label" htmlFor="day-duration">
                Duración
              </label>
              <select
                id="day-duration"
                className="select"
                value={newDuration}
                onChange={(e) => setNewDuration(Number(e.target.value))}
              >
                {DURATION_OPTIONS.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes} min
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="field" style={{ flex: '1 1 120px' }}>
            <label className="field__label" htmlFor="day-type">
              Tipo
            </label>
            <select
              id="day-type"
              className="select"
              value={newType}
              onChange={(e) => setNewType(e.target.value as PlannerItemType)}
            >
              <option value="task">Tarea</option>
              <option value="event">Evento</option>
            </select>
          </div>
          <div className="field" style={{ flex: '1 1 140px' }}>
            <label className="field__label" htmlFor="day-category">
              Categoría
            </label>
            <select
              id="day-category"
              className="select"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as PlannerCategory)}
            >
              <option value="personal">Personal</option>
              <option value="professional">Profesional</option>
            </select>
          </div>
          <div className="field" style={{ flex: '1 1 140px' }}>
            <label className="field__label" htmlFor="day-priority">
              Prioridad
            </label>
            <select
              id="day-priority"
              className="select"
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as PlannerPriority)}
            >
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
            </select>
          </div>
          <button type="button" className="btn btn--primary" onClick={addItem}>
            Agregar
          </button>
        </div>
      </section>
    </div>
  )
}
