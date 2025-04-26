import type { ResolvedOptions } from './types'
import { returnLayoutComponent, returnLayoutRoute } from './layoutReturn.js'
import { addIndentation } from './utils.js'

function getClientCode(importCode: string, options: ResolvedOptions) {
  const code = /* js */`
${importCode}
export const createGetRoutes = (router, withLayout = false) => {
  const routes = router.getRoutes()
  if (withLayout) {
      return routes
  }
  return () => routes.filter(route => !route.meta.isLayout)
}

export function setupLayouts(routes) {
  function deepSetupLayout(routes, top = true) {
    return routes.map(route => {
      if (route.children?.length > 0) {
        route.children = deepSetupLayout(route.children, false)
      }
      
      const layout = route.meta?.layout ?? '${options.defaultLayout}'

      const skipLayout = top
        && !route.component
        && route.children?.find(r => (r.path === '' || r.path === '/') && r.meta?.isLayout);

      if (skipLayout) {
        return route
      }
          
      if (layout && layouts[layout]) {
        ${addIndentation(options.wrapComponent ? returnLayoutComponent : returnLayoutRoute, 8)}
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
