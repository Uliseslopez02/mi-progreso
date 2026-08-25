import type { LifeWheelAreaScore } from '../domain/types'

interface Props {
  areas: LifeWheelAreaScore[]
  /** Snapshot anterior, dibujado como contorno punteado para comparar. */
  previousAreas?: LifeWheelAreaScore[]
  hoveredIndex?: number | null
  onHoverArea?: (index: number | null) => void
  /** Área elegida por click/tap, resaltada igual que el hover. */
  selectedIndex?: number | null
  onSelectArea?: (index: number) => void
}

const SIZE = 320
const CENTER = SIZE / 2
const RADIUS = 108
const MAX_SCORE = 10
const RINGS = [2, 4, 6, 8, 10]

function point(index: number, total: number, score: number) {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / total
  const r = (score / MAX_SCORE) * RADIUS
  return { x: CENTER + r * Math.cos(angle), y: CENTER + r * Math.sin(angle) }
}

function polygonPoints(areas: LifeWheelAreaScore[]): string {
  return areas
    .map((a, i) => {
      const p = point(i, areas.length, a.score)
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`
    })
    .join(' ')
}

/** Radar de la Rueda de la vida. SVG puro, mismo espíritu que `LineChart`. */
export function LifeWheelChart({
  areas,
  previousAreas,
  hoveredIndex = null,
  onHoverArea,
  selectedIndex = null,
  onSelectArea,
}: Props) {
  if (areas.length === 0) {
    return <p className="chart-empty">Necesitás al menos una categoría para graficar la rueda.</p>
  }

  const total = areas.length

  return (
    <div className="chart-wrap">
      <svg
        className="chart"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label="Rueda de la vida: puntaje 1 a 10 por categoría"
      >
        <defs>
          <radialGradient id="wheelGradient">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.04" />
          </radialGradient>
        </defs>

        {RINGS.map((ring) => (
          <polygon
            key={ring}
            className="chart__grid"
            fill="none"
            points={areas.map((_, i) => point(i, total, ring)).map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
          />
        ))}

        {areas.map((area, i) => {
          const p = point(i, total, MAX_SCORE)
          return <line key={area.categoryId} className="chart__grid" x1={CENTER} y1={CENTER} x2={p.x} y2={p.y} />
        })}

        {previousAreas && previousAreas.length === total && (
          <polygon
            points={polygonPoints(previousAreas)}
            fill="none"
            stroke="var(--text-dim)"
            strokeWidth={1.5}
            strokeDasharray="5 5"
          />
        )}

        <polygon points={polygonPoints(areas)} fill="url(#wheelGradient)" stroke="none" />
        <polygon points={polygonPoints(areas)} className="chart__line" />

        {areas.map((area, i) => {
          const p = point(i, total, area.score)
          const active = hoveredIndex === i || selectedIndex === i
          return (
            <circle
              key={`dot-${area.categoryId}`}
              cx={p.x}
              cy={p.y}
              r={active ? 5 : 3}
              fill={active ? 'var(--accent)' : 'var(--text)'}
              opacity={active ? 1 : 0.7}
            />
          )
        })}

        {areas.map((area, i) => {
          const p = point(i, total, MAX_SCORE + 1.7)
          const active = hoveredIndex === i || selectedIndex === i
          return (
            <text
              key={area.categoryId}
              className="chart__axis"
              x={p.x}
              y={p.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={active ? 'var(--accent)' : undefined}
              fontWeight={active ? 700 : undefined}
            >
              {area.categoryName} ({area.score})
            </text>
          )
        })}

        {(onHoverArea || onSelectArea) &&
          areas.map((area, i) => {
            const p = point(i, total, area.score)
            return (
              <circle
                key={`hit-${area.categoryId}`}
                className="chart__hit"
                cx={p.x}
                cy={p.y}
                r={18}
                onMouseEnter={() => onHoverArea?.(i)}
                onMouseLeave={() => onHoverArea?.(null)}
                onClick={() => onSelectArea?.(i)}
                onKeyDown={(e) => {
                  if (onSelectArea && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault()
                    onSelectArea(i)
                  }
                }}
                role={onSelectArea ? 'button' : undefined}
                tabIndex={onSelectArea ? 0 : undefined}
                aria-label={onSelectArea ? `Ver detalle de ${area.categoryName}` : undefined}
                style={onSelectArea ? { cursor: 'pointer' } : undefined}
              />
            )
          })}
      </svg>
    </div>
  )
}
