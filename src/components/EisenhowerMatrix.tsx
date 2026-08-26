import { formatShortDate, type DateKey } from '../domain/date'
import type { EisenhowerQuadrant } from '../domain/eisenhower'
import type { PlannerItem } from '../domain/types'

interface Props {
  groups: Record<EisenhowerQuadrant, PlannerItem[]>
  today: DateKey
  onToggle: (id: string) => void
  onRemove: (id: string) => void
}

const PRIORITY_COLOR: Record<PlannerItem['priority'], string> = {
  low: 'var(--text-dim)',
  medium: 'var(--band-good)',
  high: 'var(--band-low)',
}

const QUADRANT_INFO: Record<EisenhowerQuadrant, { title: string; subtitle: string; empty: string }> = {
  do: {
    title: 'Hacer ahora',
    subtitle: 'Urgente e importante',
    empty: 'Nada acá — ¡buena señal!',
  },
  schedule: {
    title: 'Planificar',
    subtitle: 'Importante, no urgente',
    empty: 'Sin tareas importantes pendientes.',
  },
  delegate: {
    title: 'Delegar',
    subtitle: 'Urgente, no importante',
    empty: 'Nada urgente de baja prioridad.',
  },
  eliminate: {
    title: 'Eliminar',
    subtitle: 'Ni urgente ni importante',
    empty: 'Nada acá.',
  },
}

const QUADRANT_ORDER: EisenhowerQuadrant[] = ['do', 'schedule', 'delegate', 'eliminate']

/** Matriz Eisenhower: 2x2 de tareas de Agenda pendientes, sin arrastre. */
export function EisenhowerMatrix({ groups, onToggle, onRemove }: Props) {
  return (
    <div className="eisenhower-grid">
      {QUADRANT_ORDER.map((quadrant) => {
        const info = QUADRANT_INFO[quadrant]
        const items = groups[quadrant]
        return (
          <section className="card" key={quadrant}>
            <div className="card__header">
              <h2 className="card__title">{info.title}</h2>
              <span className="card__hint">{info.subtitle}</span>
            </div>
            {items.length === 0 ? (
              <p className="empty">{info.empty}</p>
            ) : (
              <ul className="planner-day__items">
                {items.map((item) => (
                  <li className="planner-item planner-item--static" key={item.id}>
                    <input
                      type="checkbox"
                      checked={item.done}
                      aria-label={item.title}
                      onChange={() => onToggle(item.id)}
                    />
                    <div>
                      <p className="planner-item__title">
                        {item.type === 'event' ? '📅 ' : ''}
                        {item.title}
                      </p>
                      <div className="planner-item__meta">
                        <span
                          className="planner-item__dot"
                          style={{ background: PRIORITY_COLOR[item.priority] }}
                        />
                        <span className="planner-item__tag">{formatShortDate(item.date)}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="planner-item__remove"
                      aria-label={`Eliminar ${item.title}`}
                      onClick={() => onRemove(item.id)}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}
