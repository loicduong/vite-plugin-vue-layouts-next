import { posix } from 'node:path'

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

async function createVirtualGlob(
  target: string,
  isSync: boolean,
) {
  const g = `"${target}/**/*.vue"`
  return `import.meta.glob(${g}, { eager: ${isSync} })`
}

export async function createVirtualModuleCode(
  options: VirtualModuleCodeOptions,
) {
  const { layoutDir, defaultLayout, importMode, inheritDefaultLayout = true } = options

  const normalizedTarget = normalizePath(layoutDir)

  const isSync = importMode === 'sync'

  return `
  export const createGetRoutes = (router, withLayout = false) => {
      const routes = router.getRoutes()
      if (withLayout) {
          return routes
      }
      return () => routes.filter(route => !route.meta.isLayout)
  }
  
  export const setupLayouts = routes => {
      const layouts = Object.create(null)
      const inheritDefaultLayout = ${inheritDefaultLayout}
  
      const modules = ${await createVirtualGlob(
        normalizedTarget,
        isSync,
      )}
    
      const layoutsDirPrefix = "${normalizedTarget}/"
      for (const modulePath in modules) {
          const loadedModule = modules[modulePath]
          const key = modulePath.startsWith(layoutsDirPrefix)
            ? modulePath.slice(layoutsDirPrefix.length, modulePath.length - 4)
            : modulePath.replace(layoutsDirPrefix, '').replace('.vue', '')
          layouts[key] = ${isSync ? 'loadedModule.default' : 'loadedModule'}
      }
      
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
            // Check if child has its own layout and inheritDefaultLayout is false
            const shouldApplyDefaultLayout = inheritDefaultLayout || !childHasLayout
            
            if (shouldApplyDefaultLayout) {
              return { 
                path: route.path,
                component: layouts[route.meta?.layout || '${defaultLayout}'],
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
  }`
}
