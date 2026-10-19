import { resolve } from 'node:path'
import process from 'node:process'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import Layouts from 'vite-plugin-vue-layouts-next'

// ABSOLUTE=1 passes an absolute layoutsDirs, to compare against the relative default.
const layoutsDirs = process.env.ABSOLUTE ? resolve(import.meta.dirname, 'src/layouts') : 'src/layouts'

export default defineConfig({
  plugins: [
    vue(),
    Layouts({ layoutsDirs, importMode: () => 'async' }),
    {
      name: 'log-watcher',
      configureServer(server) {
        server.watcher.on('change', file => console.log('[watcher] change', file))
      },
    },
  ],
})
