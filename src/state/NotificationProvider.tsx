import type { ReactNode } from 'react'
import { useNotificationEngine } from '../hooks/useNotificationEngine'
import { NotificationContext } from './notificationContext'

/**
 * Corre el motor de notificaciones (ver `useNotificationEngine.ts`) una sola
 * vez, arriba del todo del árbol autenticado, y lo expone vía contexto para
 * que la campana (header), el centro de notificaciones y la sección de
 * preferencias en Ajustes compartan el mismo estado sin duplicar llamadas.
 */
export function NotificationProvider({ children }: { children: ReactNode }) {
  const value = useNotificationEngine()
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}
