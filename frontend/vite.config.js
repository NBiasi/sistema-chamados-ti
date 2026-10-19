import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    watch: {
      usePolling: true, // Deteta alterações do Windows no Docker
    },
    hmr: {
      clientPort: 3000, // Sincroniza o WebSocket do HMR
    },
  },
})