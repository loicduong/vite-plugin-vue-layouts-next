import type { Plugin } from 'vite'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
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
  })

  describe('layout (server/resolved)', () => {
    it('returns object with code (string) and moduleType === "js" only', async () => {
      const plugin = Layout({
        layoutsDirs: resolve(fixturesRoot, 'layouts'),
        pagesDirs: resolve(fixturesRoot, 'pages'),
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
        pagesDirs: resolve(fixturesRoot, 'pages'),
      }) as Plugin & { configResolved: (config: { root: string }) => void }
      plugin.configResolved!({ root: fixturesRoot })
      const load = getLoadFunction(plugin)
      expect(load).toBeTypeOf('function')
      expect(await load!('other-id')).toBeUndefined()
    })
  })
})
