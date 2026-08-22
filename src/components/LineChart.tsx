import { useState } from 'react'
import { formatShortDate } from '../domain/date'
import type { SeriesPoint } from '../domain/scoring'

interface Props {
  points: SeriesPoint[]
  average?: number
}

const VB_W = 720
const VB_H = 240
const PAD = { top: 16, right: 14, bottom: 28, left: 36 }

/** Gráfico de línea del progreso diario. SVG puro, sin dependencias. */
export function LineChart({ points, average }: Props) {
  const [hover, setHover] = useState<number | null>(null)

  if (points.length === 0) {
    return <p className="chart-empty">Todavía no hay días registrados.</p>
  }

  const innerW = VB_W - PAD.left - PAD.right
  const innerH = VB_H - PAD.top - PAD.bottom
  const stepX = points.length > 1 ? innerW / (points.length - 1) : 0

  const x = (i: number) => PAD.left + (points.length > 1 ? i * stepX : innerW / 2)
  const y = (percent: number) => PAD.top + innerH * (1 - percent / 100)

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.percent).toFixed(1)}`)
    .join(' ')

  const areaPath = `${linePath} L ${x(points.length - 1).toFixed(1)} ${PAD.top + innerH} L ${x(0).toFixed(1)} ${PAD.top + innerH} Z`

  const showDots = points.length <= 32
  const labelEvery = Math.ceil(points.length / 7)
  const active = hover !== null ? points[hover] : null

  return (
    <div className="chart-wrap">
      <svg
        className="chart"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        role="img"
        aria-label={`Progreso diario de los últimos ${points.length} días`}
      >
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 25, 50, 75, 100].map((tick) => (
          <g key={tick}>
            <line
              className="chart__grid"
              x1={PAD.left}
              x2={VB_W - PAD.right}
              y1={y(tick)}
              y2={y(tick)}
            />
            <text className="chart__axis" x={PAD.left - 8} y={y(tick) + 3} textAnchor="end">
              {tick}
            </text>
          </g>
        ))}

        {typeof average === 'number' && average > 0 && (
          <line
            x1={PAD.left}
            x2={VB_W - PAD.right}
            y1={y(average)}
            y2={y(average)}
            stroke="var(--text-dim)"
            strokeWidth="1"
            strokeDasharray="5 5"
          />
        )}

        <path className="chart__area" d={areaPath} fill="url(#areaGradient)" />
        <path className="chart__line" d={linePath} />

        {points.map((p, i) => (
          <g key={p.date}>
            {showDots && (
              <circle
                className={`chart__dot${p.hasRecord ? '' : ' chart__dot--empty'}`}
                cx={x(i)}
                cy={y(p.percent)}
                r={hover === i ? 6 : 4}
              />
            )}
            {i % labelEvery === 0 && (
              <text className="chart__axis" x={x(i)} y={VB_H - 8} textAnchor="middle">
                {formatShortDate(p.date)}
              </text>
            )}
            <rect
              className="chart__hit"
              x={x(i) - Math.max(stepX / 2, 10)}
              y={PAD.top}
              width={Math.max(stepX, 20)}
              height={innerH}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          </g>
        ))}
      </svg>

      {active && hover !== null && (
        <div
          className="chart-tooltip"
          style={{
            left: `${(x(hover) / VB_W) * 100}%`,
            top: `${(y(active.percent) / VB_H) * 100}%`,
          }}
        >
          <strong className="numeric">{active.percent}%</strong> · {formatShortDate(active.date)}
        </div>
      )}
    </div>
  )
}
