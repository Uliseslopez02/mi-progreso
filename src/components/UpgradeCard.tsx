import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { track } from '../domain/analytics'
import { LIMIT_COPY, PRO_NAME, type LimitKey } from '../domain/plan'

interface Props {
  limit: LimitKey
  /** Sobrescribe el título por defecto de `LIMIT_COPY` (ej. contador exacto). */
  title?: string
  /** Sobrescribe el cuerpo por defecto. */
  body?: string
  /** Estilo compacto para incrustar dentro de un formulario. */
  compact?: boolean
}

/**
 * Aviso de upgrade contextual: aparece SÓLO cuando la persona intenta una
 * acción que supera el límite de su plan, en el lugar de esa acción. Copy
 * orientado a valor — nunca "no podés" ni "vas a perder tu progreso". Un solo
 * botón hacia `/premium`. Registra `limit_reached` al montarse.
 */
export function UpgradeCard({ limit, title, body, compact }: Props) {
  useEffect(() => {
    track({ name: 'limit_reached', limit })
  }, [limit])

  const copy = LIMIT_COPY[limit]

  return (
    <div className={`upgrade-card${compact ? ' upgrade-card--compact' : ''}`} role="note">
      <p className="upgrade-card__title">{title ?? copy.title}</p>
      <p className="upgrade-card__body">{body ?? copy.body}</p>
      <Link
        to="/premium"
        className="btn btn--primary upgrade-card__cta"
        onClick={() => track({ name: 'upgrade_cta_clicked', from: limit })}
      >
        Ver {PRO_NAME}
      </Link>
    </div>
  )
}
