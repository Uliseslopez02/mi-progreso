import type { Project, ProjectStatus } from '../domain/types'
import { SelectMenu } from './SelectMenu'

interface Props {
  project: Project
  doneCount: number
  taskCount: number
  onUpdate: (patch: Partial<Omit<Project, 'id'>>) => void
  onOpen: () => void
}

const STATUS_OPTIONS: Array<{ value: ProjectStatus; label: string; color: string }> = [
  { value: 'active', label: 'Activo', color: 'var(--band-top)' },
  { value: 'completed', label: 'Completado', color: 'var(--accent)' },
  { value: 'archived', label: 'Archivado', color: 'var(--text-dim)' },
]

/** Tarjeta destacada (estilo hero) de un proyecto activo/diario. */
export function ProjectCard({ project, doneCount, taskCount, onUpdate, onOpen }: Props) {
  const percent = taskCount === 0 ? 0 : Math.round((doneCount / taskCount) * 100)

  return (
    <div className="project-hero">
      <div className="project-hero__head">
        <span className="project-hero__name">{project.name}</span>
        <SelectMenu
          value={project.status}
          options={STATUS_OPTIONS}
          onChange={(status) => onUpdate({ status })}
          ariaLabel={`Estado de ${project.name}`}
        />
      </div>

      {project.description && <p className="card__hint">{project.description}</p>}

      <div className="project-hero__meta">
        <span className="numeric" style={{ fontSize: '1.1rem', color: 'var(--text)' }}>
          {percent}%
        </span>
        <span>
          {doneCount}/{taskCount} {taskCount === 1 ? 'tarea' : 'tareas'}
        </span>
      </div>

      <div className="project-hero__progress-track">
        <div className="project-hero__progress-fill" style={{ width: `${percent}%` }} />
      </div>

      <div className="project-hero__actions">
        <button type="button" className="btn btn--primary" onClick={onOpen}>
          Abrir tablero
        </button>
      </div>
    </div>
  )
}
