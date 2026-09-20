declare module 'virtual:generated-layouts' {
  import type { LayoutMap, LayoutName } from 'vite-plugin-vue-layouts-next/runtime'
  import type { Router, RouteRecordRaw } from 'vue-router'

  export const layouts: LayoutMap
  // need any here due to different types for vue-router versions
  export function createGetRoutes(router: Router | any, withLayout?: boolean): () => RouteRecordRaw[]
  export function setupLayouts(routes: readonly RouteRecordRaw[]): RouteRecordRaw[]
  export function setPageLayout(name: LayoutName): void
  export function useLayout(): import('vue').ComputedRef<LayoutName>
}
