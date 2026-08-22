import { useMemo, useState } from 'react'
import { LifeWheelChart } from '../components/LifeWheelChart'
import { formatLongDate } from '../domain/date'
import { createId } from '../domain/id'
import { averageScore, compareSnapshots, strongestArea, weakestArea } from '../domain/lifeWheel'
import { useAppData } from '../state/context'

const DEFAULT_SCORE = 5

/** Rueda de la vida: snapshots 1-10 por categoría, comparados en el tiempo. */
export function LifeWheelPage() {
  const { data, today, dispatch } = useAppData()
  const [draftScores, setDraftScores] = useState<Record<string, number>>({})
  const [notes, setNotes] = useState('')

  const sortedCategories = useMemo(
    () => [...data.categories].sort((a, b) => a.order - b.order),
    [data.categories],
  )

  const sortedSnapshots = useMemo(
    () => [...data.lifeWheelSnapshots].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [data.lifeWheelSnapshots],
  )
  const latest = sortedSnapshots[0]
  const previous = sortedSnapshots[1]

  const scoreFor = (categoryId: string) => draftScores[categoryId] ?? DEFAULT_SCORE

  const saveSnapshot = () => {
    if (sortedCategories.length === 0) return
    dispatch({
      type: 'addLifeWheelSnapshot',
      snapshot: {
        id: createId('rueda'),
        date: today,
        areas: sortedCategories.map((c) => ({
          categoryId: c.id,
          categoryName: c.name,
          score: scoreFor(c.id),
        })),
        notes: notes.trim() || undefined,
        createdAt: new Date().toISOString(),
      },
    })
    setDraftScores({})
    setNotes('')
  }

  const weakest = latest ? weakestArea(latest) : null
  const strongest = latest ? strongestArea(latest) : null
  const deltas = latest && previous ? compareSnapshots(latest, previous) : []
  const improved = deltas.filter((d) => d.delta > 0).sort((a, b) => b.delta - a.delta)
  const worsened = deltas.filter((d) => d.delta < 0).sort((a, b) => a.delta - b.delta)

  return (
    <div className="stack">
      <section className="card">
        <div className="card__header">
          <h2 className="card__title">Rueda de la vida</h2>
          {latest && <span className="card__hint">Último snapshot: {formatLongDate(latest.date)}</span>}
        </div>

        {!latest ? (
          <p className="empty">
            Todavía no registraste ningún snapshot. Puntuá tus categorías más abajo para el primero.
          </p>
        ) : (
          <>
            <LifeWheelChart areas={latest.areas} previousAreas={previous?.areas} />
            <p style={{ marginTop: 12 }}>
              Promedio <strong className="numeric">{averageScore(latest)}</strong>
              {weakest && (
                <>
                  {' '}· Área más floja <strong>{weakest.categoryName}</strong> ({weakest.score})
                </>
              )}
              {strongest && strongest.categoryId !== weakest?.categoryId && (
                <>
                  {' '}· Área más fuerte <strong>{strongest.categoryName}</strong> ({strongest.score})
                </>
              )}
            </p>
            {(improved.length > 0 || worsened.length > 0) && (
              <p className="card__hint">
                {improved.length > 0 &&
                  `Mejoraste en ${improved.map((d) => `${d.categoryName} (+${d.delta})`).join(', ')}. `}
                {worsened.length > 0 &&
                  `Bajaste en ${worsened.map((d) => `${d.categoryName} (${d.delta})`).join(', ')}.`}
              </p>
            )}
            {latest.notes && <p className="card__hint">"{latest.notes}"</p>}
          </>
        )}
      </section>

      <section className="card">
        <div className="card__header">
          <h2 className="card__title">Nuevo snapshot</h2>
        </div>
        {sortedCategories.length === 0 ? (
          <p className="empty">Necesitás al menos una categoría (Ajustes) para puntuar la rueda.</p>
        ) : (
          <>
            {sortedCategories.map((c) => (
              <div key={c.id} className="field" style={{ marginBottom: 14 }}>
                <div className="field__label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{c.name}</span>
                  <span className="numeric">{scoreFor(c.id)}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={scoreFor(c.id)}
                  aria-label={c.name}
                  onChange={(e) =>
                    setDraftScores({ ...draftScores, [c.id]: Number(e.target.value) })
                  }
                  style={{ width: '100%' }}
                />
              </div>
            ))}
            <div className="field" style={{ marginBottom: 14 }}>
              <label className="field__label" htmlFor="wheel-notes">
                Notas (opcional)
              </label>
              <textarea
                id="wheel-notes"
                className="input"
                style={{ width: '100%', minHeight: 50, resize: 'vertical' }}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <button type="button" className="btn btn--primary" onClick={saveSnapshot}>
              Guardar snapshot
            </button>
          </>
        )}
      </section>

      {sortedSnapshots.length > 0 && (
        <section className="card">
          <div className="card__header">
            <h2 className="card__title">Historial</h2>
          </div>
          <ul className="subgoal-list">
            {sortedSnapshots.map((s) => (
              <li className="subgoal" key={s.id}>
                <span>
                  {formatLongDate(s.date)} · promedio <strong className="numeric">{averageScore(s)}</strong>
                </span>
                <button
                  type="button"
                  className="subgoal__remove"
                  aria-label={`Eliminar snapshot del ${formatLongDate(s.date)}`}
                  onClick={() => dispatch({ type: 'removeLifeWheelSnapshot', id: s.id })}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
