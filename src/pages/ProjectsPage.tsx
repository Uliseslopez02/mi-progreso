import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ProjectCard } from '../components/ProjectCard'
import { createId } from '../domain/id'
import { useAppData } from '../state/context'
import { ProjectDetailPage } from './ProjectDetailPage'

/** Proyectos: lista con CRUD, o el tablero Kanban de uno abierto (vía `?id=`). */
export function ProjectsPage() {
  const { data, dispatch } = useAppData()
  const [searchParams, setSearchParams] = useSearchParams()
  const [newName, setNewName] = useState('')

  const openId = searchParams.get('id')
  const openProject = openId ? data.projects.find((p) => p.id === openId) : undefined

  const projects = useMemo(() => [...data.projects].sort((a, b) => a.order - b.order), [data.projects])
  const activeProjects = useMemo(() => projects.filter((p) => p.status === 'active'), [projects])
  const taskCount = useMemo(() => {
    const counts = new Map<string, number>()
    for (const task of data.projectTasks) {
      counts.set(task.projectId, (counts.get(task.projectId) ?? 0) + 1)
    }
    return counts
  }, [data.projectTasks])

  if (openProject) {
    return <ProjectDetailPage project={openProject} onBack={() => setSearchParams({})} />
  }

  const addProject = () => {
    const name = newName.trim()
    if (!name) return
    dispatch({
      type: 'addProject',
      project: {
        id: createId('proyecto'),
        name,
        status: 'active',
        order: data.projects.length,
        createdAt: new Date().toISOString(),
      },
    })
    setNewName('')
  }

  const move = (id: string, direction: -1 | 1) => dispatch({ type: 'moveProject', id, direction })

  return (
    <div className="stack">
      <section className="card">
        <div className="card__header">
          <h2 className="card__title">Proyectos activos</h2>
        </div>
        {activeProjects.length === 0 ? (
          <p className="empty">No tenés proyectos activos. Creá el primero abajo.</p>
        ) : (
          activeProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              taskCount={taskCount.get(project.id) ?? 0}
              onUpdate={(patch) => dispatch({ type: 'updateProject', id: project.id, patch })}
              onRemove={() => dispatch({ type: 'removeProject', id: project.id })}
              onOpen={() => setSearchParams({ id: project.id })}
            />
          ))
        )}
      </section>

      <section className="card">
        <div className="card__header">
          <h2 className="card__title">Todos los proyectos</h2>
          <span className="card__hint">{projects.length} en total</span>
        </div>
        {projects.length === 0 ? (
          <p className="empty">Todavía no creaste ningún proyecto.</p>
        ) : (
          projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              taskCount={taskCount.get(project.id) ?? 0}
              onUpdate={(patch) => dispatch({ type: 'updateProject', id: project.id, patch })}
              onRemove={() => dispatch({ type: 'removeProject', id: project.id })}
              onMoveUp={() => move(project.id, -1)}
              onMoveDown={() => move(project.id, 1)}
              onOpen={() => setSearchParams({ id: project.id })}
            />
          ))
        )}
      </section>

      <section className="card">
        <div className="card__header">
          <h2 className="card__title">Nuevo proyecto</h2>
        </div>
        <div className="row">
          <div className="field" style={{ flex: '2 1 260px' }}>
            <label className="field__label" htmlFor="new-project-name">
              Nombre
            </label>
            <input
              id="new-project-name"
              className="input"
              placeholder="Ej. Mudanza"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addProject()
              }}
            />
          </div>
          <button type="button" className="btn btn--primary" onClick={addProject}>
            Crear proyecto
          </button>
        </div>
      </section>
    </div>
  )
}
