import type { Project, ProjectStatus } from '../domain/types'

interface Props {
  project: Project
  taskCount: number
  onUpdate: (patch: Partial<Omit<Project, 'id'>>) => void
  onRemove: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  onOpen: () => void
}

const STATUS_LABEL: Record<ProjectStatus, string> = {
  active: 'Activo',
  completed: 'Completado',
  archived: 'Archivado',
}

/** CRUD de un proyecto: nombre, descripción, estado y acceso a su tablero. */
export function ProjectCard({ project, taskCount, onUpdate, onRemove, onMoveUp, onMoveDown, onOpen }: Props) {
  return (
    <div className="routine-card">
      <div className="lifegoal-card__head">
        <input
          className="input"
          style={{ fontSize: '1.05rem', fontWeight: 650 }}
          aria-label="Nombre del proyecto"
          value={project.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
        />
      </div>

      <div className="lifegoal-card__meta">
        <select
          className="select"
          aria-label="Estado del proyecto"
          value={project.status}
          onChange={(e) => onUpdate({ status: e.target.value as ProjectStatus })}
        >
          {(Object.keys(STATUS_LABEL) as ProjectStatus[]).map((key) => (
            <option key={key} value={key}>
              {STATUS_LABEL[key]}
            </option>
          ))}
        </select>
        <span className="card__hint">{taskCount} {taskCount === 1 ? 'tarea' : 'tareas'}</span>
      </div>

      <div className="field" style={{ marginBottom: 12 }}>
        <input
          className="input"
          placeholder="Descripción (opcional)"
          aria-label="Descripción del proyecto"
          value={project.description ?? ''}
          onChange={(e) => onUpdate({ description: e.target.value })}
        />
      </div>

      <div className="settings-goal__actions">
        <button type="button" className="btn btn--primary" onClick={onOpen}>
          Abrir tablero
        </button>
        {onMoveUp && (
          <button type="button" className="icon-btn" aria-label="Subir proyecto" onClick={onMoveUp}>
            ↑
          </button>
        )}
        {onMoveDown && (
          <button type="button" className="icon-btn" aria-label="Bajar proyecto" onClick={onMoveDown}>
            ↓
          </button>
        )}
        <button type="button" className="btn btn--danger" onClick={onRemove}>
          Eliminar
        </button>
      </div>
    </div>
  )
}
