import vue from '@vitejs/plugin-vue'
import nimiq from '@nimiq/core/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue(), ...nimiq()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:8787',
    },
  },
})
