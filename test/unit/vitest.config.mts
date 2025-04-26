import process from 'node:process'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  root: process.cwd(),
  test: {
    open: false,
    include: ['./**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/generated/**', '**/__snapshots__/**'],
  },
})
