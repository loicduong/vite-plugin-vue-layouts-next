import type { ResolvedOptions } from './types'

export const RUNTIME_ID = 'vite-plugin-vue-layouts-next/runtime'

function getClientCode(importCode: string, options: ResolvedOptions) {
  const inheritDefaultLayout = options.inheritDefaultLayout ?? true

  return `
import { createGetRoutes, createLayoutWrapper, createSetupLayouts, lazyLayout, setPageLayout, useLayout } from '${RUNTIME_ID}'
export { createGetRoutes, setPageLayout, useLayout }
${importCode}
const LayoutWrapper = createLayoutWrapper(layouts, '${options.defaultLayout}')
export const setupLayouts = createSetupLayouts(LayoutWrapper, { inheritDefaultLayout: ${inheritDefaultLayout} })
`
}

export default getClientCode
