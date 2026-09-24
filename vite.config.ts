import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({ 
      registerType: 'autoUpdate', 
      devOptions: { enabled: false },
      workbox: {
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
