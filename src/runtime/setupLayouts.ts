import type { Component } from 'vue'
import type { Router, RouteRecordRaw } from 'vue-router'

export interface SetupLayoutsOptions {
  inheritDefaultLayout: boolean
}

type AnyRoute = RouteRecordRaw & { children?: AnyRoute[] }

/**
 * Same signature as before: without `withLayout` it returns a getter that hides
 * generated layout routes; with `withLayout` it returns the raw array.
 */
export function createGetRoutes(router: Router, withLayout: true): RouteRecordRaw[]
export function createGetRoutes(router: Router, withLayout?: false): () => RouteRecordRaw[]
export function createGetRoutes(router: Router, withLayout = false): RouteRecordRaw[] | (() => RouteRecordRaw[]) {
  const routes = router.getRoutes()
  if (withLayout)
    return routes

  return () => routes.filter(route => !route.meta.isLayout)
}

function hasChildWithLayout(route: AnyRoute): boolean {
  if (!route.children || route.children.length === 0)
    return false

  return route.children.some((child) => {
    // Check if child has layout in meta (before transformation)
    if (child.meta?.layout)
      return true
    // Also check if child is already a layout route (after transformation)
    if (child.meta?.isLayout)
      return true
    return hasChildWithLayout(child)
  })
}

export function createSetupLayouts(wrapper: Component, options: SetupLayoutsOptions) {
  const { inheritDefaultLayout } = options

  function wrap(route: AnyRoute, keepRootPath: boolean): AnyRoute {
    return {
      path: route.path,
      component: wrapper,
      children: keepRootPath && route.path === '/' ? [route] : [{ ...route, path: '' }],
      meta: { isLayout: true },
    } as AnyRoute
  }

  function deepSetupLayout(routes: readonly AnyRoute[], top = true): AnyRoute[] {
    return routes.map((route) => {
      // Check if child has layout before transforming children (only when inheritDefaultLayout is false)
      const childHasLayout = top && !inheritDefaultLayout && (route.children?.length ?? 0) > 0
        ? hasChildWithLayout(route)
        : false

      if (route.children && route.children.length > 0)
        route.children = deepSetupLayout(route.children, false)

      if (top) {
        // auto-routes adds a top-level route to the routing group, which we should skip.
        const skipLayout = !route.component
          && route.children?.find(r => (r.path === '' || r.path === '/') && r.meta?.isLayout)

        if (skipLayout)
          return route

        if (route.meta?.layout !== false) {
          // If inheritDefaultLayout is true, always apply default layout (original behavior)
          // If inheritDefaultLayout is false, only apply if child doesn't have its own layout
          const shouldApplyDefaultLayout = inheritDefaultLayout || !childHasLayout
          if (shouldApplyDefaultLayout)
            return wrap(route, true)
        }
      }

      if (route.meta?.layout)
        return wrap(route, false)

      return route
    })
  }

  return (routes: readonly RouteRecordRaw[]): RouteRecordRaw[] => deepSetupLayout(routes as AnyRoute[])
}
