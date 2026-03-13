import type { Plugin } from 'vite'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import Vue from '@vitejs/plugin-vue'
import { build } from 'vite'
import { describe, expect, it } from 'vitest'
import { ClientSideLayout } from '../src/index'

const fixturesRoot = resolve(fileURLToPath(import.meta.url), '..', 'fixtures')

describe('integration: minimal Vite build with plugin', () => {
  it('build completes successfully using ClientSideLayout', async () => {
    const root = resolve(fixturesRoot, 'build-app')
    const result = await build({
      root,
      logLevel: 'warn',
      plugins: [Vue(), ClientSideLayout({ layoutDir: 'src/layouts' })],
      build: {
        rollupOptions: {
          input: resolve(root, 'index.html'),
        },
      },
    })
    expect(result).toBeDefined()

    const plugin = ClientSideLayout({ layoutDir: 'src/layouts' }) as Plugin
    const load = plugin.load
    expect(typeof load === 'function' || typeof (load as any)?.handler === 'function').toBe(true)

    const resolvedLoad
      = typeof load === 'function'
        ? load
        : (load as { handler: (id: string) => unknown }).handler

    const loadFn = resolvedLoad as (id: string) => Promise<{ code: string } | undefined> | { code: string } | undefined
    const virtual = await loadFn('\0virtual:generated-layouts') as { code: string }
    expect(virtual).toBeDefined()
    expect(typeof virtual.code).toBe('string')
    expect(virtual.code).toContain('"/src/layouts/**/*.vue"')
  }, 30000)
})
