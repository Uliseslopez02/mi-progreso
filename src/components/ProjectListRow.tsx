import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Project, ProjectStatus } from '../domain/types'
import { SelectMenu } from './SelectMenu'

interface Props {
  project: Project
  doneCount: number
  taskCount: number
  onUpdate: (patch: Partial<Omit<Project, 'id'>>) => void
  onRemove: () => void
  onOpen: () => void
}

const STATUS_OPTIONS: Array<{ value: ProjectStatus; label: string; color: string }> = [
  { value: 'active', label: 'Activo', color: 'var(--band-top)' },
  { value: 'completed', label: 'Completado', color: 'var(--accent)' },
  { value: 'archived', label: 'Archivado', color: 'var(--text-dim)' },
]

/** Fila compacta de un proyecto dentro de "Todos los proyectos", arrastrable para reordenar. */
export function ProjectListRow({ project, doneCount, taskCount, onUpdate, onRemove, onOpen }: Props) {
  const percent = taskCount === 0 ? 0 : Math.round((doneCount / taskCount) * 100)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: project.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`project-row${isDragging ? ' project-row--dragging' : ''}`}
    >
      <button
        type="button"
        className="project-row__handle"
        aria-label={`Reordenar ${project.name}`}
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>

      <button type="button" className="project-row__name-col" onClick={onOpen}>
        <span className="project-row__name">{project.name}</span>
        <span className="project-row__progress-track">
          <span className="project-row__progress-fill" style={{ width: `${percent}%` }} />
        </span>
      </button>

      <span className="project-row__count">
        {doneCount}/{taskCount}
      </span>

      <SelectMenu
        value={project.status}
        options={STATUS_OPTIONS}
        onChange={(status) => onUpdate({ status })}
        ariaLabel={`Estado de ${project.name}`}
      />

      <button type="button" className="icon-btn" aria-label={`Eliminar ${project.name}`} onClick={onRemove}>
        🗑
      </button>
    </div>
  )
}
