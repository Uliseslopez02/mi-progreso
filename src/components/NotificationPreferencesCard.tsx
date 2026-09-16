import { useState } from 'react'
import { isPushSupported, subscribeToPush, unsubscribeFromPush } from '../domain/push'
import { Toggle } from './Toggle'
import { useNotifications } from '../state/notificationContext'

const PUSH_ERROR_MESSAGE: Record<'permission_denied' | 'no_session' | 'error', string> = {
  permission_denied: 'Bloqueaste los permisos de notificación en el navegador — activalos desde la configuración del sitio para poder recibir push.',
  no_session: 'Necesitás una sesión activa para activar las notificaciones push.',
  error: 'No se pudo activar las notificaciones push. Probá de nuevo en un momento.',
}

/**
 * Preferencias de notificaciones en Ajustes. A propósito, pocas opciones (ver
 * prompt original: "no llenar de opciones innecesarias, la experiencia debe
 * ser simple") — un interruptor general, una por categoría, el horario de
 * silencio, y activar/desactivar push real.
 */
export function NotificationPreferencesCard() {
  const { preferences, updatePreferences } = useNotifications()
  const [pushBusy, setPushBusy] = useState(false)
  const [pushError, setPushError] = useState<string | null>(null)
  const pushSupported = isPushSupported()

  const togglePush = async (checked: boolean) => {
    setPushError(null)
    if (!checked) {
      await unsubscribeFromPush()
      void updatePreferences({ pushEnabled: false })
      return
    }
    setPushBusy(true)
    const result = await subscribeToPush()
    setPushBusy(false)
    if (result.ok) {
      void updatePreferences({ pushEnabled: true })
    } else if (result.reason !== 'unsupported') {
      setPushError(PUSH_ERROR_MESSAGE[result.reason])
    }
  }

  return (
    <section className="card">
      <div className="card__header">
        <h2 className="card__title">Notificaciones</h2>
        <span className="card__hint">Mi Progreso avisa según cómo viene tu proceso, no con recordatorios genéricos.</span>
      </div>

      <div className="stack" style={{ gap: 14 }}>
        <Toggle
          checked={preferences.enabled}
          onChange={(checked) => void updatePreferences({ enabled: checked })}
          label="Notificaciones activadas"
        />

        <div className="stack" style={{ gap: 10, opacity: preferences.enabled ? 1 : 0.5, pointerEvents: preferences.enabled ? 'auto' : 'none' }}>
          <Toggle
            checked={preferences.achievements}
            onChange={(checked) => void updatePreferences({ achievements: checked })}
            label="Logros (hitos, rachas, objetivos completados)"
          />
          <Toggle
            checked={preferences.streaks}
            onChange={(checked) => void updatePreferences({ streaks: checked })}
            label="Avisos de racha (cuando está por cortarse)"
          />
          <Toggle
            checked={preferences.motivation}
            onChange={(checked) => void updatePreferences({ motivation: checked })}
            label="Motivación y resumen semanal"
          />
          <Toggle
            checked={preferences.reminders}
            onChange={(checked) => void updatePreferences({ reminders: checked })}
            label="Recordatorios (objetivos del día)"
          />
        </div>

        {pushSupported && (
          <div style={{ opacity: preferences.enabled ? 1 : 0.5, pointerEvents: preferences.enabled ? 'auto' : 'none' }}>
            <Toggle
              checked={preferences.pushEnabled}
              onChange={(checked) => void togglePush(checked)}
              label={pushBusy ? 'Activando…' : 'Notificaciones push (aunque tengas la app cerrada)'}
            />
            {pushError && (
              <p className="card__hint" style={{ color: '#fca5a5', marginTop: 6 }}>
                {pushError}
              </p>
            )}
          </div>
        )}

        <div className="field" style={{ maxWidth: 340, opacity: preferences.enabled ? 1 : 0.5 }}>
          <label className="field__label" htmlFor="quiet-hours">
            Horario sin notificaciones
          </label>
          <div className="row" id="quiet-hours">
            <input
              className="input"
              type="number"
              min={0}
              max={23}
              style={{ width: 90 }}
              aria-label="Desde qué hora"
              value={preferences.quietHoursStart}
              disabled={!preferences.enabled}
              onChange={(e) => {
                const value = Number(e.target.value)
                if (!Number.isFinite(value)) return
                void updatePreferences({ quietHoursStart: Math.min(23, Math.max(0, Math.round(value))) })
              }}
            />
            <span className="card__hint">a</span>
            <input
              className="input"
              type="number"
              min={0}
              max={23}
              style={{ width: 90 }}
              aria-label="Hasta qué hora"
              value={preferences.quietHoursEnd}
              disabled={!preferences.enabled}
              onChange={(e) => {
                const value = Number(e.target.value)
                if (!Number.isFinite(value)) return
                void updatePreferences({ quietHoursEnd: Math.min(23, Math.max(0, Math.round(value))) })
              }}
            />
            <span className="card__hint">hs</span>
          </div>
        </div>
      </div>
    </section>
  )
}
