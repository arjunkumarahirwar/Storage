import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The dev/preview servers bind to 0.0.0.0 so the sandbox can expose a live
// preview, and allowedHosts is open so proxied preview hosts work.
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: true,
  },
})
