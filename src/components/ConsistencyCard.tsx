import type { Consistency } from '../domain/consistency'
import { bandForPercent } from '../domain/scoring'
import { BAND_COLOR } from './colors'

interface Props {
  goals: Consistency[]
  categories: Consistency[]
  rangeDays: number
  title?: string
  emptyMessage?: string
}

function Row({ item }: { item: Consistency }) {
  return (
    <li className="consistency">
      <span className="consistency__name">{item.name}</span>
      <span className="consistency__bar" aria-hidden="true">
        <span
          className="consistency__fill"
          style={{
            width: `${item.percent}%`,
            background: BAND_COLOR[bandForPercent(item.percent)],
          }}
        />
      </span>
      <span className="consistency__value numeric">{item.percent}%</span>
      <span className="consistency__hint numeric">
        {item.daysCompleted}/{item.daysPresent}
      </span>
    </li>
  )
}

/** Qué cumplo siempre y qué vengo dejando pasar, dentro del rango elegido. */
export function ConsistencyCard({
  goals,
  categories,
  rangeDays,
  title = 'Constancia por objetivo',
  emptyMessage = 'Todavía no hay días registrados para comparar.',
}: Props) {
  const mejor = goals[0]
  const peor = goals[goals.length - 1]

  return (
    <section className="card">
      <div className="card__header">
        <h2 className="card__title">{title}</h2>
        <span className="card__hint">Últimos {rangeDays} días</span>
      </div>

      {goals.length === 0 ? (
        <p className="empty">{emptyMessage}</p>
      ) : (
        <>
          {mejor && peor && mejor.id !== peor.id && (
            <p className="card__hint" style={{ marginBottom: 14 }}>
              Tu más constante es <strong>{mejor.name}</strong> ({mejor.percent}%). El que más se
              te escapa es <strong>{peor.name}</strong> ({peor.percent}%).
            </p>
          )}

          <ul className="consistency-list">
            {goals.map((goal) => (
              <Row key={goal.id} item={goal} />
            ))}
          </ul>

          <p className="section-title" style={{ marginTop: 22, marginBottom: 10 }}>
            Por categoría
          </p>
          <ul className="consistency-list">
            {categories.map((category) => (
              <Row key={category.id} item={category} />
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
