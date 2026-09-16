import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatRelativeTime, iconForType } from '../domain/notifications'
import { useNotifications } from '../state/notificationContext'

/**
 * Campana del header + panel desplegable con las últimas notificaciones.
 * Tocar una notificación la marca leída y navega a `actionPath` (si tiene) —
 * ej. un logro de racha lleva a Historial, un objetivo por cerrar a Hoy.
 */
export function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    const onClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const recent = notifications.slice(0, 20)

  return (
    <div className="notif-bell" ref={containerRef}>
      <button
        type="button"
        className="notif-bell__btn"
        aria-label={unreadCount > 0 ? `Notificaciones, ${unreadCount} sin leer` : 'Notificaciones'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden="true">🔔</span>
        {unreadCount > 0 && <span className="notif-bell__badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {open && (
        <div className="notif-panel" role="dialog" aria-label="Notificaciones">
          <div className="notif-panel__header">
            <h2 className="card__title">Notificaciones</h2>
            {unreadCount > 0 && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => void markAllRead()}>
                Marcar todo leído
              </button>
            )}
          </div>

          {recent.length === 0 && (
            <p className="empty notif-panel__empty">
              Todavía no hay notificaciones. Van a aparecer acá a medida que uses la app.
            </p>
          )}

          <ul className="notif-list">
            {recent.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  className={`notif-item${n.readAt ? '' : ' notif-item--unread'}`}
                  onClick={() => {
                    if (!n.readAt) void markRead(n.id)
                    setOpen(false)
                    if (n.actionPath) navigate(n.actionPath)
                  }}
                >
                  <span className="notif-item__icon" aria-hidden="true">
                    {iconForType(n.type)}
                  </span>
                  <span className="notif-item__body">
                    <span className="notif-item__title">{n.title}</span>
                    <span className="notif-item__text">{n.body}</span>
                    <span className="notif-item__time">{formatRelativeTime(n.createdAt)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
