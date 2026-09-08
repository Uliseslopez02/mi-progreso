import type { ProjectTask, ProjectTaskStatus } from '../../domain/types'
import { DEMO_PROJECT } from '../demoData'
import { ModuleFrame } from '../ModuleFrame'
import { useShowcase } from '../ShowcaseState'

const COLUMNS: { status: ProjectTaskStatus; label: string; next: ProjectTaskStatus | null }[] = [
  { status: 'todo', label: 'Por hacer', next: 'doing' },
  { status: 'doing', label: 'En curso', next: 'done' },
  { status: 'done', label: 'Hecho', next: null },
]

/**
 * Módulo — Proyectos: para lo que no es diario. Un tablero Kanban de 3 columnas;
 * el progreso es simplemente tareas hechas sobre el total. Mover una tarjeta es
 * real: recalcula la barra en el momento.
 */
export function ProjectsModule() {
  const { projectTasks, moveTask } = useShowcase()
  const done = projectTasks.filter((t) => t.status === 'done').length
  const percent = projectTasks.length === 0 ? 0 : Math.round((done / projectTasks.length) * 100)

  return (
    <ModuleFrame
      eyebrow="Proyectos"
      title="Para lo que no es diario"
      className="sc-module--projects"
      hint="Mové una tarjeta de columna"
    >
      <div className="sc-project__head">
        <span className="sc-project__name">{DEMO_PROJECT.name}</span>
        <span className="sc-project__count numeric">
          {percent}% · {done}/{projectTasks.length}
        </span>
      </div>
      <div className="consistency__bar">
        <span className="consistency__fill" style={{ width: `${percent}%`, background: 'var(--accent)' }} />
      </div>

      <div className="sc-kanban">
        {COLUMNS.map((col) => (
          <div className="sc-kanban__col" key={col.status}>
            <p className="sc-kanban__col-title">{col.label}</p>
            {projectTasks
              .filter((t) => t.status === col.status)
              .map((task: ProjectTask) => (
                <div className="sc-kanban__card" key={task.id}>
                  <span>{task.title}</span>
                  {col.next && (
                    <button
                      type="button"
                      className="sc-kanban__move"
                      onClick={() => moveTask(task.id, col.next as ProjectTaskStatus)}
                    >
                      Mover →
                    </button>
                  )}
                </div>
              ))}
          </div>
        ))}
      </div>
    </ModuleFrame>
  )
}
