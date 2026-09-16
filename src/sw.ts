/**
 * Service Worker propio (estrategia `injectManifest` de vite-plugin-pwa, ver
 * vite.config.ts). Reemplaza al `sw.js` autogenerado (`generateSW`) porque
 * ese modo no permite agregar handlers de `push`/`notificationclick` — acá
 * replicamos exactamente el mismo comportamiento de caché que tenía antes
 * (precache + fallback de navegación + NetworkFirst para lecturas a
 * Supabase) y le sumamos push real.
 */
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import type { PrecacheEntry } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { ExpirationPlugin } from 'workbox-expiration'

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<PrecacheEntry | string>
}

// Vite/workbox reemplaza esta constante por la lista real de assets al buildear.
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// `registerType: 'autoUpdate'` (ver vite.config.ts) espera que el SW nuevo
// tome control apenas el registro (virtual:pwa-register) le manda este mensaje.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('activate', () => {
  void self.clients.claim()
})

// Fallback de navegación: cualquier ruta de la SPA sirve index.html cacheado,
// salvo las funciones serverless de Vercel (/api/...), que nunca deben
// resolverse contra el HTML cacheado.
const navigationHandler = createHandlerBoundToURL('/index.html')
registerRoute(new NavigationRoute(navigationHandler, { denylist: [/^\/api\//] }))

// Lecturas a Supabase (GET /rest/v1/...): NetworkFirst para que al reabrir la
// app sin conexión se vea el último estado conocido. Los writes y /auth/v1/
// nunca se cachean — mismo criterio que tenía el `workbox.runtimeCaching` de
// generateSW.
registerRoute(
  ({ url, request }) => request.method === 'GET' && url.pathname.startsWith('/rest/v1/'),
  new NetworkFirst({
    cacheName: 'supabase-rest',
    networkTimeoutSeconds: 4,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 }),
    ],
  }),
)

interface PushPayload {
  title: string
  body: string
  url?: string
  tag?: string
}

/** Contenido siempre generado server-side (ver api/send-notifications.ts) — nunca datos del usuario en texto plano fuera de title/body. */
function parsePushPayload(event: PushEvent): PushPayload | null {
  if (!event.data) return null
  try {
    const data = event.data.json() as Partial<PushPayload>
    if (!data.title || !data.body) return null
    return { title: data.title, body: data.body, url: data.url, tag: data.tag }
  } catch {
    return null
  }
}

self.addEventListener('push', (event) => {
  const payload = parsePushPayload(event)
  if (!payload) return

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/pwa-192.png',
      badge: '/pwa-192.png',
      tag: payload.tag,
      data: { url: payload.url ?? '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data as { url?: string } | undefined)?.url ?? '/'

  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const target = new URL(url, self.location.origin).href
      const existing = clientsList.find((c) => c.url === target || c.url.startsWith(self.location.origin))
      if (existing) {
        await existing.focus()
        if ('navigate' in existing) await (existing as WindowClient).navigate(target)
        return
      }
      await self.clients.openWindow(target)
    })(),
  )
})
