import { createContext, useContext } from 'react'
import type { AppNotification, NotificationPreferences } from '../domain/notifications'

export interface NotificationContextValue {
  notifications: AppNotification[]
  preferences: NotificationPreferences
  unreadCount: number
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
  updatePreferences: (patch: Partial<NotificationPreferences>) => Promise<void>
}

export const NotificationContext = createContext<NotificationContextValue | null>(null)

export function useNotifications(): NotificationContextValue {
  const value = useContext(NotificationContext)
  if (!value) throw new Error('useNotifications debe usarse dentro de <NotificationProvider>')
  return value
}
