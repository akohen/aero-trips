/// <reference types="vitest" />
import { defineConfig } from 'vite'
//import { VitePWA } from 'vite-plugin-pwa'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    //VitePWA({ registerType: 'autoUpdate', devOptions: { enabled: false } }),
  ],
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
          data: ['src/data/airfields.json', 'src/data/activities.json'],
        },
      },
    },
  },
})
