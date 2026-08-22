import { useState } from 'react'
import { timeLived } from '../../domain/momentoMori'
import { todayKey } from '../../domain/date'
import { DEMO_BIRTH_DATE, DEMO_LIFE_EXPECTANCY_YEARS, MOMENTO_MORI_QUOTES } from '../demoData'
import { ModuleFrame } from '../ModuleFrame'

const LIVED = timeLived(DEMO_BIRTH_DATE, todayKey(), DEMO_LIFE_EXPECTANCY_YEARS)

/** Módulo 6 — Momento Mori: más contemplativo, tratamiento visual propio. */
export function MomentoMoriModule() {
  const [index, setIndex] = useState(0)

  return (
    <ModuleFrame eyebrow="Momento Mori" title="El tiempo, a la vista" className="sc-module--mori">
      <button
        type="button"
        className="sc-mori__quote"
        onClick={() => setIndex((i) => (i + 1) % MOMENTO_MORI_QUOTES.length)}
      >
        <span key={index} className="sc-mori__quote-text">
          “{MOMENTO_MORI_QUOTES[index]}”
        </span>
        <span className="sc-mori__quote-hint">Tocá para otra reflexión</span>
      </button>

      {LIVED.percentLived !== null && (
        <div className="sc-mori__bar-wrap">
          <div className="sc-mori__bar-row">
            <span>Vida vivida</span>
            <span className="numeric">{LIVED.percentLived}%</span>
          </div>
          <div className="consistency__bar">
            <span className="consistency__fill" style={{ width: `${LIVED.percentLived}%`, background: 'var(--text-dim)' }} />
          </div>
        </div>
      )}
    </ModuleFrame>
  )
}
