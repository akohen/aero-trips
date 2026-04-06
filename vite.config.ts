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
        globIgnores: ['**/sitemap.xml', '**/robots.txt'],
        navigateFallbackDenylist: [
          /^\/sitemap\.xml$/,
          /^\/robots\.txt$/,
          /__/,
        ],
        runtimeCaching: [
          {
            urlPattern: /^\/(sitemap\.xml|robots\.txt)$/,
            handler: 'NetworkOnly',
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
          'vendor-mantine': ['@mantine/core', '@mantine/dates', '@mantine/form', '@mantine/hooks', '@mantine/tiptap'],
          'vendor-map': ['leaflet', 'react-leaflet'],
          'vendor-tiptap': ['@tiptap/react', '@tiptap/extension-image', '@tiptap/extension-link', '@tiptap/extension-youtube'],
          data: ['src/data/airfields.json', 'src/data/activities.json'],
        },
      },
    },
  },
})
