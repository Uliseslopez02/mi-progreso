import { diffDays, type DateKey } from '../domain/date'
import type { LifeGoalHealth } from '../domain/lifeGoalHealth'

interface Props {
  health: LifeGoalHealth
  today: DateKey
}

/** Qué metas de largo plazo necesitan atención: vencidas, estancadas o abandonadas. */
export function LifeGoalHealthCard({ health, today }: Props) {
  const { overdue, stalled, abandoned } = health
  const isEmpty = overdue.length === 0 && stalled.length === 0 && abandoned.length === 0

  return (
    <section className="card">
      <div className="card__header">
        <h2 className="card__title">Salud de tus metas</h2>
      </div>

      {isEmpty ? (
        <p className="empty">Todas tus metas activas están en marcha.</p>
      ) : (
        <div className="stack" style={{ gap: 16 }}>
          {overdue.length > 0 && (
            <div>
              <p className="section-title" style={{ marginBottom: 10 }}>
                Vencidas ({overdue.length})
              </p>
              <ul className="subgoal-list">
                {overdue.map((g) => (
                  <li className="subgoal" key={g.id}>
                    <span>{g.name}</span>
                    <span className="pill pill--status-abandoned" style={{ marginLeft: 'auto' }}>
                      venció hace {diffDays(g.targetDate as DateKey, today)} días
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {stalled.length > 0 && (
            <div>
              <p className="section-title" style={{ marginBottom: 10 }}>
                Estancadas ({stalled.length})
              </p>
              <ul className="subgoal-list">
                {stalled.map((g) => (
                  <li className="subgoal" key={g.id}>
                    <span>{g.name}</span>
                    <span className="pill pill--priority-medium" style={{ marginLeft: 'auto' }}>
                      sin avance hace {diffDays(g.createdAt.slice(0, 10) as DateKey, today)} días
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {abandoned.length > 0 && (
            <div>
              <p className="section-title" style={{ marginBottom: 10 }}>
                Abandonadas ({abandoned.length})
              </p>
              <ul className="subgoal-list">
                {abandoned.map((g) => (
                  <li className="subgoal" key={g.id}>
                    <span className="subgoal__done">{g.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
