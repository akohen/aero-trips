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
  test: {
    globals: true,
    environment: 'happy-dom',
  },
})
