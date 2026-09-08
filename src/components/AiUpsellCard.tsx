import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { track } from '../domain/analytics'

interface Props {
  feature: 'suggest_habits' | 'habit_insights'
}

/**
 * Reemplaza el mensaje de error plano cuando el backend devuelve
 * `code === 'ai_limit_reached'` (ver api/suggest-habits.ts, api/habit-insights.ts)
 * — copy orientado a valor, nunca "no tenés acceso".
 */
export function AiUpsellCard({ feature }: Props) {
  useEffect(() => {
    track({ name: 'paywall_viewed', feature })
  }, [feature])

  return (
    <div className="card__hint" style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
      <p>Ya usaste tus 3 sugerencias de IA este mes. Con Premium, la IA te acompaña sin límites.</p>
      <Link to="/premium" className="btn btn--primary">
        Conocer Premium
      </Link>
    </div>
  )
}
