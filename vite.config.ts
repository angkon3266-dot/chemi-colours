import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // PHP cannot run under the Vite dev server, so `npm run dev` talks to the
    // live API. Same-origin from the browser's view, so session cookies work.
    // NOTE: this means local development reads and writes PRODUCTION data.
    proxy: {
      '/api': {
        target: 'https://chemicolours.com',
        changeOrigin: true,
        secure: true,
      },
      '/uploads': {
        target: 'https://chemicolours.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
