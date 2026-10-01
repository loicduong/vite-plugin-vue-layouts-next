import type { Component } from 'vue'
import type { Router, RouteRecordRaw } from 'vue-router'
import { declaresLayout, readLayoutMeta } from './layoutMeta'

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
    if (declaresLayout(child.meta))
      return true
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

        if (readLayoutMeta(route.meta).name !== false) {
          const shouldApplyDefaultLayout = inheritDefaultLayout || !childHasLayout
          if (shouldApplyDefaultLayout)
            return wrap(route, true)
        }
      }

      if (declaresLayout(route.meta))
        return wrap(route, false)

      return route
    })
  }

  return (routes: readonly RouteRecordRaw[]): RouteRecordRaw[] => deepSetupLayout(routes as AnyRoute[])
}
