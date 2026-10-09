import type { Plugin } from 'vite'
import { EventEmitter } from 'node:events'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Layout, { ClientSideLayout } from '../src/index'

// Each scan snapshots `disk` when it starts but only resolves when the test releases it,
// so the test decides in which order overlapping scans finish.
let disk: string[] = []
const pendingScans: Array<() => void> = []

function scan(): Promise<string[]> {
  const snapshot = [...disk]
  return new Promise(resolve => pendingScans.push(() => resolve(snapshot)))
}

vi.mock('../src/files', () => ({ getFilesFromPath: scan }))
vi.mock('fast-glob', () => ({ default: scan }))

let root: string

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'vue-layouts-order-'))
  disk = ['default.vue']
  pendingScans.length = 0
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

function startServer(plugin: Plugin) {
  ;(plugin.configResolved as (config: unknown) => void)({ root, logger: { warn: vi.fn() } })
  const watcher = Object.assign(new EventEmitter(), { add: vi.fn() })
  ;(plugin.configureServer as (server: unknown) => void)({
    watcher,
    moduleGraph: { getModuleById: vi.fn(), invalidateModule: vi.fn() },
    ws: { send: vi.fn() },
  })
  return watcher
}

async function releaseNewestFirst() {
  for (let i = 0; i < 10; i++) {
    await new Promise(resolve => setTimeout(resolve, 10))
    pendingScans.pop()?.()
  }
}

describe.each([
  ['plugin mode', () => Layout({ layoutsDirs: 'src/layouts', extensions: ['vue'], dts: true })],
  ['client-side mode', () => ClientSideLayout({ layoutsDirs: 'src/layouts', dts: true })],
])('overlapping regenerations in %s', (_, createPlugin) => {
  it('end with the layouts that exist after the last event', async () => {
    const watcher = startServer(createPlugin())
    const layouts = join(root, 'src', 'layouts')

    disk = ['default.vue', 'a.vue']
    watcher.emit('add', join(layouts, 'a.vue'))
    await new Promise(resolve => setTimeout(resolve, 10))
    disk = ['default.vue', 'a.vue', 'b.vue']
    watcher.emit('add', join(layouts, 'b.vue'))

    await releaseNewestFirst()

    await vi.waitFor(async () => {
      const code = await readFile(join(root, 'layouts.d.ts'), 'utf8')
      expect(code).toContain('"a": unknown')
      expect(code).toContain('"b": unknown')
    })
  })
})
