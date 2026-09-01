import vue from '@vitejs/plugin-vue'
import nimiq from '@nimiq/core/vite'
import { defineConfig } from 'vite'

const projectRoot = process.cwd().replaceAll('\\', '/')

export default defineConfig({
  plugins: [
    vue(),
    // This app only creates keys and signs basic transactions. Pointing at the
    // main WASM entry avoids bundling @nimiq/core's unused 7.7 MB full-node
    // worker, which also exceeds Cloudflare Static Assets' per-file limit.
    {
      name: 'nimiq-signing-only',
      enforce: 'pre',
      resolveId(source) {
        return source === '@nimiq/core'
          ? `${projectRoot}/node_modules/@nimiq/core/bundler/main-wasm/index.js`
          : null
      },
    },
    ...nimiq(),
  ],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:8787',
    },
  },
})
