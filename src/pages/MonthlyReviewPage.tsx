import { useMemo, useState } from 'react'
import { ProgressPath } from '../components/ProgressPath'
import { Stat } from '../components/Stat'
import { formatLongDate } from '../domain/date'
import { createId } from '../domain/id'
import { monthlyConclusions } from '../domain/monthlyConclusions'
import { monthlyReport } from '../domain/monthlyReport'
import { ALL_MONTHLY_REVIEW_PROMPTS, MONTHLY_REVIEW_PROMPTS, PRIORITIES_PROMPT } from '../domain/reflection'
import { useAutoFocusHeading } from '../hooks/useAutoFocusHeading'
import { useAppData } from '../state/context'
import type { Reflection } from '../domain/types'

type Step = 'stats' | 'preguntas' | 'resumen' | 'listo'

const STEP_NUMBER: Record<Step, number> = { stats: 1, preguntas: 2, resumen: 3, listo: 4 }
const WIZARD_STEPS = 4

const emptyAnswers = (): Record<string, string> =>
  Object.fromEntries(MONTHLY_REVIEW_PROMPTS.map((p) => [p, '']))

/** Revisión mensual guiada: recap de estadísticas + reflexión estructurada + prioridades. */
export function MonthlyReviewPage() {
  const { data, today, dispatch } = useAppData()
  const [step, setStep] = useState<Step>('stats')
  const [answers, setAnswers] = useState<Record<string, string>>(emptyAnswers)
  const [priorities, setPriorities] = useState('')
  const [saved, setSaved] = useState(false)
  const headingRef = useAutoFocusHeading<HTMLHeadingElement>(step)

  const report = useMemo(
    () => monthlyReport(data.days, data.plannerItems, today, data.settings.streakThreshold),
    [data.days, data.plannerItems, today, data.settings.streakThreshold],
  )
  const conclusions = useMemo(() => monthlyConclusions(report), [report])

  const previousReviews = useMemo(() => {
    const groups = new Map<string, Reflection[]>()
    for (const r of data.reflections) {
      if (!ALL_MONTHLY_REVIEW_PROMPTS.includes(r.prompt)) continue
      const list = groups.get(r.date) ?? []
      list.push(r)
      groups.set(r.date, list)
    }
    return [...groups.entries()].sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
  }, [data.reflections])

  const setAnswer = (prompt: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [prompt]: value }))
  }

  const reset = () => {
    setAnswers(emptyAnswers())
    setPriorities('')
    setSaved(false)
    setStep('stats')
  }

  const saveReview = () => {
    const createdAt = new Date().toISOString()
    for (const prompt of MONTHLY_REVIEW_PROMPTS) {
      const answer = answers[prompt].trim()
      if (!answer) continue
      dispatch({
        type: 'addReflection',
        reflection: { id: createId('revision'), date: today, prompt, answer, createdAt },
      })
    }
    const prioritiesAnswer = priorities.trim()
    if (prioritiesAnswer) {
      dispatch({
        type: 'addReflection',
        reflection: {
          id: createId('revision'),
          date: today,
          prompt: PRIORITIES_PROMPT,
          answer: prioritiesAnswer,
          createdAt,
        },
      })
    }
    setSaved(true)
  }

  return (
    <div className="stack">
      <section className="card">
        <ProgressPath steps={WIZARD_STEPS} activeIndex={STEP_NUMBER[step] - 1} size="sm" />

        {step === 'stats' && (
          <>
            <h2 className="card__title" ref={headingRef} tabIndex={-1}>
              ¿Cómo estuvo el mes?
            </h2>
            {report.stats.daysWithRecord === 0 ? (
              <p className="empty">
                Todavía no hay registros este mes. A medida que vayas marcando tus días, esta revisión se
                va a ir completando.
              </p>
            ) : (
              <>
                <div className="stat-grid">
                  <Stat label="Cumplimiento del mes" value={`${report.stats.average}%`} />
                  {report.bestCategory && (
                    <Stat
                      label="Categoría más fuerte"
                      value={`${report.bestCategory.percent}%`}
                      hint={report.bestCategory.name}
                    />
                  )}
                  {report.worstCategory && (
                    <Stat
                      label="Categoría a reforzar"
                      value={`${report.worstCategory.percent}%`}
                      hint={report.worstCategory.name}
                    />
                  )}
                  <Stat
                    label="Racha máxima del mes"
                    value={`${report.bestStreakInMonth} ${report.bestStreakInMonth === 1 ? 'día' : 'días'}`}
                  />
                  <Stat
                    label="Días perfectos"
                    value={report.perfectDays}
                    hint={report.perfectDays === 1 ? 'día al 100%' : 'días al 100%'}
                  />
                </div>
                {conclusions.length > 0 && (
                  <ul className="subgoal-list" style={{ marginTop: 16 }}>
                    {conclusions.map((text) => (
                      <li className="subgoal" key={text}>
                        <span>{text}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
            <div className="row" style={{ marginTop: 18, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn--primary" onClick={() => setStep('preguntas')}>
                Continuar
              </button>
            </div>
          </>
        )}

        {step === 'preguntas' && (
          <>
            <h2 className="card__title" ref={headingRef} tabIndex={-1}>
              Reflexioná sobre el mes
            </h2>
            <div className="stack" style={{ gap: 12 }}>
              {MONTHLY_REVIEW_PROMPTS.map((prompt) => (
                <div className="field" key={prompt}>
                  <label className="field__label" htmlFor={`review-${prompt}`}>
                    {prompt}
                  </label>
                  <textarea
                    id={`review-${prompt}`}
                    className="input"
                    style={{ width: '100%', minHeight: 70, resize: 'vertical' }}
                    value={answers[prompt]}
                    onChange={(e) => setAnswer(prompt, e.target.value)}
                  />
                </div>
              ))}
            </div>
            <div className="row" style={{ marginTop: 18, justifyContent: 'space-between' }}>
              <button type="button" className="btn btn--ghost" onClick={() => setStep('stats')}>
                Atrás
              </button>
              <button type="button" className="btn btn--primary" onClick={() => setStep('resumen')}>
                Continuar
              </button>
            </div>
          </>
        )}

        {step === 'resumen' && (
          <>
            <h2 className="card__title" ref={headingRef} tabIndex={-1}>
              Resumen y prioridades
            </h2>
            {conclusions.length > 0 && (
              <ul className="subgoal-list">
                {conclusions.map((text) => (
                  <li className="subgoal" key={text}>
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="field" style={{ marginTop: 12 }}>
              <label className="field__label" htmlFor="review-priorities">
                Prioridades del próximo mes
              </label>
              <textarea
                id="review-priorities"
                className="input"
                style={{ width: '100%', minHeight: 80, resize: 'vertical' }}
                value={priorities}
                onChange={(e) => setPriorities(e.target.value)}
              />
            </div>
            <div className="row" style={{ marginTop: 18, justifyContent: 'space-between' }}>
              <button type="button" className="btn btn--ghost" onClick={() => setStep('preguntas')}>
                Atrás
              </button>
              <button type="button" className="btn btn--primary" onClick={() => setStep('listo')}>
                Continuar
              </button>
            </div>
          </>
        )}

        {step === 'listo' && (
          <>
            <h2 className="card__title" ref={headingRef} tabIndex={-1}>
              {saved ? 'Revisión guardada' : 'Todo listo para guardar'}
            </h2>
            {saved ? (
              <>
                <p className="card__hint">Tu revisión de este mes quedó guardada.</p>
                <div className="row" style={{ marginTop: 18, justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn--primary" onClick={reset}>
                    Empezar de nuevo
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="card__hint">
                  Se van a guardar tus respuestas a las {MONTHLY_REVIEW_PROMPTS.length} preguntas y las
                  prioridades del próximo mes (las que hayas dejado en blanco no se guardan).
                </p>
                <div className="row" style={{ marginTop: 18, justifyContent: 'space-between' }}>
                  <button type="button" className="btn btn--ghost" onClick={() => setStep('resumen')}>
                    Atrás
                  </button>
                  <button type="button" className="btn btn--primary" onClick={saveReview}>
                    Guardar revisión
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </section>

      {previousReviews.length > 0 && (
        <section className="card">
          <div className="card__header">
            <h2 className="card__title">Revisiones anteriores</h2>
          </div>
          <div className="stack" style={{ gap: 16 }}>
            {previousReviews.map(([date, reflections]) => (
              <div key={date}>
                <p className="card__hint" style={{ marginBottom: 6 }}>
                  {formatLongDate(date)}
                </p>
                <ul className="subgoal-list">
                  {reflections.map((r) => (
                    <li
                      className="subgoal"
                      key={r.id}
                      style={{ alignItems: 'flex-start', flexDirection: 'column' }}
                    >
                      <div style={{ display: 'flex', width: '100%' }}>
                        <span className="card__hint">{r.prompt}</span>
                        <button
                          type="button"
                          className="subgoal__remove"
                          aria-label={`Eliminar respuesta a "${r.prompt}" del ${formatLongDate(r.date)}`}
                          onClick={() => dispatch({ type: 'removeReflection', id: r.id })}
                        >
                          ×
                        </button>
                      </div>
                      <span>{r.answer}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
