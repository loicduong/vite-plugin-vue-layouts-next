import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts', 'test/integration.test.ts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, 'src'),
      'vite-plugin-vue-layouts-next/runtime': resolve(import.meta.dirname, 'src/runtime/index.ts'),
    },
  },
})
