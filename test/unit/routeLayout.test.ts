import type { ResolvedConfig } from 'vite'
import { describe, expect, it } from 'vitest'
import { resolveOptions } from '../../src/defaults.js'
import { generateLayouts } from '../../src/generateLayouts.js'
import { resolveDirs } from '../../src/utils.js'

/* describe('virtual module utilities', () => {
}) */

describe('createVirtualModuleCode', async () => {
  const root = './'
  const layoutsDirs = './layouts'
  const rConfig = { root } as ResolvedConfig

  it('generates code with default layout', async () => {
    const code = await generateLayouts(resolveDirs([
      './layouts',
    ], root), resolveOptions({
      layoutsDirs,
      defaultLayout: 'default',
      importMode: () => 'sync',
      // skipTopLevelRouteLayout: false,
      wrapComponent: false,
    }), rConfig)

    expect(code).toMatchSnapshot()
  })

  it('generates code with wrapped components', async () => {
    const code = await generateLayouts(resolveDirs([
      './layouts',
    ], root), resolveOptions({
      layoutsDirs,
      defaultLayout: 'default',
      importMode: () => 'async',
      // skipTopLevelRouteLayout: false,
      wrapComponent: true,
    }), rConfig)

    expect(code).toMatchSnapshot()
  })

  it('generates code with top level route layout skipping', async () => {
    const code = await generateLayouts(resolveDirs([
      './layouts',
    ], root), resolveOptions({
      layoutsDirs,
      defaultLayout: 'default',
      importMode: () => 'sync',
      // skipTopLevelRouteLayout: true,
      wrapComponent: false,
    }), rConfig)

    expect(code).toMatchSnapshot()
  })
})
