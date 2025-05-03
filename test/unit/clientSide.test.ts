import { describe, expect, it } from 'vitest'
import { createVirtualModuleCode } from '../../src/clientSide.js'

/* describe('virtual module utilities', () => {
}) */

describe('createVirtualModuleCode', () => {
  it('generates code with default layout', async () => {
    const code = await createVirtualModuleCode({
      layoutDir: './layouts',
      defaultLayout: 'default',
      importMode: 'sync',
      // skipTopLevelRouteLayout: false,
      wrapComponent: false,
    })

    expect(code).toMatchSnapshot()
  })

  it('generates code with wrapped components', async () => {
    const code = await createVirtualModuleCode({
      layoutDir: './layouts',
      defaultLayout: 'default',
      importMode: 'async',
      // skipTopLevelRouteLayout: false,
      wrapComponent: true,
    })

    expect(code).toMatchSnapshot()
  })

  it('generates code with top level route layout skipping', async () => {
    const code = await createVirtualModuleCode({
      layoutDir: './layouts',
      defaultLayout: 'default',
      importMode: 'sync',
      // skipTopLevelRouteLayout: true,
      wrapComponent: false,
    })

    expect(code).toMatchSnapshot()
  })
})
