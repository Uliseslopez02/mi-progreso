import { useMemo, useState } from 'react'
import { KanbanBoard } from '../components/KanbanBoard'
import { createId } from '../domain/id'
import type { Project, ProjectStatus, ProjectTaskStatus } from '../domain/types'
import { useAppData } from '../state/context'

interface Props {
  project: Project
  onBack: () => void
}

const STATUS_LABEL: Record<ProjectStatus, string> = {
  active: 'Activo',
  completed: 'Completado',
  archived: 'Archivado',
}

/** Tablero Kanban de un proyecto: encabezado editable + columnas Por hacer/En curso/Hecho. */
export function ProjectDetailPage({ project, onBack }: Props) {
  const { data, dispatch } = useAppData()
  const [newTitle, setNewTitle] = useState('')

  const tasksByStatus = useMemo(() => {
    const groups: Record<ProjectTaskStatus, typeof data.projectTasks> = { todo: [], doing: [], done: [] }
    for (const task of data.projectTasks) {
      if (task.projectId !== project.id) continue
      groups[task.status].push(task)
    }
    for (const status of Object.keys(groups) as ProjectTaskStatus[]) {
      groups[status].sort((a, b) => a.order - b.order)
    }
    return groups
  }, [data.projectTasks, project.id])

  const addTask = () => {
    const title = newTitle.trim()
    if (!title) return
    dispatch({
      type: 'addProjectTask',
      task: {
        id: createId('tarea'),
        projectId: project.id,
        title,
        status: 'todo',
        order: tasksByStatus.todo.length,
        createdAt: new Date().toISOString(),
      },
    })
    setNewTitle('')
  }

  return (
    <div className="stack">
      <section className="card">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
          <button type="button" className="btn btn--ghost" onClick={onBack}>
            ‹ Volver
          </button>
          <select
            className="select"
            aria-label="Estado del proyecto"
            value={project.status}
            onChange={(e) => dispatch({ type: 'updateProject', id: project.id, patch: { status: e.target.value as ProjectStatus } })}
          >
            {(Object.keys(STATUS_LABEL) as ProjectStatus[]).map((key) => (
              <option key={key} value={key}>
                {STATUS_LABEL[key]}
              </option>
            ))}
          </select>
        </div>
        <input
          className="input"
          style={{ fontSize: '1.2rem', fontWeight: 650, marginBottom: 10 }}
          aria-label="Nombre del proyecto"
          value={project.name}
          onChange={(e) => dispatch({ type: 'updateProject', id: project.id, patch: { name: e.target.value } })}
        />
        <input
          className="input"
          placeholder="Descripción (opcional)"
          aria-label="Descripción del proyecto"
          value={project.description ?? ''}
          onChange={(e) => dispatch({ type: 'updateProject', id: project.id, patch: { description: e.target.value } })}
        />
      </section>

      <section className="card">
        <div className="row" style={{ marginBottom: 14 }}>
          <div className="field" style={{ flex: '1 1 260px' }}>
            <label className="field__label" htmlFor="new-project-task">
              Nueva tarea
            </label>
            <input
              id="new-project-task"
              className="input"
              placeholder="Ej. Armar el borrador"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addTask()
              }}
            />
          </div>
          <button type="button" className="btn btn--primary" onClick={addTask}>
            Agregar
          </button>
        </div>

        <KanbanBoard
          tasksByStatus={tasksByStatus}
          onRemove={(id) => dispatch({ type: 'removeProjectTask', id })}
          onReorder={(updates) => dispatch({ type: 'reorderProjectTasks', updates })}
        />
      </section>
    </div>
  )
}
