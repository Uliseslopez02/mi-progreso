import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ProjectCard } from '../components/ProjectCard'
import { ProjectListRow } from '../components/ProjectListRow'
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
  const taskCounts = useMemo(() => {
    const counts = new Map<string, { done: number; total: number }>()
    for (const task of data.projectTasks) {
      const current = counts.get(task.projectId) ?? { done: 0, total: 0 }
      current.total += 1
      if (task.status === 'done') current.done += 1
      counts.set(task.projectId, current)
    }
    return counts
  }, [data.projectTasks])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

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

  const countsFor = (id: string) => taskCounts.get(id) ?? { done: 0, total: 0 }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const ids = projects.map((p) => p.id)
    const from = ids.indexOf(String(active.id))
    const to = ids.indexOf(String(over.id))
    if (from === -1 || to === -1) return
    const reordered = [...ids]
    reordered.splice(from, 1)
    reordered.splice(to, 0, String(active.id))
    dispatch({ type: 'reorderProjects', updates: reordered.map((id, order) => ({ id, order })) })
  }

  return (
    <div className="stack">
      <section className="card">
        <div className="card__header">
          <h2 className="card__title">Proyectos activos</h2>
        </div>
        {activeProjects.length === 0 ? (
          <p className="empty">No tenés proyectos activos. Creá el primero abajo.</p>
        ) : (
          activeProjects.map((project) => {
            const { done, total } = countsFor(project.id)
            return (
              <ProjectCard
                key={project.id}
                project={project}
                doneCount={done}
                taskCount={total}
                onUpdate={(patch) => dispatch({ type: 'updateProject', id: project.id, patch })}
                onOpen={() => setSearchParams({ id: project.id })}
              />
            )
          })
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
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={projects.map((p) => p.id)} strategy={verticalListSortingStrategy}>
              <div className="project-list">
                {projects.map((project) => {
                  const { done, total } = countsFor(project.id)
                  return (
                    <ProjectListRow
                      key={project.id}
                      project={project}
                      doneCount={done}
                      taskCount={total}
                      onUpdate={(patch) => dispatch({ type: 'updateProject', id: project.id, patch })}
                      onRemove={() => dispatch({ type: 'removeProject', id: project.id })}
                      onOpen={() => setSearchParams({ id: project.id })}
                    />
                  )
                })}
              </div>
            </SortableContext>
          </DndContext>
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
