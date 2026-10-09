import { readFile } from 'node:fs/promises'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Inline, so PWABuilder's scanner finds the registration in the HTML. The
      // plugin then no longer sets skipWaiting/clientsClaim for autoUpdate (see
      // workbox below): without them, a new version waits until every tab closes.
      injectRegister: 'inline',
      devOptions: { enabled: false },
      // public/ files the UI needs offline: they are not hashed /assets/ chunks.
      includeAssets: ['map-pin*.svg', 'icon.svg', 'icon.png', 'hero-image.webp'],
      manifest: {
        id: '/',
        name: 'AeroTrips',
        short_name: 'AeroTrips',
        description: 'Idées de sorties aériennes en France : terrains, activités, événements et itinéraires.',
        lang: 'fr',
        categories: ['travel'],
        orientation: 'any',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        // Shown by Chrome's richer install dialog; recaptured by hand.
        screenshots: [
          { src: '/screenshots/mobile-airfields.webp', sizes: '1080x1920', type: 'image/webp', form_factor: 'narrow', label: 'Les terrains' },
          { src: '/screenshots/mobile-map.webp', sizes: '1080x1920', type: 'image/webp', form_factor: 'narrow', label: 'La carte des terrains et activités' },
          { src: '/screenshots/mobile-airfield.webp', sizes: '1080x1920', type: 'image/webp', form_factor: 'narrow', label: "La fiche d'un terrain" },
          { src: '/screenshots/desktop-airfield.webp', sizes: '1920x1080', type: 'image/webp', form_factor: 'wide', label: "La fiche d'un terrain" },
          { src: '/screenshots/desktop-map.webp', sizes: '1920x1080', type: 'image/webp', form_factor: 'wide', label: 'La carte des terrains et activités' },
        ],
        shortcuts: [
          { name: 'Carte', url: '/map', icons: [{ src: '/icons/shortcut-map.png', sizes: '192x192', type: 'image/png' }] },
          { name: 'Terrains', url: '/airfields', icons: [{ src: '/icons/shortcut-airfields.png', sizes: '192x192', type: 'image/png' }] },
          { name: 'Ajouter', url: '/edit', icons: [{ src: '/icons/shortcut-add.png', sizes: '192x192', type: 'image/png' }] },
        ],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        // Precache only the app shell (what index.html loads); lazy chunks are
        // cached on first use by the /assets/ rule below.
        manifestTransforms: [async (entries) => {
          const html = await readFile(new URL('./dist/index.html', import.meta.url), 'utf8')
          return { manifest: entries.filter(e => !e.url.startsWith('assets/') || html.includes(e.url)) }
        }],
        globIgnores: ['**/sitemap.xml', '**/robots.txt', '**/llms.txt', '**/.well-known/**'],
        navigateFallbackDenylist: [
          /^\/sitemap\.xml$/,
          /^\/robots\.txt$/,
          /^\/llms\.txt$/,
          /^\/\.well-known\//,
          /^\/mcp(\/|$)/,
          // Widget pages loaded in iframes on third-party sites: standalone
          // HTML, never the SPA shell.
          /^\/embed\//,
          /__/,
        ],
        runtimeCaching: [
          // Hashed file names never change content. Hosting answers a chunk
          // removed by a deploy with index.html (200): never cache that.
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/assets/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'assets',
              expiration: { maxEntries: 60 },
              plugins: [{
                cacheWillUpdate: async ({ response }) =>
                  response.ok && !response.headers.get('content-type')?.includes('text/html') ? response : null,
              }],
            },
          },
          // Map tiles already viewed, for weak signal on the field. Within the
          // OSM tile policy: no prefetching, kept no longer than its headers
          // allow. The TileLayers request them with CORS (`crossOrigin`), so
          // they are not opaque responses padded to megabytes of quota each.
          {
            urlPattern: /^https:\/\/tile\.openstreetmap\.org\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles',
              expiration: { maxEntries: 1000, maxAgeSeconds: 7 * 24 * 3600, purgeOnQuotaError: true },
            },
          },
          // Photos already viewed. Storage sends no CORS headers and the cards
          // use CSS backgrounds, so these are opaque: each counts for megabytes
          // of quota and a failure can't be told apart, hence few entries and a
          // background refresh (served by the HTTP cache: Storage URLs are
          // long-lived).
          {
            urlPattern: /^https:\/\/(firebasestorage|storage)\.googleapis\.com\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'photos',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 50, maxAgeSeconds: 30 * 24 * 3600, purgeOnQuotaError: true },
            },
          },
          {
            urlPattern: /^\/(sitemap\.xml|robots\.txt|llms\.txt)$/,
            handler: 'NetworkOnly',
          },
          // Discovery documents for AI clients: always fetched fresh, never
          // shadowed by the SPA navigation fallback.
          {
            urlPattern: /^\/\.well-known\//,
            handler: 'NetworkOnly',
          },
          // The MCP endpoint is a POST API served from this origin by a Hosting
          // rewrite; the service worker must never touch it.
          {
            urlPattern: /^\/mcp(\/|$)/,
            handler: 'NetworkOnly',
            method: 'POST',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      // /esm/icons/index.mjs only exports the icons statically, so no separate chunks are created
      '@tabler/icons-react': '@tabler/icons-react/dist/esm/icons/index.mjs',
    },
  },
  define: {
    APP_VERSION: JSON.stringify(process.env.npm_package_version),
  },
  test: {
    globals: true,
    environment: 'happy-dom',
  },
  base: '/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router'],
          'vendor-mantine': ['@mantine/core', '@mantine/dates', '@mantine/form', '@mantine/hooks'],
          'vendor-map': ['leaflet', 'react-leaflet'],
          'vendor-tiptap': ['@tiptap/react', '@tiptap/extension-image', '@tiptap/extension-link', '@tiptap/extension-youtube', '@mantine/tiptap'],
          data: ['src/data/airfields.json', 'src/data/activities.json'],
        },
      },
    },
  },
})
