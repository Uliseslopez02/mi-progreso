import { bandForPercent } from '../domain/scoring'
import { BAND_COLOR } from './colors'

interface Props {
  percent: number
  size?: number
  strokeWidth?: number
  caption?: string
  /** Reemplaza el "{percent}%" del centro (ej. un mm:ss para el temporizador de enfoque). */
  label?: string
}

/**
 * Anillo de progreso. El avance se anima solo: cambia stroke-dashoffset y el
 * CSS hace la transición, sin librerías ni timers.
 */
export function ProgressRing({ percent, size = 232, strokeWidth = 14, caption = 'completado', label }: Props) {
  const clamped = Math.max(0, Math.min(100, percent))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - clamped / 100)
  const color = BAND_COLOR[bandForPercent(clamped)]

  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          className="ring__track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
        />
        <circle
          className="ring__value"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="ring__center">
        <span className="ring__percent numeric" data-testid="ring-percent">
          {label ?? `${Math.round(clamped)}%`}
        </span>
        <span className="ring__caption">{caption}</span>
      </div>
    </div>
  )
}
