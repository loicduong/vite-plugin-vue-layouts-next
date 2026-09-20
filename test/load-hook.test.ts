import type { Plugin } from 'vite'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import Layout, { ClientSideLayout } from '../src/index'

const MODULE_ID_VIRTUAL = '/@vite-plugin-vue-layouts-next/generated-layouts'
const MODULE_ID_NULL = '\0virtual:generated-layouts'

const fixturesRoot = resolve(fileURLToPath(import.meta.url), '..', 'fixtures')

function getLoadFunction(plugin: Plugin) {
  const hook = plugin.load
  if (!hook)
    return undefined

  if (typeof hook === 'function')
    return hook as (id: string) => unknown | Promise<unknown>

  const maybeHandler = (hook as { handler?: unknown }).handler
  if (typeof maybeHandler === 'function')
    return maybeHandler as (id: string) => unknown | Promise<unknown>

  return undefined
}

function assertLoadReturnShape(result: unknown) {
  expect(result).not.toBeNull()
  expect(typeof result).toBe('object')
  const obj = result as Record<string, unknown>
  expect(Object.keys(obj)).toEqual(['code', 'moduleType'])
  expect(typeof obj.code).toBe('string')
  expect(obj.moduleType).toBe('js')
}

describe('load hook return shape', () => {
  describe('clientSideLayout', () => {
    it('returns object with code (string) and moduleType === "js" only', async () => {
      const plugin = ClientSideLayout({ layoutDir: 'src/layouts' }) as Plugin
      const load = getLoadFunction(plugin)
      expect(load).toBeTypeOf('function')
      const result = await load!(MODULE_ID_NULL)
      assertLoadReturnShape(result)
    })

    it('returns undefined for other module ids', async () => {
      const plugin = ClientSideLayout() as Plugin
      const load = getLoadFunction(plugin)
      expect(load).toBeTypeOf('function')
      expect(await load!('other-id')).toBeUndefined()
    })

    it('builds the layouts map with normalizeLayoutName from the runtime', async () => {
      const plugin = ClientSideLayout({ layoutDir: 'src/layouts', defaultLayout: 'main', inheritDefaultLayout: false }) as Plugin
      const load = getLoadFunction(plugin)
      const result = await load!(MODULE_ID_NULL) as { code: string }

      expect(result.code).toContain('from \'vite-plugin-vue-layouts-next/runtime\'')
      expect(result.code).toContain('export { createGetRoutes, setPageLayout, useLayout }')
      expect(result.code).toContain('import.meta.glob("/src/layouts/**/*.vue", { eager: false })')
      expect(result.code).toContain('normalizeLayoutName(name.replace("/src/layouts/", \'\'))')
      expect(result.code).toContain('const LayoutWrapper = createLayoutWrapper(layouts, \'main\')')
      expect(result.code).toContain('export const setupLayouts = createSetupLayouts(LayoutWrapper, { inheritDefaultLayout: false })')
      expect(result.code).toContain('lazyLayout')
      expect(result.code).not.toContain('function normalizeLayoutName(file)')
      expect(result.code).not.toContain('function deepSetupLayout')
    })

    it('uses eager glob and module.default in sync mode', async () => {
      const plugin = ClientSideLayout({ layoutDir: 'src/layouts', importMode: 'sync' }) as Plugin
      const load = getLoadFunction(plugin)
      const result = await load!(MODULE_ID_NULL) as { code: string }
      expect(result.code).toContain('{ eager: true }')
      expect(result.code).toContain('layouts[key] = module.default')
    })

    it('uses lazy glob and lazyLayout(module) in async mode', async () => {
      const plugin = ClientSideLayout({ layoutDir: 'src/layouts' }) as Plugin
      const load = getLoadFunction(plugin)
      const result = await load!(MODULE_ID_NULL) as { code: string }
      expect(result.code).toContain('{ eager: false }')
      expect(result.code).toContain('layouts[key] = lazyLayout(module)')
      expect(result.code).toContain('lazyLayout')
    })
  })

  describe('layout (server/resolved)', () => {
    it('returns object with code (string) and moduleType === "js" only', async () => {
      const plugin = Layout({
        layoutsDirs: resolve(fixturesRoot, 'layouts'),
        extensions: ['vue'],
      }) as Plugin & { configResolved: (config: { root: string }) => void }
      const mockConfig = { root: fixturesRoot }
      plugin.configResolved!(mockConfig)
      const load = getLoadFunction(plugin)
      expect(load).toBeTypeOf('function')
      const result = await load!(MODULE_ID_VIRTUAL)
      assertLoadReturnShape(result)
    })

    it('returns undefined for other module ids', async () => {
      const plugin = Layout({
        layoutsDirs: resolve(fixturesRoot, 'layouts'),
        extensions: ['vue'],
      }) as Plugin & { configResolved: (config: { root: string }) => void }
      plugin.configResolved!({ root: fixturesRoot })
      const load = getLoadFunction(plugin)
      expect(load).toBeTypeOf('function')
      expect(await load!('other-id')).toBeUndefined()
    })

    it('wires the runtime wrapper into the generated module', async () => {
      const plugin = Layout({
        layoutsDirs: resolve(fixturesRoot, 'layouts'),
        extensions: ['vue'],
        defaultLayout: 'main',
        inheritDefaultLayout: false,
      }) as Plugin & { configResolved: (config: { root: string }) => void }
      plugin.configResolved!({ root: fixturesRoot })
      const load = getLoadFunction(plugin)
      const result = await load!(MODULE_ID_VIRTUAL) as { code: string }

      expect(result.code).toContain('from \'vite-plugin-vue-layouts-next/runtime\'')
      expect(result.code).toContain('export { createGetRoutes, setPageLayout, useLayout }')
      expect(result.code).toContain('const LayoutWrapper = createLayoutWrapper(layouts, \'main\')')
      expect(result.code).toContain('export const setupLayouts = createSetupLayouts(LayoutWrapper, { inheritDefaultLayout: false })')
      expect(result.code).toContain('lazyLayout')
      expect(result.code).not.toContain('function deepSetupLayout')
    })
  })
})

describe('dev server watcher', () => {
  it('invalidates generated layouts only for layout file changes', () => {
    const plugin = Layout({
      layoutsDirs: resolve(fixturesRoot, 'layouts'),
      extensions: ['vue'],
    }) as Plugin & {
      configResolved: (config: { root: string }) => void
      configureServer: (server: unknown) => void
    }

    plugin.configResolved!({ root: fixturesRoot })

    const handlers = new Map<string, (path: string) => void>()
    const invalidateModule = vi.fn()
    const send = vi.fn()
    const layoutModule = {}
    const server = {
      watcher: {
        add: vi.fn(),
        on: vi.fn((event: string, handler: (path: string) => void) => {
          handlers.set(event, handler)
        }),
      },
      moduleGraph: {
        getModuleById: vi.fn(() => layoutModule),
        invalidateModule,
      },
      ws: { send },
    }

    plugin.configureServer!(server)

    handlers.get('change')!(resolve(fixturesRoot, 'src/pages/index.vue'))
    expect(invalidateModule).not.toHaveBeenCalled()
    expect(send).not.toHaveBeenCalled()

    handlers.get('change')!(resolve(fixturesRoot, 'layouts/default.vue'))
    expect(invalidateModule).toHaveBeenCalledWith(layoutModule)
    expect(send).toHaveBeenCalledWith({
      path: '*',
      type: 'full-reload',
    })
  })
})
