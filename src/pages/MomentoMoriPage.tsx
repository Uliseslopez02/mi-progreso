import { useMemo, useState } from 'react'
import { formatLongDate } from '../domain/date'
import { createId } from '../domain/id'
import { timeLived } from '../domain/momentoMori'
import { REFLECTION_PROMPTS } from '../domain/reflection'
import { useAppData } from '../state/context'

/** Momento Mori: perspectiva sobre el tiempo vivido + reflexiones. Opcional a propósito. */
export function MomentoMoriPage() {
  const { data, today, dispatch } = useAppData()
  const { birthDate, lifeExpectancyYears } = data.settings

  const [draftBirthDate, setDraftBirthDate] = useState(birthDate ?? '')
  const [draftLifeExpectancy, setDraftLifeExpectancy] = useState(lifeExpectancyYears ?? 85)
  const [prompt, setPrompt] = useState<string>(REFLECTION_PROMPTS[0])
  const [answer, setAnswer] = useState('')

  const lived = useMemo(
    () => (birthDate ? timeLived(birthDate, today, lifeExpectancyYears) : null),
    [birthDate, today, lifeExpectancyYears],
  )

  const sortedReflections = useMemo(
    () => [...data.reflections].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [data.reflections],
  )

  const saveDates = () => {
    if (!draftBirthDate) return
    dispatch({
      type: 'updateSettings',
      patch: { birthDate: draftBirthDate, lifeExpectancyYears: draftLifeExpectancy || undefined },
    })
  }

  const saveReflection = () => {
    const text = answer.trim()
    if (!text) return
    dispatch({
      type: 'addReflection',
      reflection: {
        id: createId('reflexion'),
        date: today,
        prompt,
        answer: text,
        createdAt: new Date().toISOString(),
      },
    })
    setAnswer('')
  }

  return (
    <div className="stack">
      <section className="card">
        <div className="card__header">
          <h2 className="card__title">Momento Mori</h2>
        </div>

        {!birthDate ? (
          <>
            <p className="empty">
              Configurá tu fecha de nacimiento para ver una perspectiva de tu tiempo vivido. Es
              completamente opcional.
            </p>
            <div className="row">
              <div className="field" style={{ flex: '1 1 180px' }}>
                <label className="field__label" htmlFor="mm-birth-date">
                  Fecha de nacimiento
                </label>
                <input
                  id="mm-birth-date"
                  className="input"
                  type="date"
                  value={draftBirthDate}
                  onChange={(e) => setDraftBirthDate(e.target.value)}
                />
              </div>
              <div className="field" style={{ flex: '1 1 180px' }}>
                <label className="field__label" htmlFor="mm-life-expectancy">
                  Expectativa de vida (años, opcional)
                </label>
                <input
                  id="mm-life-expectancy"
                  className="input"
                  type="number"
                  min={1}
                  max={130}
                  value={draftLifeExpectancy}
                  onChange={(e) => setDraftLifeExpectancy(Number(e.target.value))}
                />
              </div>
              <button type="button" className="btn btn--primary" onClick={saveDates}>
                Guardar
              </button>
            </div>
          </>
        ) : (
          lived && (
            <>
              <p>
                Viviste <strong className="numeric">{lived.years}</strong> años y{' '}
                <strong className="numeric">{lived.months}</strong> meses — eso son{' '}
                <strong className="numeric">{lived.totalWeeks.toLocaleString('es')}</strong> semanas (
                {lived.totalDays.toLocaleString('es')} días).
              </p>
              {lived.percentLived !== null && (
                <>
                  <span className="consistency__bar" style={{ display: 'block', marginTop: 10 }}>
                    <span
                      className="consistency__fill"
                      style={{ width: `${lived.percentLived}%`, background: 'var(--accent)' }}
                    />
                  </span>
                  <p className="card__hint" style={{ marginTop: 6 }}>
                    Aproximadamente {lived.percentLived}% de tu expectativa de vida estimada (
                    {lifeExpectancyYears} años).
                  </p>
                </>
              )}
              <div className="row" style={{ marginTop: 16 }}>
                <div className="field" style={{ flex: '1 1 180px' }}>
                  <label className="field__label" htmlFor="mm-birth-date">
                    Fecha de nacimiento
                  </label>
                  <input
                    id="mm-birth-date"
                    className="input"
                    type="date"
                    value={draftBirthDate}
                    onChange={(e) => setDraftBirthDate(e.target.value)}
                  />
                </div>
                <div className="field" style={{ flex: '1 1 180px' }}>
                  <label className="field__label" htmlFor="mm-life-expectancy">
                    Expectativa de vida (años)
                  </label>
                  <input
                    id="mm-life-expectancy"
                    className="input"
                    type="number"
                    min={1}
                    max={130}
                    value={draftLifeExpectancy}
                    onChange={(e) => setDraftLifeExpectancy(Number(e.target.value))}
                  />
                </div>
                <button type="button" className="btn btn--ghost" onClick={saveDates}>
                  Actualizar
                </button>
              </div>
            </>
          )
        )}
      </section>

      <section className="card">
        <div className="card__header">
          <h2 className="card__title">Reflexión de hoy</h2>
        </div>
        <div className="field" style={{ marginBottom: 12 }}>
          <label className="field__label" htmlFor="mm-prompt">
            Consigna
          </label>
          <select
            id="mm-prompt"
            className="select"
            style={{ width: '100%' }}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          >
            {REFLECTION_PROMPTS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{ marginBottom: 12 }}>
          <label className="field__label" htmlFor="mm-answer">
            Tu respuesta
          </label>
          <textarea
            id="mm-answer"
            className="input"
            style={{ width: '100%', minHeight: 80, resize: 'vertical' }}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
          />
        </div>
        <button type="button" className="btn btn--primary" onClick={saveReflection}>
          Guardar reflexión
        </button>
      </section>

      {sortedReflections.length > 0 && (
        <section className="card">
          <div className="card__header">
            <h2 className="card__title">Reflexiones anteriores</h2>
          </div>
          <ul className="subgoal-list">
            {sortedReflections.map((r) => (
              <li className="subgoal" key={r.id} style={{ alignItems: 'flex-start', flexDirection: 'column' }}>
                <div style={{ display: 'flex', width: '100%' }}>
                  <span className="card__hint">
                    {formatLongDate(r.date)} · {r.prompt}
                  </span>
                  <button
                    type="button"
                    className="subgoal__remove"
                    aria-label={`Eliminar reflexión del ${formatLongDate(r.date)}`}
                    onClick={() => dispatch({ type: 'removeReflection', id: r.id })}
                  >
                    ×
                  </button>
                </div>
                <span>{r.answer}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
