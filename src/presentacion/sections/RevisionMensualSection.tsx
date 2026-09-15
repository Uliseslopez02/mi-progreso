import { useMemo, useState } from 'react'
import { ProgressPath } from '../../components/ProgressPath'
import { Stat } from '../../components/Stat'
import { formatLongDate } from '../../domain/date'
import { createId } from '../../domain/id'
import { monthlyConclusions } from '../../domain/monthlyConclusions'
import { monthlyReport } from '../../domain/monthlyReport'
import { MONTHLY_REVIEW_PROMPTS, PRIORITIES_PROMPT } from '../../domain/reflection'
import type { Reflection } from '../../domain/types'
import { SectionFrame } from '../SectionFrame'
import { usePresentacion } from '../PresentacionState'
import { DEMO_STREAK_THRESHOLD, TODAY } from '../demoData'

type Step = 'stats' | 'preguntas' | 'resumen' | 'listo'

const STEP_NUMBER: Record<Step, number> = { stats: 1, preguntas: 2, resumen: 3, listo: 4 }
const WIZARD_STEPS = 4

const emptyAnswers = (): Record<string, string> =>
  Object.fromEntries(MONTHLY_REVIEW_PROMPTS.map((p) => [p, '']))

/**
 * Recreación de Informes → Revisión mensual: el mismo wizard guiado de 4 pasos
 * (stats → preguntas → resumen → listo) que `MonthlyReviewPage`, con el mismo
 * `monthlyReport`/`monthlyConclusions` que ya usa `InformesSection`. Igual que
 * Momento Mori/Notas, las revisiones guardadas viven en estado local a la
 * sección — en la app real son `Reflection`s en `AppData`, que acá no existe.
 */
export function RevisionMensualSection() {
  const { days, plannerItems } = usePresentacion()
  const [step, setStep] = useState<Step>('stats')
  const [answers, setAnswers] = useState<Record<string, string>>(emptyAnswers)
  const [priorities, setPriorities] = useState('')
  const [saved, setSaved] = useState(false)
  const [reviews, setReviews] = useState<Reflection[]>([])

  const report = useMemo(
    () => monthlyReport(days, plannerItems, TODAY, DEMO_STREAK_THRESHOLD),
    [days, plannerItems],
  )
  const conclusions = useMemo(() => monthlyConclusions(report), [report])

  const previousReviews = useMemo(() => {
    const groups = new Map<string, Reflection[]>()
    for (const r of reviews) {
      const list = groups.get(r.date) ?? []
      list.push(r)
      groups.set(r.date, list)
    }
    return [...groups.entries()].sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
  }, [reviews])

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
    const newReviews: Reflection[] = []
    for (const prompt of MONTHLY_REVIEW_PROMPTS) {
      const answer = answers[prompt].trim()
      if (!answer) continue
      newReviews.push({ id: createId('revision'), date: TODAY, prompt, answer, createdAt })
    }
    const prioritiesAnswer = priorities.trim()
    if (prioritiesAnswer) {
      newReviews.push({
        id: createId('revision'),
        date: TODAY,
        prompt: PRIORITIES_PROMPT,
        answer: prioritiesAnswer,
        createdAt,
      })
    }
    setReviews((prev) => [...newReviews, ...prev])
    setSaved(true)
  }

  return (
    <SectionFrame
      eyebrow="Revisión mensual"
      title="Cerrar el mes con más que un número."
      subtitle="El mismo wizard guiado de 4 pasos que Informes → Revisión mensual: recap de estadísticas, reflexión estructurada y prioridades para el mes que viene."
      className="pr-revision"
    >
      <section className="card">
        <ProgressPath steps={WIZARD_STEPS} activeIndex={STEP_NUMBER[step] - 1} size="sm" />

        {step === 'stats' && (
          <>
            <h3 className="card__title">¿Cómo estuvo el mes?</h3>
            {report.stats.daysWithRecord === 0 ? (
              <p className="empty">
                Todavía no hay registros este mes. A medida que vayas marcando tus días, esta revisión
                se va a ir completando.
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
            <h3 className="card__title">Reflexioná sobre el mes</h3>
            <div className="stack" style={{ gap: 12 }}>
              {MONTHLY_REVIEW_PROMPTS.map((prompt) => (
                <div className="field" key={prompt}>
                  <label className="field__label" htmlFor={`pr-review-${prompt}`}>
                    {prompt}
                  </label>
                  <textarea
                    id={`pr-review-${prompt}`}
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
            <h3 className="card__title">Resumen y prioridades</h3>
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
              <label className="field__label" htmlFor="pr-review-priorities">
                Prioridades del próximo mes
              </label>
              <textarea
                id="pr-review-priorities"
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
            <h3 className="card__title">{saved ? 'Revisión guardada' : 'Todo listo para guardar'}</h3>
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
        <section className="card" style={{ marginTop: 16 }}>
          <div className="card__header">
            <h3 className="card__title">Revisiones anteriores</h3>
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
                          onClick={() => setReviews((prev) => prev.filter((x) => x.id !== r.id))}
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
    </SectionFrame>
  )
}
