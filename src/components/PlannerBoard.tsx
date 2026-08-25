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
import { formatTimeRange } from '../domain/time'
import type { PlannerItem } from '../domain/types'

const PRIORITY_COLOR: Record<PlannerItem['priority'], string> = {
  low: 'var(--text-dim)',
  medium: 'var(--band-good)',
  high: 'var(--band-low)',
}

const CATEGORY_LABEL: Record<PlannerItem['category'], string> = {
  personal: 'Personal',
  professional: 'Profesional',
}

interface Props {
  days: DateKey[]
  today: DateKey
  itemsByDay: Record<DateKey, PlannerItem[]>
  onToggle: (id: string) => void
  onRemove: (id: string) => void
  onReorder: (updates: Array<{ id: string; date: DateKey; order: number }>) => void
}

function SortableRow({
  item,
  onToggle,
  onRemove,
}: {
  item: PlannerItem
  onToggle: (id: string) => void
  onRemove: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })

  return (
    <li
      ref={setNodeRef}
      className={`planner-item${item.done ? ' planner-item--done' : ''}${isDragging ? ' planner-item--dragging' : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
    >
      <input
        type="checkbox"
        checked={item.done}
        aria-label={item.title}
        onPointerDown={(e) => e.stopPropagation()}
        onChange={() => onToggle(item.id)}
      />
      <div>
        <p className="planner-item__title">
          {item.type === 'event' ? '📅 ' : ''}
          {item.title}
        </p>
        <div className="planner-item__meta">
          <span className="planner-item__dot" style={{ background: PRIORITY_COLOR[item.priority] }} />
          <span className="planner-item__tag">{CATEGORY_LABEL[item.category]}</span>
          {item.startTime && (
            <span className="planner-item__tag">{formatTimeRange(item.startTime, item.durationMinutes ?? 30)}</span>
          )}
        </div>
      </div>
      <button
        type="button"
        className="planner-item__remove"
        aria-label={`Eliminar ${item.title}`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => onRemove(item.id)}
      >
        ×
      </button>
    </li>
  )
}

function DayColumn({
  date,
  today,
  items,
  onToggle,
  onRemove,
}: {
  date: DateKey
  today: DateKey
  items: PlannerItem[]
  onToggle: (id: string) => void
  onRemove: (id: string) => void
}) {
  const { setNodeRef } = useDroppable({ id: `day:${date}` })

  return (
    <div className={`planner-day${date === today ? ' planner-day--today' : ''}`}>
      <div className="planner-day__header">
        <span className="planner-day__weekday">{formatWeekday(date)}</span>
        <span className="planner-day__date numeric">{formatShortDate(date)}</span>
      </div>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <ul className="planner-day__items" ref={setNodeRef}>
          {items.map((item) => (
            <SortableRow key={item.id} item={item} onToggle={onToggle} onRemove={onRemove} />
          ))}
        </ul>
      </SortableContext>
    </div>
  )
}

/** Grilla de 7 días con arrastre libre entre columnas (@dnd-kit). */
export function PlannerBoard({ days, today, itemsByDay, onToggle, onRemove, onReorder }: Props) {
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
              onRemove={onRemove}
            />
          ))}
        </div>
      </DndContext>
    </div>
  )
}
