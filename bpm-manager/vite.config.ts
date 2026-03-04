import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react()
  ],
  optimizeDeps: {
    exclude: ['@thatopen/components', '@thatopen/fragments', 'web-ifc']
  },
  define: {
    global: 'window'
  },
  server: {
    port: 5174,
  },
})
