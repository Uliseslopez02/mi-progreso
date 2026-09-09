import { useState } from 'react'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { formatShortDate, formatWeekday, type DateKey } from '../domain/date'
import { formatTime } from '../domain/time'
import type { PlannerItem } from '../domain/types'

/** Abreviatura de 3 letras del día ("Miércoles" → "Mié"), para el encabezado
 * de columna en desktop, donde el nombre completo no entra. */
function weekdayAbbr(date: DateKey): string {
  return formatWeekday(date).slice(0, 3)
}

interface Props {
  days: DateKey[]
  today: DateKey
  itemsByDay: Record<DateKey, PlannerItem[]>
  onToggle: (id: string) => void
  onReorder: (updates: Array<{ id: string; date: DateKey; order: number }>) => void
  /** Abre el detalle de la tarea (toda la info + acciones). */
  onOpen: (id: string) => void
}

/**
 * Tarjeta-resumen de una línea: estado · título · hora. La prioridad se insinúa
 * con un borde izquierdo de color (alta/media); todo lo demás —categoría,
 * duración, tipo, descripción, acciones— vive en el detalle que abre al tocarla.
 */
function SortableRow({
  item,
  onToggle,
  onOpen,
}: {
  item: PlannerItem
  onToggle: (id: string) => void
  onOpen: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })

  const prioClass =
    !item.done && item.priority !== 'low' ? ` planner-card--prio-${item.priority}` : ''

  return (
    <li
      ref={setNodeRef}
      className={`planner-card${item.done ? ' planner-card--done' : ''}${
        isDragging ? ' planner-card--dragging' : ''
      }${prioClass}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <label className="planner-card__check">
        <input
          type="checkbox"
          checked={item.done}
          aria-label={item.title}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onChange={() => onToggle(item.id)}
        />
      </label>

      <button
        type="button"
        className="planner-card__open"
        title={item.title}
        onClick={() => onOpen(item.id)}
      >
        <span className="planner-card__title">{item.title}</span>
        {item.startTime && (
          <span className="planner-card__time numeric">{formatTime(item.startTime)}</span>
        )}
      </button>

      <button
        type="button"
        className="planner-card__handle"
        aria-label={`Reordenar ${item.title}`}
        {...attributes}
        {...listeners}
      >
        <span aria-hidden="true">⠿</span>
      </button>
    </li>
  )
}

function DayColumn({
  date,
  today,
  items,
  onToggle,
  onOpen,
}: {
  date: DateKey
  today: DateKey
  items: PlannerItem[]
  onToggle: (id: string) => void
  onOpen: (id: string) => void
}) {
  const { setNodeRef } = useDroppable({ id: `day:${date}` })
  const [showDone, setShowDone] = useState(false)

  const pending = items.filter((i) => !i.done)
  const done = items.filter((i) => i.done)
  const visible = showDone ? [...pending, ...done] : pending

  return (
    <div className={`planner-day${date === today ? ' planner-day--today' : ''}`}>
      <div className="planner-day__header">
        <span className="planner-day__weekday">
          <span className="planner-day__weekday-full">{formatWeekday(date)}</span>
          <span className="planner-day__weekday-abbr" aria-hidden="true">
            {weekdayAbbr(date)}
          </span>
        </span>
        <span className="planner-day__date numeric">{formatShortDate(date)}</span>
        {date === today && <span className="planner-day__today-tag">Hoy</span>}
        {pending.length > 0 && (
          <span className="planner-day__count numeric" aria-hidden="true">
            {pending.length}
          </span>
        )}
      </div>

      <SortableContext items={visible.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <ul className="planner-day__items" ref={setNodeRef}>
          {visible.map((item) => (
            <SortableRow key={item.id} item={item} onToggle={onToggle} onOpen={onOpen} />
          ))}
        </ul>
      </SortableContext>

      {pending.length === 0 && done.length === 0 && (
        <p className="planner-day__empty">Sin tareas</p>
      )}

      {done.length > 0 && (
        <button
          type="button"
          className="planner-day__done-toggle"
          aria-expanded={showDone}
          onClick={() => setShowDone((v) => !v)}
        >
          {showDone ? 'Ocultar' : 'Ver'} {done.length} {done.length === 1 ? 'hecha' : 'hechas'}
        </button>
      )}
    </div>
  )
}

/** Grilla de 7 días con arrastre libre entre columnas (@dnd-kit). */
export function PlannerBoard({ days, today, itemsByDay, onToggle, onReorder, onOpen }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const findDate = (itemId: string): DateKey | null => {
    for (const date of days) {
      if (itemsByDay[date]?.some((i) => i.id === itemId)) return date
    }
    return null
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return
    const activeId = String(active.id)
    const overId = String(over.id)

    const sourceDate = findDate(activeId)
    if (!sourceDate) return

    const targetDate: DateKey = overId.startsWith('day:')
      ? (overId.slice(4) as DateKey)
      : (findDate(overId) ?? sourceDate)

    const activeItem = itemsByDay[sourceDate]?.find((i) => i.id === activeId)
    if (!activeItem) return

    const targetList = (itemsByDay[targetDate] ?? []).filter((i) => i.id !== activeId)
    let insertIndex = targetList.length
    if (!overId.startsWith('day:')) {
      const overIndex = targetList.findIndex((i) => i.id === overId)
      if (overIndex !== -1) insertIndex = overIndex
    }

    const newIds = targetList.map((i) => i.id)
    newIds.splice(insertIndex, 0, activeId)

    onReorder(newIds.map((id, order) => ({ id, date: targetDate, order })))
  }

  return (
    <div className="planner-scroll">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="planner-grid">
          {days.map((date) => (
            <DayColumn
              key={date}
              date={date}
              today={today}
              items={itemsByDay[date] ?? []}
              onToggle={onToggle}
              onOpen={onOpen}
            />
          ))}
        </div>
      </DndContext>
    </div>
  )
}
