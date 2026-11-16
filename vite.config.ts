import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    // An installable app with offline support, and no push reminders (those would need a server).
    // The shell (scripts, styles, fonts) is cached up front. The notes, the series lists and the search files are cached as they
    // are opened, network first so a changed lecture shows up as soon as there is a connection.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Nota Kuliah',
        short_name: 'Nota Kuliah',
        description: 'Nota kuliah Ustaz Azlan Shah NK: topik, dalil, rujukan dan pengajaran.',
        lang: 'ms',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#faf7ef',
        theme_color: '#134e3a',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,woff,woff2,svg,png}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/series\//, /^\/search\//, /^\/og\//, /^\/sitemap/, /^\/robots/],
        runtimeCaching: [
          { urlPattern: ({ url }) => url.pathname.startsWith('/series/') || url.pathname.startsWith('/search/'), handler: 'NetworkFirst', options: { cacheName: 'nk-notes', networkTimeoutSeconds: 4, expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 60 } } },
          { urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com', handler: 'StaleWhileRevalidate', options: { cacheName: 'nk-fonts' } },
        ],
      },
    }),
  ],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
})
