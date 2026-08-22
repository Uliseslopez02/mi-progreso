import { useState } from 'react'
import { LifeWheelChart } from '../../components/LifeWheelChart'
import { buildDemoWheelSnapshot } from '../demoData'
import { ModuleFrame } from '../ModuleFrame'

const SNAPSHOT = buildDemoWheelSnapshot()

/** Módulo 4 — Rueda de la vida, con hover para resaltar cada área. */
export function LifeWheelModule() {
  const [hovered, setHovered] = useState<number | null>(null)
  const area = hovered !== null ? SNAPSHOT.areas[hovered] : null

  return (
    <ModuleFrame eyebrow="Rueda de la vida" title="Un vistazo a todo a la vez" className="sc-module--wheel">
      <LifeWheelChart areas={SNAPSHOT.areas} hoveredIndex={hovered} onHoverArea={setHovered} />
      <p className="sc-wheel__hint">
        {area ? `${area.categoryName}: ${area.score}/10` : 'Pasá el mouse por cada área'}
      </p>
    </ModuleFrame>
  )
}
