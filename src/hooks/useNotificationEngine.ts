import { useCallback, useEffect, useRef, useState } from 'react'
import { toDateKey } from '../domain/date'
import { createId } from '../domain/id'
import { tryPhraseNotification } from '../domain/notificationAi'
import { evaluateNotifications } from '../domain/notificationEngine'
import {
  buildUserContext,
  categoryForType,
  DEFAULT_NOTIFICATION_PREFERENCES,
  type AppNotification,
  type NotificationPreferences,
} from '../domain/notifications'
import { useAppContext } from '../state/context'

/** Evita evaluar en cada tecla/click: junta varios cambios seguidos en una sola pasada. */
const EVALUATE_DEBOUNCE_MS = 1500

/**
 * En tests, `import.meta.env.TEST` es `true` (lo define Vitest). El motor de
 * reglas se prueba directo y sin React (`notificationEngine.test.ts`) — acá
 * se apaga la evaluación automática para no sumarle trabajo de fondo (y un
 * intento de fetch a `/api/notification-message`) a los ~300 tests de
 * `app.test.tsx` y compañía, que no tienen nada que ver con notificaciones.
 * Cargar/leer notificaciones (abajo) sigue funcionando igual en tests.
 */
const AUTO_EVALUATE_ENABLED = !import.meta.env.TEST

/**
 * Corre el motor de reglas (`notificationEngine.ts`) cada vez que los datos
 * cambian de forma relevante, persiste las notificaciones nuevas (si hay) y
 * expone el estado para la campana/centro de notificaciones. La deduplicación
 * y los topes diario/semanal viven en el motor — acá sólo se orquesta:
 * cargar historial + preferencias, evaluar, redactar con IA sólo la de mayor
 * prioridad (una vez por día como máximo), guardar.
 */
export function useNotificationEngine() {
  const { state, repository } = useAppContext()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES)
  const [loaded, setLoaded] = useState(false)
  const debounceRef = useRef<number | null>(null)
  const busyRef = useRef(false)

  useEffect(() => {
    // Ver AUTO_EVALUATE_ENABLED: en tests, ni siquiera se carga — más de 30
    // suites montan <App/> sin que les importe nada de notificaciones, y cada
    // round-trip acá les suma trabajo real. El motor puro se prueba aparte,
    // sin React (`notificationEngine.test.ts`/`achievements.test.ts`).
    if (!AUTO_EVALUATE_ENABLED) return
    let cancelled = false
    Promise.all([repository.loadNotifications(), repository.getNotificationPreferences()])
      .then(([n, p]) => {
        if (cancelled) return
        setNotifications(n)
        setPreferences(p)
        setLoaded(true)
      })
      .catch(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [repository])

  const runEvaluation = useCallback(async () => {
    if (busyRef.current || !state.data) return
    busyRef.current = true
    try {
      const history = await repository.loadNotifications()
      const candidates = evaluateNotifications({
        data: state.data,
        today: state.today,
        now: new Date(),
        history,
        preferences,
      })
      if (candidates.length === 0) return

      const [top, ...rest] = candidates
      const alreadyAiToday = history.some((n) => n.aiPhrased && toDateKey(new Date(n.createdAt)) === state.today)

      let topTitle = top.title
      let topBody = top.body
      let topAiPhrased = false
      if (!alreadyAiToday) {
        const ctx = buildUserContext(state.data, state.today)
        const ai = await tryPhraseNotification(top.type, ctx, top.title, top.body)
        if (ai) {
          topTitle = ai.title
          topBody = ai.body
          topAiPhrased = true
        }
      }

      const createdAt = new Date().toISOString()
      const created: AppNotification[] = [
        {
          id: createId('notif'),
          type: top.type,
          category: categoryForType(top.type),
          priority: top.priority,
          title: topTitle,
          body: topBody,
          actionPath: top.actionPath,
          dedupKey: top.dedupKey,
          aiPhrased: topAiPhrased,
          metadata: top.metadata,
          createdAt,
          readAt: null,
        },
        ...rest.map(
          (c): AppNotification => ({
            id: createId('notif'),
            type: c.type,
            category: categoryForType(c.type),
            priority: c.priority,
            title: c.title,
            body: c.body,
            actionPath: c.actionPath,
            dedupKey: c.dedupKey,
            aiPhrased: false,
            metadata: c.metadata,
            createdAt,
            readAt: null,
          }),
        ),
      ]

      for (const notification of created) {
        await repository.insertNotification(notification)
      }
      setNotifications((prev) => [...created, ...prev])
    } catch {
      // Un fallo del motor de notificaciones nunca debe romper la app.
    } finally {
      busyRef.current = false
    }
  }, [repository, state.data, state.today, preferences])

  useEffect(() => {
    if (!AUTO_EVALUATE_ENABLED) return
    if (state.status !== 'ready' || !state.data || !loaded) return
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => {
      debounceRef.current = null
      void runEvaluation()
    }, EVALUATE_DEBOUNCE_MS)
    return () => {
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current)
    }
  }, [state.status, state.data, state.today, loaded, runEvaluation])

  const markRead = useCallback(
    async (id: string) => {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)))
      try {
        await repository.markNotificationRead(id)
      } catch {
        // Un fallo al persistir "leído" no debe revertir la UI ni romper nada.
      }
    },
    [repository],
  )

  const markAllRead = useCallback(async () => {
    const readAt = new Date().toISOString()
    setNotifications((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt })))
    try {
      await repository.markAllNotificationsRead()
    } catch {
      // idem markRead
    }
  }, [repository])

  const updatePreferences = useCallback(
    async (patch: Partial<NotificationPreferences>) => {
      setPreferences((prev) => ({ ...prev, ...patch }))
      try {
        await repository.saveNotificationPreferences(patch)
      } catch {
        // Un fallo al guardar preferencias no debe revertir el toggle en pantalla.
      }
    },
    [repository],
  )

  const unreadCount = notifications.filter((n) => !n.readAt).length

  return { notifications, preferences, unreadCount, markRead, markAllRead, updatePreferences }
}
