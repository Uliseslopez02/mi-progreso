import { useState } from 'react'
import type { LifeGoal } from '../../domain/types'
import { buildDemoDreams } from '../demoData'
import { ModuleFrame } from '../ModuleFrame'

const DREAMS = buildDemoDreams()

function symbolFor(dream: LifeGoal): string {
  if (dream.status === 'completed') return '✓'
  if (dream.progress > 0) return '○'
  return '✦'
}

/** Módulo 8 — sueños de largo plazo, conectados a un próximo paso concreto. */
export function DreamsModule() {
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <ModuleFrame eyebrow="Sueños" title="Lo que todavía querés cumplir" className="sc-module--dreams">
      <ul className="sc-dreams-list">
        {DREAMS.map((dream) => {
          const open = openId === dream.id
          const nextStep = dream.subGoals.find((s) => !s.done)
          return (
            <li key={dream.id} className="sc-dreams-item">
              <button
                type="button"
                className="sc-dreams-item__row"
                aria-expanded={open}
                onClick={() => setOpenId(open ? null : dream.id)}
              >
                <span className={`sc-dreams-item__symbol sc-dreams-item__symbol--${dream.status}`}>
                  {symbolFor(dream)}
                </span>
                <span className="sc-dreams-item__name">{dream.name}</span>
              </button>
              {open && (
                <div className="sc-dreams-item__detail">
                  <p>{dream.description}</p>
                  {nextStep && (
                    <p className="sc-dreams-item__next">
                      <strong>Próximo paso:</strong> {nextStep.text}
                    </p>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </ModuleFrame>
  )
}
