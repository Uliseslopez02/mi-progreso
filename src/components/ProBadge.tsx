import { Link } from 'react-router-dom'
import { track } from '../domain/analytics'
import { PRO_NAME } from '../domain/plan'

interface Props {
  /** De dónde salió el click, para analytics. */
  from?: string
  /** Sin link: sólo la etiqueta (cuando el contenedor ya es clickable). */
  static?: boolean
}

/**
 * Etiqueta pasiva "Premium" al lado de un control reservado al plan pago. No
 * dispara analytics al renderizarse (no es un paywall visto) — sólo al tocarla.
 */
export function ProBadge({ from = 'badge', static: isStatic }: Props) {
  if (isStatic) {
    return <span className="pro-badge" aria-label={`Función ${PRO_NAME}`}>{PRO_NAME}</span>
  }
  return (
    <Link
      to="/premium"
      className="pro-badge pro-badge--link"
      aria-label={`${PRO_NAME}: conocé el plan`}
      onClick={() => track({ name: 'upgrade_cta_clicked', from })}
    >
      {PRO_NAME}
    </Link>
  )
}
