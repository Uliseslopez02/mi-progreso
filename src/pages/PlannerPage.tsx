import { useEffect, useMemo, useState } from 'react'
import { PlannerBoard } from '../components/PlannerBoard'
import { addDays, formatLongDate, formatShortDate, startOfWeek, weekDays, type DateKey } from '../domain/date'
import { createId } from '../domain/id'
import type { PlannerCategory, PlannerItemType, PlannerPriority } from '../domain/types'
import { useAppData } from '../state/context'

export function PlannerPage() {
  const { data, today, dispatch } = useAppData()
  const [weekStart, setWeekStart] = useState<DateKey>(startOfWeek(today))
  const [newTitle, setNewTitle] = useState('')
  const [newDate, setNewDate] = useState<DateKey>(today)
  const [newType, setNewType] = useState<PlannerItemType>('task')
  const [newCategory, setNewCategory] = useState<PlannerCategory>('personal')
  const [newPriority, setNewPriority] = useState<PlannerPriority>('medium')

  const days = useMemo(() => weekDays(weekStart), [weekStart])

  // Si cambio de semana, "Día" del formulario debe seguir apuntando a un día visible.
  useEffect(() => {
    if (!days.includes(newDate)) setNewDate(days[0])
  }, [days, newDate])

  const itemsByDay = useMemo(() => {
    const map: Record<DateKey, typeof data.plannerItems> = {}
    for (const item of data.plannerItems) {
      ;(map[item.date] ??= []).push(item)
    }
    for (const date of Object.keys(map)) {
      map[date].sort((a, b) => a.order - b.order)
    }
    return map
  }, [data.plannerItems])

  const addItem = (date: DateKey, title: string, opts?: Partial<{ type: PlannerItemType; category: PlannerCategory; priority: PlannerPriority }>) => {
    const trimmed = title.trim()
    if (!trimmed) return
    const order = (itemsByDay[date]?.length ?? 0)
    dispatch({
      type: 'addPlannerItem',
      item: {
        id: createId('task'),
        date,
        title: trimmed,
        type: opts?.type ?? 'task',
        category: opts?.category ?? 'personal',
        priority: opts?.priority ?? 'medium',
        done: false,
        order,
        createdAt: new Date().toISOString(),
      },
    })
  }

  const addFromTopForm = () => {
    addItem(newDate, newTitle, { type: newType, category: newCategory, priority: newPriority })
    setNewTitle('')
  }

  return (
    <div className="stack">
      <section className="card">
        <div className="card__header">
          <h2 className="card__title">Planificador semanal</h2>
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn btn--ghost" onClick={() => setWeekStart(addDays(weekStart, -7))}>
              ‹ Semana anterior
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setWeekStart(startOfWeek(today))}>
              Esta semana
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setWeekStart(addDays(weekStart, 7))}>
              Semana siguiente ›
            </button>
          </div>
        </div>
        <p className="card__hint" style={{ marginBottom: 14 }}>
          {formatShortDate(weekStart)} – {formatShortDate(addDays(weekStart, 6))} · arrastrá las tareas para
          reordenarlas o moverlas de día
        </p>

        <PlannerBoard
          days={days}
          today={today}
          itemsByDay={itemsByDay}
          onToggle={(id) => {
            const item = data.plannerItems.find((i) => i.id === id)
            if (item) dispatch({ type: 'updatePlannerItem', id, patch: { done: !item.done } })
          }}
          onRemove={(id) => dispatch({ type: 'removePlannerItem', id })}
          onReorder={(updates) => dispatch({ type: 'reorderPlannerItems', updates })}
        />
      </section>

      <section className="card">
        <div className="card__header">
          <h2 className="card__title">Agregar a la semana</h2>
          <span className="card__hint">{formatLongDate(newDate)}</span>
        </div>
        <div className="row">
          <div className="field" style={{ flex: '2 1 220px' }}>
            <label className="field__label" htmlFor="planner-title">
              Título
            </label>
            <input
              id="planner-title"
              className="input"
              placeholder="Ej. Revisar propuesta"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addFromTopForm()
              }}
            />
          </div>
          <div className="field" style={{ flex: '1 1 140px' }}>
            <label className="field__label" htmlFor="planner-day">
              Día
            </label>
            <select
              id="planner-day"
              className="select"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
            >
              {days.map((date) => (
                <option key={date} value={date}>
                  {formatShortDate(date)}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ flex: '1 1 120px' }}>
            <label className="field__label" htmlFor="planner-type">
              Tipo
            </label>
            <select
              id="planner-type"
              className="select"
              value={newType}
              onChange={(e) => setNewType(e.target.value as PlannerItemType)}
            >
              <option value="task">Tarea</option>
              <option value="event">Evento</option>
            </select>
          </div>
          <div className="field" style={{ flex: '1 1 140px' }}>
            <label className="field__label" htmlFor="planner-category">
              Categoría
            </label>
            <select
              id="planner-category"
              className="select"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as PlannerCategory)}
            >
              <option value="personal">Personal</option>
              <option value="professional">Profesional</option>
            </select>
          </div>
          <div className="field" style={{ flex: '1 1 140px' }}>
            <label className="field__label" htmlFor="planner-priority">
              Prioridad
            </label>
            <select
              id="planner-priority"
              className="select"
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as PlannerPriority)}
            >
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
            </select>
          </div>
          <button type="button" className="btn btn--primary" onClick={addFromTopForm}>
            Agregar
          </button>
        </div>
      </section>
    </div>
  )
}
