import type { ResolvedOptions } from './types'

function getClientCode(importCode: string, options: ResolvedOptions) {
  const inheritDefaultLayout = options.inheritDefaultLayout ?? true
  const code = `
${importCode}
export const createGetRoutes = (router, withLayout = false) => {
  const routes = router.getRoutes()
  if (withLayout) {
      return routes
  }
  return () => routes.filter(route => !route.meta.isLayout)
}

export function setupLayouts(routes) {
  const inheritDefaultLayout = ${inheritDefaultLayout}
  
  function hasChildWithLayout(route) {
    if (!route.children || route.children.length === 0) {
      return false
    }
    return route.children.some(child => {
      // Check if child has layout in meta (before transformation)
      if (child.meta?.layout && child.meta.layout !== false) {
        return true
      }
      // Also check if child is already a layout route (after transformation)
      if (child.meta?.isLayout) {
        return true
      }
      return hasChildWithLayout(child)
    })
  }
  
  function deepSetupLayout(routes, top = true) {
    return routes.map(route => {
      // Check if child has layout before transforming children (only when inheritDefaultLayout is false)
      const childHasLayout = top && !inheritDefaultLayout && route.children?.length > 0 
        ? hasChildWithLayout(route) 
        : false
      
      if (route.children?.length > 0) {
        route.children = deepSetupLayout(route.children, false)
      }
      
      if (top) {
        // unplugin-vue-router adds a top-level route to the routing group, which we should skip.
        const skipLayout = !route.component && route.children?.find(r => (r.path === '' || r.path === '/') && r.meta?.isLayout)  

        if (skipLayout) {
          return route
        }

        if (route.meta?.layout !== false) {
          // If inheritDefaultLayout is true, always apply default layout (original behavior)
          // If inheritDefaultLayout is false, only apply if child doesn't have its own layout
          const shouldApplyDefaultLayout = inheritDefaultLayout || !childHasLayout
          
          if (shouldApplyDefaultLayout) {
            return { 
              path: route.path,
              component: layouts[route.meta?.layout || '${options.defaultLayout}'],
              children: route.path === '/' ? [route] : [{...route, path: ''}],
              meta: {
                isLayout: true
              }
            }
          }
        }
      }

      if (route.meta?.layout) {
        return { 
          path: route.path,
          component: layouts[route.meta?.layout],
          children: [ {...route, path: ''} ],
          meta: {
            isLayout: true
          }
        }
      }

      return route
    })
  }

    return deepSetupLayout(routes)

}
`
  return code
}

export default getClientCode
