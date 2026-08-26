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
import type { ProjectTask, ProjectTaskStatus } from '../domain/types'

const STATUSES: ProjectTaskStatus[] = ['todo', 'doing', 'done']

const STATUS_LABEL: Record<ProjectTaskStatus, string> = {
  todo: 'Por hacer',
  doing: 'En curso',
  done: 'Hecho',
}

interface Props {
  tasksByStatus: Record<ProjectTaskStatus, ProjectTask[]>
  onRemove: (id: string) => void
  onReorder: (updates: Array<{ id: string; status: ProjectTaskStatus; order: number }>) => void
}

function SortableCard({ task, onRemove }: { task: ProjectTask; onRemove: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  })

  return (
    <li
      ref={setNodeRef}
      className={`planner-item${isDragging ? ' planner-item--dragging' : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
    >
      <p className="planner-item__title">{task.title}</p>
      <button
        type="button"
        className="planner-item__remove"
        aria-label={`Eliminar ${task.title}`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => onRemove(task.id)}
      >
        ×
      </button>
    </li>
  )
}

function StatusColumn({
  status,
  tasks,
  onRemove,
}: {
  status: ProjectTaskStatus
  tasks: ProjectTask[]
  onRemove: (id: string) => void
}) {
  const { setNodeRef } = useDroppable({ id: `status:${status}` })

  return (
    <div className="planner-day">
      <div className="planner-day__header">
        <span className="planner-day__weekday">{STATUS_LABEL[status]}</span>
      </div>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <ul className="planner-day__items" ref={setNodeRef}>
          {tasks.map((task) => (
            <SortableCard key={task.id} task={task} onRemove={onRemove} />
          ))}
        </ul>
      </SortableContext>
    </div>
  )
}

/** Tablero Kanban de un proyecto: columnas de estado en vez de columnas de día, mismo mecanismo de arrastre que `PlannerBoard`. */
export function KanbanBoard({ tasksByStatus, onRemove, onReorder }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const findStatus = (taskId: string): ProjectTaskStatus | null => {
    for (const status of STATUSES) {
      if (tasksByStatus[status]?.some((t) => t.id === taskId)) return status
    }
    return null
  }

  const handleDragEnd = (event: DragEndEvent) => {
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
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="planner-grid">
          {STATUSES.map((status) => (
            <StatusColumn
              key={status}
              status={status}
              tasks={tasksByStatus[status] ?? []}
              onRemove={onRemove}
            />
          ))}
        </div>
      </DndContext>
    </div>
  )
}
