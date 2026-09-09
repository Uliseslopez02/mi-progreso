/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['logo.svg', 'apple-touch-icon.png', 'favicon-48.png'],
      manifest: {
        name: 'Mi Progreso',
        short_name: 'Mi Progreso',
        description:
          'Tablero personal de progreso diario: hábitos, objetivos, agenda, historial y racha.',
        lang: 'es',
        dir: 'ltr',
        theme_color: '#0b0d10',
        background_color: '#0b0d10',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        categories: ['productivity', 'lifestyle'],
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: '/pwa-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        navigateFallback: '/index.html',
        // Las funciones serverless de Vercel nunca deben resolverse contra el
        // index.html cacheado.
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            // Lecturas a Supabase (GET /rest/v1/...): NetworkFirst para que al
            // reabrir la app sin conexión se vea el último estado conocido.
            // Los writes y /auth/v1/ nunca se cachean.
            urlPattern: ({ url, request }) =>
              request.method === 'GET' && url.pathname.startsWith('/rest/v1/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-rest',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
      devOptions: {
        // El service worker no se registra en `vite dev` (evita cachear en
        // desarrollo). Para probarlo: `npm run build && npm run preview`.
        enabled: false,
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    css: false,
  },
})
