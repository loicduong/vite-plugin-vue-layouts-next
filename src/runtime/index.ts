export { normalizeLayoutName } from '../layoutName'
export { createGetRoutes, createSetupLayouts } from './setupLayouts'
export type { SetupLayoutsOptions } from './setupLayouts'
export { createLayoutWrapper, setPageLayout, useLayout } from './wrapper'
export type { LayoutMap, LayoutName } from './wrapper'

declare module 'vue-router' {
  interface RouteMeta {
    /** Layout name for this page, or `false` to render without a layout. */
    layout?: string | false
    /** Set on the generated parent routes created by `setupLayouts`. */
    isLayout?: boolean
  }
}
