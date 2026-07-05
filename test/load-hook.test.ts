import type { Plugin } from 'vite'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
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

function getNormalizeLayoutName(code: string) {
  const start = code.indexOf('const REGEX_BACKSLASH')
  const end = code.indexOf('export const setupLayouts')

  expect(start).toBeGreaterThanOrEqual(0)
  expect(end).toBeGreaterThan(start)

  const helperCode = code.slice(start, end)
  return runInNewContext(`
    'use strict'
    ${helperCode}
    normalizeLayoutName
  `, Object.create(null)) as (file: string) => string
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

    it('normalizes client-side layout keys with Nuxt-compatible names', async () => {
      const plugin = ClientSideLayout({ layoutDir: 'src/layouts' }) as Plugin
      const load = getLoadFunction(plugin)
      expect(load).toBeTypeOf('function')

      const result = await load!(MODULE_ID_NULL) as { code: string }

      expect(result.code).toContain('function normalizeLayoutName(file)')
      expect(result.code).toContain('let key = normalizeLayoutName(name.replace("/src/layouts/", \'\'))')
      expect(result.code).not.toContain('let key = normalizeLayoutName(name.replace("/src/layouts/", \'\').replace(\'.vue\', \'\'))')
      expect(result.code).not.toContain('let key = name.replace("/src/layouts/", \'\').replace(\'.vue\', \'\')')
    })

    it('emits helper that normalizes representative layout paths', async () => {
      const plugin = ClientSideLayout({ layoutDir: 'src/layouts' }) as Plugin
      const load = getLoadFunction(plugin)
      expect(load).toBeTypeOf('function')

      const result = await load!(MODULE_ID_NULL) as { code: string }
      const normalizeLayoutName = getNormalizeLayoutName(result.code)

      expect(normalizeLayoutName('desktop/default.vue')).toBe('desktop-default')
      expect(normalizeLayoutName('desktop/index.vue')).toBe('desktop')
      expect(normalizeLayoutName('desktop/DesktopDefault.vue')).toBe('desktop-default')
      expect(normalizeLayoutName('sub/layoutsub.vue')).toBe('sub-layoutsub')
      expect(normalizeLayoutName('SomeOther/Thing/Index.vue')).toBe('some-other-thing')
      expect(normalizeLayoutName('thing/thing/thing.vue')).toBe('thing')
      expect(normalizeLayoutName('foo/foo/foo.vue')).toBe('foo')
      expect(normalizeLayoutName('APIClientLayout.vue')).toBe('api-client-layout')
      expect(normalizeLayoutName('ALink.vue')).toBe('a-link')
      expect(normalizeLayoutName('LMap.vue')).toBe('l-map')
      expect(normalizeLayoutName('URLParser.vue')).toBe('url-parser')
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
