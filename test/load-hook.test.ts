import type { Plugin } from 'vite'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import { describe, expect, it } from 'vitest'
import Layout, { ClientSideLayout } from '../src/index'
import getClientCode from '../src/RouteLayout'
import type { ResolvedOptions } from '../src/types'

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

interface TestRoute {
  path: string
  component?: string
  name?: string
  meta?: {
    title?: string
    layout?: string | false
    isLayout?: boolean
  }
  children?: TestRoute[]
}

function findLayoutAncestors(routes: TestRoute[], targetLayout: string, ancestors: string[] = []): string[][] {
  const matches: string[][] = []
  for (const route of routes) {
    const nextAncestors = route.component ? [...ancestors, route.component] : ancestors
    if (route.component === targetLayout) {
      matches.push(ancestors)
    }
    const children = route.children ?? []
    if (children.length > 0) {
      matches.push(...findLayoutAncestors(children, targetLayout, nextAncestors))
    }
  }
  return matches
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

describe('setupLayouts nested layout behavior', () => {
  it('does not nest an explicit child layout inside the parent default layout', () => {
    const importCode = `
const layouts = {
  default: 'default-layout',
  special: 'special-layout',
}
`
    const options = {
      defaultLayout: 'default',
      inheritDefaultLayout: true,
    } as ResolvedOptions

    const code = getClientCode(importCode, options)
    const executable = code.replace(/^export\s+/gm, '')
    const sandbox: Record<string, unknown> = {}
    vm.runInNewContext(`${executable}; globalThis.__setupLayouts = setupLayouts`, sandbox)
    const setupLayouts = sandbox.__setupLayouts as (routes: TestRoute[]) => TestRoute[]

    const routes = [{
      path: '/config',
      children: [{
        path: '',
        children: [
          {
            path: '/config',
            name: 'config-config',
            meta: {
              title: 'Config Index',
            },
          },
          {
            path: 'add',
            children: [{
              path: '',
              name: 'config-add',
              meta: {
                layout: 'special',
              },
            }],
          },
        ],
      }],
    }]

    const transformed = setupLayouts(structuredClone(routes))
    const specialAncestors = findLayoutAncestors(transformed, 'special-layout')
    const defaultAncestors = findLayoutAncestors(transformed, 'default-layout')

    expect(defaultAncestors.length).toBeGreaterThan(0)
    expect(specialAncestors.length).toBeGreaterThan(0)
    expect(specialAncestors.some(path => path.includes('default-layout'))).toBe(false)
  })
})
