import type { Plugin } from 'vite'
import { EventEmitter } from 'node:events'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Layout, { ClientSideLayout } from '../src/index'

const SFC = '<template><slot /></template>\n'

let root: string

async function createProject() {
  const layouts = join(root, 'src', 'layouts')
  await mkdir(join(layouts, 'sub'), { recursive: true })
  await mkdir(join(layouts, 'admin'), { recursive: true })
  await mkdir(join(layouts, 'drafts'), { recursive: true })
  await writeFile(join(layouts, 'default.vue'), SFC)
  await writeFile(join(layouts, 'sub', 'layoutSub.vue'), SFC)
  await writeFile(join(layouts, 'admin', 'index.vue'), SFC)
  await writeFile(join(layouts, 'drafts', 'wip.vue'), SFC)
  return layouts
}

function setup(plugin: Plugin) {
  const logger = { warn: vi.fn() }
  ;(plugin.configResolved as (config: unknown) => void)({ root, logger })
  return logger
}

function buildStart(plugin: Plugin) {
  return (plugin.buildStart as () => Promise<void>)()
}

function createServer(plugin: Plugin) {
  const watcher = Object.assign(new EventEmitter(), { add: vi.fn() })
  ;(plugin.configureServer as (server: unknown) => void)({
    watcher,
    moduleGraph: { getModuleById: vi.fn(), invalidateModule: vi.fn() },
    ws: { send: vi.fn() },
  })
  return watcher
}

function readDts(path = join(root, 'layouts.d.ts')) {
  return readFile(path, 'utf8')
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'vue-layouts-plugin-'))
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('dts in plugin mode', () => {
  // `extensions` keeps `Layout()` from switching to the client-side variant.
  const options = { layoutsDirs: 'src/layouts', extensions: ['vue'], exclude: ['**/drafts/**'] }

  it('writes runtime-normalized names on buildStart and honors exclude', async () => {
    await createProject()
    const plugin = Layout({ ...options, dts: true })
    setup(plugin)
    await buildStart(plugin)

    const code = await readDts()
    expect(code).toContain('"default": unknown')
    expect(code).toContain('"sub-layout-sub": unknown')
    expect(code).toContain('"admin": unknown')
    expect(code).not.toContain('drafts')
  })

  it('writes to a custom path in a missing directory', async () => {
    await createProject()
    const plugin = Layout({ ...options, dts: 'types/layouts.d.ts' })
    setup(plugin)
    await buildStart(plugin)

    expect(await readDts(join(root, 'types', 'layouts.d.ts'))).toContain('"default": unknown')
  })

  it('writes nothing without the option', async () => {
    await createProject()
    const plugin = Layout(options)
    setup(plugin)
    await buildStart(plugin)

    expect(existsSync(join(root, 'layouts.d.ts'))).toBe(false)
  })

  it('regenerates on add and unlink, not on change', async () => {
    const layouts = await createProject()
    const plugin = Layout({ ...options, dts: true })
    setup(plugin)
    await buildStart(plugin)
    const watcher = createServer(plugin)

    const added = join(layouts, 'focus.vue')
    await writeFile(added, SFC)
    watcher.emit('add', added)
    await vi.waitFor(async () => expect(await readDts()).toContain('"focus": unknown'))

    await rm(added)
    watcher.emit('unlink', added)
    await vi.waitFor(async () => expect(await readDts()).not.toContain('"focus"'))

    await rm(join(root, 'layouts.d.ts'))
    watcher.emit('change', join(layouts, 'default.vue'))
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(existsSync(join(root, 'layouts.d.ts'))).toBe(false)
  })
})

describe('dts in client-side mode', () => {
  it('writes runtime-normalized names on buildStart', async () => {
    await createProject()
    const plugin = ClientSideLayout({ layoutsDirs: 'src/layouts', dts: true })
    setup(plugin)
    await buildStart(plugin)

    const code = await readDts()
    expect(code).toContain('"default": unknown')
    expect(code).toContain('"sub-layout-sub": unknown')
    expect(code).toContain('"admin": unknown')
  })

  it('skips node_modules like import.meta.glob does', async () => {
    const layouts = await createProject()
    await mkdir(join(layouts, 'vendor', 'node_modules', 'pkg'), { recursive: true })
    await writeFile(join(layouts, 'vendor', 'node_modules', 'pkg', 'leaked.vue'), SFC)
    const plugin = ClientSideLayout({ layoutsDirs: 'src/layouts', dts: true })
    setup(plugin)
    await buildStart(plugin)

    const code = await readDts()
    expect(code).toContain('"default": unknown')
    expect(code).not.toContain('leaked')
  })

  it('resolves a root-relative layoutsDirs under the Vite root', async () => {
    await createProject()
    const plugin = ClientSideLayout({ layoutsDirs: '/src/layouts', dts: true })
    setup(plugin)
    await buildStart(plugin)

    expect(await readDts()).toContain('"default": unknown')
  })

  it('writes nothing without the option', async () => {
    await createProject()
    const plugin = ClientSideLayout({ layoutsDirs: 'src/layouts' })
    setup(plugin)
    await buildStart(plugin)

    expect(existsSync(join(root, 'layouts.d.ts'))).toBe(false)
  })

  it('regenerates on add and unlink, not on change', async () => {
    const layouts = await createProject()
    const plugin = ClientSideLayout({ layoutsDirs: 'src/layouts', dts: true })
    setup(plugin)
    await buildStart(plugin)
    const watcher = createServer(plugin)

    const added = join(layouts, 'focus.vue')
    await writeFile(added, SFC)
    watcher.emit('add', added)
    await vi.waitFor(async () => expect(await readDts()).toContain('"focus": unknown'))

    await rm(added)
    watcher.emit('unlink', added)
    await vi.waitFor(async () => expect(await readDts()).not.toContain('"focus"'))

    await rm(join(root, 'layouts.d.ts'))
    watcher.emit('change', join(layouts, 'default.vue'))
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(existsSync(join(root, 'layouts.d.ts'))).toBe(false)
  })

  it('keeps Layout() on the client-side variant when dts is set', async () => {
    const plugin = Layout({ layoutsDirs: 'src/layouts', dts: true })
    const result = await (plugin.load as (id: string) => Promise<{ code: string }>)('\0virtual:generated-layouts')
    expect(result.code).toContain('import.meta.glob("/src/layouts/**/*.vue"')
  })
})
