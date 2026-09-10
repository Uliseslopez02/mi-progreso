import { useState, type PointerEvent as ReactPointerEvent } from 'react'
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ProjectTask, ProjectTaskStatus } from '../domain/types'

const STATUSES: ProjectTaskStatus[] = ['todo', 'doing', 'done']

const STATUS_LABEL: Record<ProjectTaskStatus, string> = {
  todo: 'Por hacer',
  doing: 'En curso',
  done: 'Hecho',
}

/** Mismo lenguaje visual que se usaría para "por hacer/en curso/hecho" en
 * cualquier otro lugar de la app — reconocible sin tener que leer la etiqueta. */
const STATUS_ICON: Record<ProjectTaskStatus, string> = {
  todo: '○',
  doing: '◐',
  done: '✓',
}

const STATUS_COLOR: Record<ProjectTaskStatus, string> = {
  todo: 'var(--text-dim)',
  doing: 'var(--band-good)',
  done: 'var(--band-top)',
}

interface Props {
  tasksByStatus: Record<ProjectTaskStatus, ProjectTask[]>
  onRemove: (id: string) => void
  onReorder: (updates: Array<{ id: string; status: ProjectTaskStatus; order: number }>) => void
  /** Alta rápida directo en una columna — cae en ese estado, sin pasar por el form de arriba. */
  onAdd: (status: ProjectTaskStatus, title: string) => void
}

/** Contenido visual de una tarjeta — compartido entre la versión arrastrable
 * (`SortableCard`) y el clon que sigue al dedo/cursor en el `DragOverlay`. */
function CardContent({ task, onRemove }: { task: ProjectTask; onRemove?: (id: string) => void }) {
  const stop = (e: ReactPointerEvent) => e.stopPropagation()
  return (
    <>
      <span className="drag-handle" aria-hidden="true">
        ⠿
      </span>
      <p className="planner-item__title">{task.title}</p>
      {onRemove && (
        <button
          type="button"
          className="planner-item__remove"
          aria-label={`Eliminar ${task.title}`}
          onPointerDown={stop}
          onClick={() => onRemove(task.id)}
        >
          ×
        </button>
      )}
    </>
  )
}

function SortableCard({ task, onRemove }: { task: ProjectTask; onRemove: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  })

  return (
    <li
      ref={setNodeRef}
      className={`planner-item kanban-card${isDragging ? ' planner-item--dragging' : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
    >
      <CardContent task={task} onRemove={onRemove} />
    </li>
  )
}

function StatusColumn({
  status,
  tasks,
  onRemove,
  onAdd,
}: {
  status: ProjectTaskStatus
  tasks: ProjectTask[]
  onRemove: (id: string) => void
  onAdd: (status: ProjectTaskStatus, title: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `status:${status}` })
  const [newTitle, setNewTitle] = useState('')

  const addHere = () => {
    const title = newTitle.trim()
    if (!title) return
    onAdd(status, title)
    setNewTitle('')
  }

  return (
    <div className={`planner-day kanban-column${isOver ? ' kanban-column--over' : ''}`}>
      <div className="planner-day__header">
        <span className="planner-day__weekday">
          <span aria-hidden="true" style={{ color: STATUS_COLOR[status] }}>
            {STATUS_ICON[status]}
          </span>{' '}
          {STATUS_LABEL[status]}
        </span>
        <span className="planner-day__date numeric">{tasks.length}</span>
      </div>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <ul className="planner-day__items" ref={setNodeRef}>
          {tasks.map((task) => (
            <SortableCard key={task.id} task={task} onRemove={onRemove} />
          ))}
          {tasks.length === 0 && <li className="kanban-column__empty">Soltá una tarea acá</li>}
        </ul>
      </SortableContext>
      <div className="planner-day__add">
        <input
          className="input"
          placeholder="+ Agregar"
          aria-label={`Agregar tarea a ${STATUS_LABEL[status]}`}
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addHere()
          }}
        />
        <button type="button" className="icon-btn" aria-label={`Agregar a ${STATUS_LABEL[status]}`} onClick={addHere}>
          +
        </button>
      </div>
    </div>
  )
}

/** Tablero Kanban de un proyecto: columnas de estado en vez de columnas de día.
 * Soporta mouse (arrastre inmediato) y táctil (mantener presionado para no
 * chocar con el scroll vertical de la columna, ver `TouchSensor` abajo). */
export function KanbanBoard({ tasksByStatus, onRemove, onReorder, onAdd }: Props) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )
  const [activeId, setActiveId] = useState<string | null>(null)

  const findStatus = (taskId: string): ProjectTaskStatus | null => {
    for (const status of STATUSES) {
      if (tasksByStatus[status]?.some((t) => t.id === taskId)) return status
    }
    return null
  }

  const activeTask = activeId
    ? (STATUSES.map((s) => tasksByStatus[s]?.find((t) => t.id === activeId)).find(Boolean) ?? null)
    : null

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event
    if (!over) return
    const activeId = String(active.id)
    const overId = String(over.id)

    const sourceStatus = findStatus(activeId)
    if (!sourceStatus) return

    const targetStatus: ProjectTaskStatus = overId.startsWith('status:')
      ? (overId.slice(7) as ProjectTaskStatus)
      : (findStatus(overId) ?? sourceStatus)

    const activeTask = tasksByStatus[sourceStatus]?.find((t) => t.id === activeId)
    if (!activeTask) return

    const targetList = (tasksByStatus[targetStatus] ?? []).filter((t) => t.id !== activeId)
    let insertIndex = targetList.length
    if (!overId.startsWith('status:')) {
      const overIndex = targetList.findIndex((t) => t.id === overId)
      if (overIndex !== -1) insertIndex = overIndex
    }

    const newIds = targetList.map((t) => t.id)
    newIds.splice(insertIndex, 0, activeId)

    onReorder(newIds.map((id, order) => ({ id, status: targetStatus, order })))
  }

  return (
    <div className="planner-scroll">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="planner-grid">
          {STATUSES.map((status) => (
            <StatusColumn
              key={status}
              status={status}
              tasks={tasksByStatus[status] ?? []}
              onRemove={onRemove}
              onAdd={onAdd}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask && (
            <ul className="planner-day__items">
              <li className="planner-item kanban-card kanban-card--overlay">
                <CardContent task={activeTask} />
              </li>
            </ul>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
