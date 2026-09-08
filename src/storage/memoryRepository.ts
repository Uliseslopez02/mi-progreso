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
        aiUsage: plan === 'premium' ? null : { count: 0, limit: 3 },
      }
    },
    async getOnboardingCompleted() {
      return onboardingCompleted
    },
    async completeOnboarding() {
      onboardingCompleted = true
    },
  }
}
