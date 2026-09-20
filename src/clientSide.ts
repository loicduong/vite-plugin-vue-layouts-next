import { posix } from 'node:path'
import { RUNTIME_ID } from './RouteLayout'

function normalizePath(path: string) {
  path = path.startsWith('/') ? path : `/${path}`
  return posix.normalize(path)
}

interface VirtualModuleCodeOptions {
  layoutDir: string
  defaultLayout: string
  importMode: 'sync' | 'async'
  inheritDefaultLayout?: boolean
}

export async function createVirtualModuleCode(options: VirtualModuleCodeOptions) {
  const { layoutDir, defaultLayout, importMode, inheritDefaultLayout = true } = options
  const normalizedTarget = normalizePath(layoutDir)
  const isSync = importMode === 'sync'

  return `
import { createGetRoutes, createLayoutWrapper, createSetupLayouts, normalizeLayoutName, setPageLayout, useLayout } from '${RUNTIME_ID}'
export { createGetRoutes, setPageLayout, useLayout }

const modules = import.meta.glob("${normalizedTarget}/**/*.vue", { eager: ${isSync} })

export const layouts = {}
Object.entries(modules).forEach(([name, module]) => {
  const key = normalizeLayoutName(name.replace("${normalizedTarget}/", ''))
  layouts[key] = ${isSync ? 'module.default' : 'module'}
})

const LayoutWrapper = createLayoutWrapper(layouts, '${defaultLayout}')
export const setupLayouts = createSetupLayouts(LayoutWrapper, { inheritDefaultLayout: ${inheritDefaultLayout} })
`
}
