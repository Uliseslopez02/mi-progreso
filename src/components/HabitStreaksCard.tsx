import type { HabitStreak } from '../domain/consistency'

interface Props {
  active: HabitStreak[]
  broken: HabitStreak[]
}

/** Qué hábitos vienen sostenidos hoy y cuáles perdieron una racha que tenían. */
export function HabitStreaksCard({ active, broken }: Props) {
  const isEmpty = active.length === 0 && broken.length === 0

  return (
    <section className="card">
      <div className="card__header">
        <h2 className="card__title">Rachas de hábitos</h2>
      </div>

      {isEmpty ? (
        <p className="empty">Todavía no hay hábitos con historial suficiente.</p>
      ) : (
        <>
          <p className="section-title" style={{ marginBottom: 10 }}>
            Activas
          </p>
          {active.length === 0 ? (
            <p className="empty">Ningún hábito tiene una racha activa hoy.</p>
          ) : (
            <ul className="subgoal-list" style={{ marginBottom: 18 }}>
              {active.map((h) => (
                <li className="subgoal" key={h.id}>
                  <span>🔥 {h.name}</span>
                  <span className="numeric" style={{ marginLeft: 'auto' }}>
                    {h.current} {h.current === 1 ? 'día' : 'días'}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <p className="section-title" style={{ marginBottom: 10 }}>
            Perdidas
          </p>
          {broken.length === 0 ? (
            <p className="empty">No perdiste ninguna racha.</p>
          ) : (
            <ul className="subgoal-list">
              {broken.map((h) => (
                <li className="subgoal" key={h.id}>
                  <span>💔 {h.name}</span>
                  <span className="numeric" style={{ marginLeft: 'auto' }}>
                    llegó a {h.best} {h.best === 1 ? 'día' : 'días'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
