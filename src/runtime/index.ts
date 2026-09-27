import type { LayoutMeta, LayoutProps } from './layoutMeta'

export { normalizeLayoutName } from '../layoutName'
export type { LayoutMeta, LayoutName, LayoutOptions, LayoutProps } from './layoutMeta'
export { createGetRoutes, createSetupLayouts } from './setupLayouts'
export type { SetupLayoutsOptions } from './setupLayouts'
export { createLayoutWrapper, lazyLayout, setPageLayout, useLayout } from './wrapper'
export type { LayoutMap, LazyLayout } from './wrapper'

declare module 'vue-router' {
  interface RouteMeta {
    /**
     * Layout name for this page, `false` to render without a layout, or
     * `{ name, props }` to also pass props to the layout component.
     */
    layout?: LayoutMeta
    /** Props for the layout component; `layout.props` in the object form wins over this. */
    layoutProps?: LayoutProps
    /** Set on the generated parent routes created by `setupLayouts`. */
    isLayout?: boolean
  }
}
