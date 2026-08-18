import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import carbon8r from 'vite-plugin-carbon8r'

export default defineConfig({
  plugins: [react(), carbon8r()],
  server: {
    port: 5173,
    strictPort: true
  }
})
