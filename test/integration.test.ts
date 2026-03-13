import { describe, expect, it } from 'vitest'
import { build } from 'vite'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ClientSideLayout } from '../src/index'

const fixturesRoot = resolve(fileURLToPath(import.meta.url), '..', 'fixtures')

describe('integration: minimal Vite build with plugin', () => {
  it('build completes successfully using ClientSideLayout', async () => {
    const root = resolve(fixturesRoot, 'build-app')
    const result = await build({
      root,
      logLevel: 'warn',
      plugins: [ClientSideLayout({ layoutDir: 'src/layouts' })],
      build: {
        rollupOptions: {
          input: resolve(root, 'index.html'),
        },
      },
    })
    expect(result).toBeDefined()
  }, 30000)
})
