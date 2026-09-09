import type { ProjectTask, ProjectTaskStatus } from '../../domain/types'
import { SectionFrame } from '../SectionFrame'
import { DEMO_PROJECT } from '../demoData'
import { usePresentacion } from '../PresentacionState'

const COLUMNS: { status: ProjectTaskStatus; label: string; next: ProjectTaskStatus | null }[] = [
  { status: 'todo', label: 'Por hacer', next: 'doing' },
  { status: 'doing', label: 'En curso', next: 'done' },
  { status: 'done', label: 'Hecho', next: null },
]

/** Kanban de proyecto: 3 columnas reales (Por hacer / En curso / Hecho), progreso = tareas hechas / total. */
export function ProjectsSection() {
  const { projectTasks, moveTask } = usePresentacion()
  const done = projectTasks.filter((t) => t.status === 'done').length
  const percent = projectTasks.length === 0 ? 0 : Math.round((done / projectTasks.length) * 100)

  return (
    <SectionFrame
      eyebrow="Proyectos"
      title="Para lo que no es diario: proyectos con su propio tablero."
      subtitle="Un proyecto agrupa tareas sin fecha fija — vos decidís cuándo pasan de columna. El progreso es simplemente tareas hechas sobre el total."
      className="pr-projects"
    >
      <div className="pr-card pr-projects__header">
        <div>
          <h3>{DEMO_PROJECT.name}</h3>
          <p>{DEMO_PROJECT.description}</p>
        </div>
        <div className="pr-projects__progress">
          <div className="pr-projects__bar">
            <div className="pr-projects__bar-fill" style={{ width: `${percent}%` }} />
          </div>
          <span className="numeric">{percent}% · {done}/{projectTasks.length} tareas</span>
        </div>
      </div>

      <div className="pr-kanban">
        {COLUMNS.map((col) => (
          <div className="pr-kanban__col" key={col.status}>
            <p className="pr-kanban__col-title">{col.label}</p>
            {projectTasks
              .filter((t) => t.status === col.status)
              .map((task: ProjectTask) => (
                <div className="pr-kanban__card" key={task.id}>
                  <span>{task.title}</span>
                  {col.next && (
                    <button type="button" onClick={() => moveTask(task.id, col.next as ProjectTaskStatus)}>
                      Mover →
                    </button>
                  )}
                </div>
              ))}
          </div>
        ))}
      </div>
    </SectionFrame>
  )
}
