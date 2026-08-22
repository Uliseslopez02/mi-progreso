import type { ReactNode } from 'react'
import { CheckIcon } from './icons'

interface Props {
  /** Cantidad de nodos del camino. */
  steps?: number
  /** Nodo actualmente activo (0-based). Los anteriores se muestran como completados. Ignorado si `indeterminate`. */
  activeIndex?: number
  /** Camino "vivo" sin progreso discreto real que mostrar (p. ej. una carga de duración desconocida). */
  indeterminate?: boolean
  orientation?: 'horizontal' | 'vertical'
  size?: 'sm' | 'md'
  labels?: string[]
}

/**
 * Elemento visual propio de Mi Progreso: un camino de nodos conectados que
 * representa avance construido paso a paso. Se reusa en login, registro,
 * onboarding y carga — en modo determinado (`activeIndex`) refleja pasos
 * reales; en modo `indeterminate` es puramente ambiental (actividad en
 * curso), nunca simula un progreso que no conocemos.
 */
export function ProgressPath({
  steps = 3,
  activeIndex = 0,
  indeterminate = false,
  orientation = 'horizontal',
  size = 'md',
  labels,
}: Props) {
  const items: ReactNode[] = []
  for (let i = 0; i < steps; i++) {
    const state = indeterminate ? 'idle' : i < activeIndex ? 'done' : i === activeIndex ? 'active' : 'idle'
    items.push(
      <span key={`node-${i}`} className={`progress-path__node progress-path__node--${state}`}>
        {state === 'done' && <CheckIcon size={size === 'sm' ? 8 : 10} />}
      </span>,
    )
    if (i < steps - 1) {
      const done = !indeterminate && i < activeIndex
      items.push(
        <span key={`link-${i}`} className={`progress-path__connector${done ? ' progress-path__connector--done' : ''}`} />,
      )
    }
  }

  return (
    <div
      className={`progress-path progress-path--${orientation} progress-path--${size}${indeterminate ? ' progress-path--indeterminate' : ''}`}
      role="presentation"
      aria-hidden="true"
    >
      <div className="progress-path__row">{items}</div>
      {labels && (
        <div className="progress-path__labels">
          {labels.map((label, i) => (
            <span
              key={label}
              className={`progress-path__label${i === activeIndex ? ' progress-path__label--active' : ''}`}
            >
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
