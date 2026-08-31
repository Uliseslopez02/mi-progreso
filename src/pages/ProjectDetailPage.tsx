import { useMemo, useState } from 'react'
import { KanbanBoard } from '../components/KanbanBoard'
import { SelectMenu } from '../components/SelectMenu'
import { createId } from '../domain/id'
import type { Project, ProjectStatus, ProjectTaskStatus } from '../domain/types'
import { useAppData } from '../state/context'

interface Props {
  project: Project
  onBack: () => void
}

const STATUS_OPTIONS: Array<{ value: ProjectStatus; label: string; color: string }> = [
  { value: 'active', label: 'Activo', color: 'var(--band-top)' },
  { value: 'completed', label: 'Completado', color: 'var(--accent)' },
  { value: 'archived', label: 'Archivado', color: 'var(--text-dim)' },
]

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

  const addTask = (status: ProjectTaskStatus, title: string) => {
    const trimmed = title.trim()
    if (!trimmed) return
    dispatch({
      type: 'addProjectTask',
      task: {
        id: createId('tarea'),
        projectId: project.id,
        title: trimmed,
        status,
        order: tasksByStatus[status].length,
        createdAt: new Date().toISOString(),
      },
    })
  }

  return (
    <div className="stack">
      <section className="card">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
          <button type="button" className="btn btn--ghost" onClick={onBack}>
            ‹ Volver
          </button>
          <SelectMenu
            value={project.status}
            options={STATUS_OPTIONS}
            onChange={(status) => dispatch({ type: 'updateProject', id: project.id, patch: { status } })}
            ariaLabel="Estado del proyecto"
          />
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
                if (e.key === 'Enter') {
                  addTask('todo', newTitle)
                  setNewTitle('')
                }
              }}
            />
          </div>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              addTask('todo', newTitle)
              setNewTitle('')
            }}
          >
            Agregar
          </button>
        </div>

        <KanbanBoard
          tasksByStatus={tasksByStatus}
          onRemove={(id) => dispatch({ type: 'removeProjectTask', id })}
          onReorder={(updates) => dispatch({ type: 'reorderProjectTasks', updates })}
          onAdd={addTask}
        />
      </section>
    </div>
  )
}
