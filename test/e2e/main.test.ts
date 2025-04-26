import { setupLayouts } from 'virtual:generated-layouts'
import { it } from 'vitest'
import { routes as routesContext } from 'vue-router/auto-routes'
import { sanitizeRouteComponentPaths } from './utils.js'

interface MyFixtures {
  runName: string
}
const myTest = it.extend<MyFixtures>({
  runName: [
    // default value if "url" is not defined in the config
    'default',
    // mark the fixture as "injected" to allow the override
    { injected: true },
  ],
})
myTest('Testing configuration', async ({ expect, runName }) => {
  const routes = routesContext
  const layoutRoutes = setupLayouts(routes)
  expect(layoutRoutes).toBeDefined()
  expect(routes).toBeDefined()
  if (runName.startsWith('wrap-')) {
    await expect(sanitizeRouteComponentPaths(layoutRoutes)).toMatchFileSnapshot(
      `__snapshots__/${runName}.layoutRoutes.ts`,
    )
    await expect(sanitizeRouteComponentPaths(routes)).toMatchFileSnapshot(`__snapshots__/${runName}.routes.ts`)
  }
})
