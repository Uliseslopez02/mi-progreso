import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { track } from '../domain/analytics'
import { dismissPremiumBanner, isPremiumBannerDismissed } from './premiumBannerStatus'

/**
 * Invitación a Premium en el dashboard, para descubrimiento (el caller filtra
 * por `plan`, ver TodayPage — nunca se muestra a usuarios Premium). Respeta
 * el cierre: una vez descartado no vuelve a aparecer de inmediato (ver
 * premiumBannerStatus.ts), para sumar visibilidad sin ser invasivo.
 */
export function PremiumBanner() {
  const [visible, setVisible] = useState(() => !isPremiumBannerDismissed())

  useEffect(() => {
    if (visible) track({ name: 'premium_banner_viewed' })
  }, [visible])

  if (!visible) return null

  const handleDismiss = () => {
    dismissPremiumBanner()
    setVisible(false)
    track({ name: 'premium_banner_dismissed' })
  }

  return (
    <div className="premium-banner">
      <button
        type="button"
        className="icon-btn premium-banner__close"
        aria-label="Cerrar aviso de Premium"
        onClick={handleDismiss}
      >
        ✕
      </button>
      <div className="premium-banner__body">
        <p className="premium-banner__title">Sumale un poco de IA a tu progreso ✨</p>
        <p className="premium-banner__hint">
          Con Premium tenés sugerencias de hábitos e insights de tu historial, sin límite mensual.
        </p>
      </div>
      <Link
        to="/premium"
        className="btn btn--primary premium-banner__cta"
        onClick={() => track({ name: 'premium_banner_clicked' })}
      >
        Conocer Premium
      </Link>
    </div>
  )
}
