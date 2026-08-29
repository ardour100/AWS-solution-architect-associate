import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Dev only: forward API calls to the local backend (docker compose, :8080).
    // In production, nginx does the same proxying.
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
