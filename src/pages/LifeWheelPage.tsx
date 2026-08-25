import { useMemo, useState } from 'react'
import { LifeWheelChart } from '../components/LifeWheelChart'
import { Stat } from '../components/Stat'
import { formatLongDate } from '../domain/date'
import { createId } from '../domain/id'
import {
  averageScore,
  bandDescription,
  compareSnapshots,
  mostImprovedArea,
  strongestArea,
  weakestArea,
} from '../domain/lifeWheel'
import { areaDetail } from '../domain/lifeWheelInsights'
import { useAppData } from '../state/context'

const DEFAULT_SCORE = 5

/** Rueda de la vida: snapshots 1-10 por categoría, comparados en el tiempo. */
export function LifeWheelPage() {
  const { data, today, dispatch } = useAppData()
  const [draftScores, setDraftScores] = useState<Record<string, number>>({})
  const [notes, setNotes] = useState('')
  const [selectedAreaIndex, setSelectedAreaIndex] = useState<number | null>(null)

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

  const previewAreas = useMemo(
    () =>
      sortedCategories.map((c) => ({
        categoryId: c.id,
        categoryName: c.name,
        score: draftScores[c.id] ?? DEFAULT_SCORE,
      })),
    [sortedCategories, draftScores],
  )

  const saveSnapshot = () => {
    if (sortedCategories.length === 0) return
    dispatch({
      type: 'addLifeWheelSnapshot',
      snapshot: {
        id: createId('rueda'),
        date: today,
        areas: previewAreas,
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
  const topImprovement = mostImprovedArea(deltas)

  const selectedArea = latest && selectedAreaIndex !== null ? latest.areas[selectedAreaIndex] : null
  const selectedDetail = selectedArea
    ? areaDetail(selectedArea.categoryId, selectedArea.score, data.goals, data.lifeGoals, data.days, today)
    : null

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
            <LifeWheelChart
              areas={latest.areas}
              previousAreas={previous?.areas}
              selectedIndex={selectedAreaIndex}
              onSelectArea={(i) => setSelectedAreaIndex((current) => (current === i ? null : i))}
            />
            <div className="stat-grid" style={{ marginTop: 12 }}>
              <Stat label="Promedio" value={averageScore(latest)} />
              {strongest && (
                <Stat label="Área más fuerte" value={`${strongest.score}/10`} hint={strongest.categoryName} />
              )}
              {topImprovement && (
                <Stat
                  label="Área con mayor mejora"
                  value={`+${topImprovement.delta}`}
                  hint={topImprovement.categoryName}
                />
              )}
              {weakest && (
                <Stat
                  label="Área que necesita atención"
                  value={`${weakest.score}/10`}
                  hint={weakest.categoryName}
                />
              )}
            </div>
            {latest.notes && (
              <p className="card__hint" style={{ marginTop: 12 }}>
                "{latest.notes}"
              </p>
            )}

            {selectedArea && selectedDetail && (
              <div className="card" style={{ marginTop: 12, background: 'var(--surface-2)' }}>
                <div className="card__header">
                  <h3 className="card__title">
                    {selectedArea.categoryName} · <span className="numeric">{selectedArea.score}/10</span>
                  </h3>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Cerrar detalle"
                    onClick={() => setSelectedAreaIndex(null)}
                  >
                    ×
                  </button>
                </div>
                <p className="card__hint">{bandDescription(selectedArea.score)}</p>

                {selectedDetail.habits.length > 0 && (
                  <ul className="subgoal-list" style={{ marginTop: 10 }}>
                    {selectedDetail.habits.map((h) => (
                      <li className="subgoal" key={h.id}>
                        <span aria-hidden="true">{h.doneToday ? '✓' : '✗'}</span>
                        <span>{h.name}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {selectedDetail.goalsProgress !== null && (
                  <p style={{ marginTop: 10 }}>
                    Progreso en objetivos de esta área{' '}
                    <strong className="numeric">{selectedDetail.goalsProgress}%</strong>
                  </p>
                )}

                <p className="card__hint" style={{ marginTop: 10 }}>
                  {selectedDetail.suggestion}
                </p>
              </div>
            )}
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
            <div style={{ marginBottom: 16 }}>
              <LifeWheelChart areas={previewAreas} previousAreas={latest?.areas} />
            </div>

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
                <p className="card__hint" style={{ marginTop: 4 }}>
                  {bandDescription(scoreFor(c.id))}
                </p>
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
