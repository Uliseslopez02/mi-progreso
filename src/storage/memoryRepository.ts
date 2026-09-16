import { DEFAULT_NOTIFICATION_PREFERENCES } from '../domain/notifications'
import type { AppNotification, NotificationPreferences } from '../domain/notifications'
import type { AppData, FocusSession, UserPlan } from '../domain/types'
import type { ProgressRepository } from './repository'

/** Implementación en memoria: usada en tests y como fallback sin localStorage. */
export function createMemoryRepository(
  initial: AppData | null = null,
  plan: UserPlan = 'free',
): ProgressRepository {
  let data = initial
  let focusSessions: FocusSession[] = []
  let onboardingCompleted = false
  let notifications: AppNotification[] = []
  let notificationPreferences: NotificationPreferences = { ...DEFAULT_NOTIFICATION_PREFERENCES }
  return {
    async load() {
      return data ? structuredClone(data) : null
    },
    async save(next) {
      data = structuredClone(next)
    },
    async clear() {
      data = null
      focusSessions = []
      notifications = []
      notificationPreferences = { ...DEFAULT_NOTIFICATION_PREFERENCES }
    },
    async loadFocusSessions() {
      return structuredClone(focusSessions)
    },
    async saveFocusSession(session) {
      focusSessions = [session, ...focusSessions.filter((s) => s.id !== session.id)]
    },
    async getUserPlan() {
      return plan
    },
    async getSubscriptionSummary() {
      return {
        status: plan === 'premium' ? 'active' : 'free',
        planTier: plan === 'premium' ? 'premium_monthly' : 'free',
        currentPeriodEnd: null,
        trialEnd: null,
        aiUsage: plan === 'premium' ? null : { count: 0, limit: 3 },
      }
    },
    async getOnboardingCompleted() {
      return onboardingCompleted
    },
    async completeOnboarding() {
      onboardingCompleted = true
    },
    async loadNotifications() {
      return structuredClone(notifications)
    },
    async insertNotification(notification) {
      notifications = [notification, ...notifications.filter((n) => n.id !== notification.id)]
    },
    async markNotificationRead(id) {
      const readAt = new Date().toISOString()
      notifications = notifications.map((n) => (n.id === id ? { ...n, readAt } : n))
    },
    async markAllNotificationsRead() {
      const readAt = new Date().toISOString()
      notifications = notifications.map((n) => (n.readAt ? n : { ...n, readAt }))
    },
    async getNotificationPreferences() {
      return { ...notificationPreferences }
    },
    async saveNotificationPreferences(patch) {
      notificationPreferences = { ...notificationPreferences, ...patch }
    },
  }
}
