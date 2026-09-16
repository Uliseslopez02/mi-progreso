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
      // `injectManifest` (en vez de `generateSW`) porque necesitamos un
      // Service Worker propio con handlers de `push`/`notificationclick`
      // (ver src/sw.ts) — generateSW no permite agregar código custom.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
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
      // El resto del comportamiento de caché (precache, fallback de
      // navegación, NetworkFirst para /rest/v1/) ahora vive escrito a mano en
      // src/sw.ts — con injectManifest, `workbox: {...}` ya no aplica.
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
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
