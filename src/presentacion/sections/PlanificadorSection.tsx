import { useEffect, useMemo, useState } from 'react'
import { PlannerBoard } from '../../components/PlannerBoard'
import { PlannerItemDetail } from '../../components/PlannerItemDetail'
import { addDays, formatLongDate, formatShortDate, startOfWeek, weekDays, type DateKey } from '../../domain/date'
import { createId } from '../../domain/id'
import type { PlannerCategory, PlannerItem, PlannerItemType, PlannerPriority } from '../../domain/types'
import { SectionFrame } from '../SectionFrame'
import { TODAY } from '../demoData'
import { usePresentacion } from '../PresentacionState'

/**
 * Recreación de Agenda → Planificador: el mismo `<PlannerBoard>` (7 columnas,
 * tarjetas compactas, arrastrar para reordenar o cambiar de día) y el mismo
 * `<PlannerItemDetail>` al tocar una tarjeta. Comparte `plannerItems` con
 * Agenda del día — mover algo acá también lo mueve ahí.
 */
export function PlanificadorSection() {
  const { goals, plannerItems, addPlannerItem, togglePlannerItem, updatePlannerItem, removePlannerItem, reorderPlannerItems } =
    usePresentacion()

  const [weekStart, setWeekStart] = useState<DateKey>(startOfWeek(TODAY))
  const [openId, setOpenId] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newDate, setNewDate] = useState<DateKey>(TODAY)
  const [newType, setNewType] = useState<PlannerItemType>('task')
  const [newCategory, setNewCategory] = useState<PlannerCategory>('personal')
  const [newPriority, setNewPriority] = useState<PlannerPriority>('medium')
  const [newTime, setNewTime] = useState('')
  const [newDuration, setNewDuration] = useState(30)
  const [showMore, setShowMore] = useState(false)

  const days = useMemo(() => weekDays(weekStart), [weekStart])

  useEffect(() => {
    if (!days.includes(newDate)) setNewDate(days[0])
  }, [days, newDate])

  const habitNameById = useMemo(
    () => Object.fromEntries(goals.filter((g) => g.trackingKind === 'habit').map((h) => [h.id, h.name])),
    [goals],
  )

  const itemsByDay = useMemo(() => {
    const map: Record<DateKey, PlannerItem[]> = {}
    for (const item of plannerItems) (map[item.date] ??= []).push(item)
    for (const date of Object.keys(map)) map[date].sort((a, b) => a.order - b.order)
    return map
  }, [plannerItems])

  const openItem = openId ? plannerItems.find((i) => i.id === openId) ?? null : null

  const addFromForm = () => {
    const title = newTitle.trim()
    if (!title) return
    addPlannerItem({
      id: createId('task'),
      date: newDate,
      title,
      type: newType,
      category: newCategory,
      priority: newPriority,
      done: false,
      order: itemsByDay[newDate]?.length ?? 0,
      createdAt: new Date().toISOString(),
      startTime: newTime || undefined,
      durationMinutes: newTime ? newDuration : undefined,
    })
    setNewTitle('')
    setNewTime('')
  }

  return (
    <SectionFrame
      eyebrow="Tu semana"
      title="Planificador: la semana entera de un vistazo."
      subtitle="Cada tarjeta es un resumen — estado, título y hora. Arrastrala para reordenarla o moverla de día; tocala para ver y editar todo lo demás."
      className="pr-planificador"
    >
      <section className="card">
        <div className="card__header">
          <h3 className="card__title">Planificador semanal</h3>
          <div className="planner-weeknav">
            <button
              type="button"
              className="icon-btn"
              aria-label="Semana anterior"
              onClick={() => setWeekStart(addDays(weekStart, -7))}
            >
              ‹
            </button>
            <button
              type="button"
              className="btn btn--ghost planner-weeknav__today"
              onClick={() => setWeekStart(startOfWeek(TODAY))}
            >
              Esta semana
            </button>
            <button
              type="button"
              className="icon-btn"
              aria-label="Semana siguiente"
              onClick={() => setWeekStart(addDays(weekStart, 7))}
            >
              ›
            </button>
          </div>
        </div>
        <p className="card__hint" style={{ marginBottom: 14 }}>
          {formatShortDate(weekStart)} – {formatShortDate(addDays(weekStart, 6))} · arrastrá una tarea para
          moverla de día u orden
        </p>

        <PlannerBoard
          days={days}
          today={TODAY}
          itemsByDay={itemsByDay}
          onToggle={togglePlannerItem}
          onReorder={reorderPlannerItems}
          onOpen={setOpenId}
        />
      </section>

      {openItem && (
        <PlannerItemDetail
          item={openItem}
          days={days}
          habitName={openItem.linkedHabitId ? habitNameById[openItem.linkedHabitId] : undefined}
          onClose={() => setOpenId(null)}
          onToggle={togglePlannerItem}
          onPatch={updatePlannerItem}
          onRemove={removePlannerItem}
        />
      )}

      <section className="card" style={{ marginTop: 16 }}>
        <div className="card__header">
          <h3 className="card__title">Agregar a la semana</h3>
          <span className="card__hint">{formatLongDate(newDate)}</span>
        </div>
        <div className="row">
          <div className="field" style={{ flex: '2 1 220px' }}>
            <label className="field__label" htmlFor="pr-planner-title">
              Título
            </label>
            <input
              id="pr-planner-title"
              className="input"
              placeholder="Ej. Revisar propuesta"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addFromForm()
              }}
            />
          </div>
          <div className="field" style={{ flex: '1 1 140px' }}>
            <label className="field__label" htmlFor="pr-planner-day">
              Día
            </label>
            <select id="pr-planner-day" className="select" value={newDate} onChange={(e) => setNewDate(e.target.value)}>
              {days.map((date) => (
                <option key={date} value={date}>
                  {formatShortDate(date)}
                </option>
              ))}
            </select>
          </div>
          <button type="button" className="btn btn--ghost" aria-expanded={showMore} onClick={() => setShowMore((v) => !v)}>
            {showMore ? 'Menos opciones ▴' : 'Más opciones ▾'}
          </button>
          <button type="button" className="btn btn--primary" onClick={addFromForm}>
            Agregar
          </button>
        </div>

        {showMore && (
          <div className="row" style={{ marginTop: 10 }}>
            <div className="field" style={{ flex: '1 1 110px' }}>
              <label className="field__label" htmlFor="pr-planner-time">
                Hora (opcional)
              </label>
              <input
                id="pr-planner-time"
                type="time"
                className="input"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
              />
            </div>
            {newTime && (
              <div className="field" style={{ flex: '1 1 120px' }}>
                <label className="field__label" htmlFor="pr-planner-duration">
                  Duración
                </label>
                <select
                  id="pr-planner-duration"
                  className="select"
                  value={newDuration}
                  onChange={(e) => setNewDuration(Number(e.target.value))}
                >
                  {[15, 30, 45, 60, 90, 120].map((minutes) => (
                    <option key={minutes} value={minutes}>
                      {minutes} min
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="field" style={{ flex: '1 1 120px' }}>
              <label className="field__label" htmlFor="pr-planner-type">
                Tipo
              </label>
              <select
                id="pr-planner-type"
                className="select"
                value={newType}
                onChange={(e) => setNewType(e.target.value as PlannerItemType)}
              >
                <option value="task">Tarea</option>
                <option value="event">Evento</option>
              </select>
            </div>
            <div className="field" style={{ flex: '1 1 140px' }}>
              <label className="field__label" htmlFor="pr-planner-category">
                Categoría
              </label>
              <select
                id="pr-planner-category"
                className="select"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as PlannerCategory)}
              >
                <option value="personal">Personal</option>
                <option value="professional">Profesional</option>
              </select>
            </div>
            <div className="field" style={{ flex: '1 1 140px' }}>
              <label className="field__label" htmlFor="pr-planner-priority">
                Prioridad
              </label>
              <select
                id="pr-planner-priority"
                className="select"
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as PlannerPriority)}
              >
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
              </select>
            </div>
          </div>
        )}
      </section>
    </SectionFrame>
  )
}
