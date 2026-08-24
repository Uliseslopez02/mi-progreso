import { useState } from 'react'
import { ProgressPath } from '../components/ProgressPath'
import { useAutoFocusHeading } from '../hooks/useAutoFocusHeading'

interface Props {
  /** Termina la intro y sigue al wizard de objetivos. */
  onContinue: () => void
  /** Termina la intro y salta directo a la app vacía. */
  onSkip: () => void
}

type Moment = 0 | 1 | 2 | 3

const CAPABILITIES = [
  { emoji: '✓', label: 'Crear hábitos' },
  { emoji: '🎯', label: 'Definir objetivos' },
  { emoji: '📈', label: 'Medir tu progreso' },
  { emoji: '🔁', label: 'Revisar tu evolución' },
]

/** Introducción breve y opcional para quien recién crea una cuenta — nunca bloquea, siempre se puede saltear. */
export function FirstTimeIntro({ onContinue, onSkip }: Props) {
  const [moment, setMoment] = useState<Moment>(0)
  const textRef = useAutoFocusHeading<HTMLParagraphElement>(moment)

  return (
    <div className="onboarding-screen">
      <div className="card onboarding-card intro-card">
        {moment < 3 && (
          <button type="button" className="intro-card__skip" onClick={() => setMoment(3)}>
            Saltar
          </button>
        )}

        {moment === 0 && (
          <div className="intro-card__moment">
            <p className="intro-card__text" ref={textRef} tabIndex={-1}>
              Esto no se trata de hacerlo todo.
            </p>
          </div>
        )}

        {moment === 1 && (
          <div className="intro-card__moment">
            <p className="intro-card__text" ref={textRef} tabIndex={-1}>
              Se trata de avanzar un poco cada día.
            </p>
          </div>
        )}

        {moment === 2 && (
          <div className="intro-card__moment">
            <p className="intro-card__text intro-card__text--sm" ref={textRef} tabIndex={-1}>
              Con Mi Progreso podés
            </p>
            <div className="intro-card__capabilities">
              {CAPABILITIES.map((c) => (
                <div key={c.label} className="intro-card__capability">
                  <span aria-hidden="true">{c.emoji}</span>
                  {c.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {moment === 3 && (
          <div className="intro-card__moment">
            <p className="intro-card__text" ref={textRef} tabIndex={-1}>
              Empezá por algo pequeño.
            </p>
            <div className="intro-card__actions">
              <button type="button" className="btn btn--primary" onClick={onContinue}>
                Crear mi primer objetivo
              </button>
              <button type="button" className="btn btn--ghost" onClick={onSkip}>
                Explorar Mi Progreso
              </button>
            </div>
          </div>
        )}

        {moment < 3 && (
          <div className="intro-card__nav">
            <ProgressPath steps={4} activeIndex={moment} size="sm" />
            <button type="button" className="btn btn--primary" onClick={() => setMoment((m) => (m + 1) as Moment)}>
              Seguir
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
