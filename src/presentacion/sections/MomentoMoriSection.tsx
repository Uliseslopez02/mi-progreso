import { useMemo, useState } from 'react'
import { formatLongDate } from '../../domain/date'
import { createId } from '../../domain/id'
import { timeLived } from '../../domain/momentoMori'
import { REFLECTION_PROMPTS } from '../../domain/reflection'
import type { Reflection } from '../../domain/types'
import { SectionFrame } from '../SectionFrame'
import { TODAY } from '../demoData'

const DEMO_BIRTH_DATE = '1996-03-15'
const DEMO_LIFE_EXPECTANCY = 85

const DEMO_REFLECTIONS: Reflection[] = [
  {
    id: 'refl-1',
    date: TODAY,
    prompt: REFLECTION_PROMPTS[0],
    answer: 'Terminé el bloque de trabajo profundo sin revisar el teléfono ni una vez.',
    createdAt: TODAY,
  },
]

/**
 * Recreación de Momento Mori (Historial → dentro de la app): mismo `timeLived`
 * puro, misma barra de "% de tu expectativa de vida", y la misma reflexión de
 * hoy con las consignas fijas de `REFLECTION_PROMPTS`. Es opcional en la app
 * de verdad — acá arranca ya configurada para no pedir la fecha de nacimiento
 * antes de mostrar algo.
 */
export function MomentoMoriSection() {
  const [birthDate, setBirthDate] = useState(DEMO_BIRTH_DATE)
  const [lifeExpectancy, setLifeExpectancy] = useState(DEMO_LIFE_EXPECTANCY)
  const [prompt, setPrompt] = useState<string>(REFLECTION_PROMPTS[0])
  const [answer, setAnswer] = useState('')
  const [reflections, setReflections] = useState(DEMO_REFLECTIONS)

  const lived = useMemo(() => timeLived(birthDate, TODAY, lifeExpectancy), [birthDate, lifeExpectancy])

  const saveReflection = () => {
    const text = answer.trim()
    if (!text) return
    setReflections((prev) => [
      { id: createId('reflexion'), date: TODAY, prompt, answer: text, createdAt: new Date().toISOString() },
      ...prev,
    ])
    setAnswer('')
  }

  return (
    <SectionFrame
      eyebrow="Momento Mori"
      title="El tiempo que ya viviste, a la vista — opcional, para quien lo quiera."
      subtitle="Nada de esto puntúa ni afecta tu progreso. Es sólo una perspectiva, con una reflexión corta del día."
      className="pr-mori"
    >
      <div className="pr-mori__grid">
        <section className="card">
          <div className="card__header">
            <h3 className="card__title">Momento Mori</h3>
          </div>
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
                Aproximadamente {lived.percentLived}% de tu expectativa de vida estimada ({lifeExpectancy} años).
              </p>
            </>
          )}
          <div className="row" style={{ marginTop: 16 }}>
            <div className="field" style={{ flex: '1 1 180px' }}>
              <label className="field__label" htmlFor="pr-mori-birth">
                Fecha de nacimiento
              </label>
              <input
                id="pr-mori-birth"
                className="input"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </div>
            <div className="field" style={{ flex: '1 1 180px' }}>
              <label className="field__label" htmlFor="pr-mori-expectancy">
                Expectativa de vida (años)
              </label>
              <input
                id="pr-mori-expectancy"
                className="input"
                type="number"
                min={1}
                max={130}
                value={lifeExpectancy}
                onChange={(e) => setLifeExpectancy(Number(e.target.value) || DEMO_LIFE_EXPECTANCY)}
              />
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card__header">
            <h3 className="card__title">Reflexión de hoy</h3>
          </div>
          <div className="field" style={{ marginBottom: 12 }}>
            <label className="field__label" htmlFor="pr-mori-prompt">
              Consigna
            </label>
            <select
              id="pr-mori-prompt"
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
            <label className="field__label" htmlFor="pr-mori-answer">
              Tu respuesta
            </label>
            <textarea
              id="pr-mori-answer"
              className="input"
              style={{ width: '100%', minHeight: 90, resize: 'vertical' }}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />
          </div>
          <button type="button" className="btn btn--primary" onClick={saveReflection}>
            Guardar reflexión
          </button>

          {reflections.length > 0 && (
            <ul className="subgoal-list" style={{ marginTop: 16 }}>
              {reflections.map((r) => (
                <li className="subgoal" key={r.id} style={{ alignItems: 'flex-start', flexDirection: 'column' }}>
                  <span className="card__hint">
                    {formatLongDate(r.date)} · {r.prompt}
                  </span>
                  <span>{r.answer}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </SectionFrame>
  )
}
