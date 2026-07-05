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

  const REGEX_BACKSLASH = /\\\\/g
  const REGEX_SEPARATORS = /[-_/.\\s]+/g
  const REGEX_NON_ALPHANUMERIC = /[^a-z0-9-]+/gi
  const REGEX_REPEATED_DASH = /-+/g
  const REGEX_EDGE_DASH = /^-|-$/g
  const REGEX_NUMBER = /\\d/

  function isUppercase(char = '') {
    if (REGEX_NUMBER.test(char))
      return undefined

    return char !== char.toLowerCase()
  }

  function splitByCase(value) {
    const parts = []
    let buffer = ''
    let previousUpper
    let previousSplitter

    for (const char of value) {
      const isSplitter = REGEX_SEPARATORS.test(char)
      REGEX_SEPARATORS.lastIndex = 0

      if (isSplitter) {
        if (buffer)
          parts.push(buffer)
        buffer = ''
        previousUpper = undefined
        previousSplitter = true
        continue
      }

      const isUpper = isUppercase(char)

      if (previousSplitter === false) {
        if (previousUpper === false && isUpper === true) {
          if (buffer)
            parts.push(buffer)
          buffer = char
          previousUpper = isUpper
          continue
        }

        if (previousUpper === true && isUpper === false && buffer.length > 1) {
          const lastChar = buffer.at(-1)
          parts.push(buffer.slice(0, -1))
          buffer = lastChar + char
          previousUpper = isUpper
          continue
        }
      }

      buffer += char
      previousUpper = isUpper
      previousSplitter = false
    }

    if (buffer)
      parts.push(buffer)

    return parts
  }

  function kebabCaseSegment(value) {
    return splitByCase(value)
      .join('-')
      .replace(REGEX_NON_ALPHANUMERIC, '-')
      .replace(REGEX_REPEATED_DASH, '-')
      .replace(REGEX_EDGE_DASH, '')
      .toLowerCase()
  }

  function kebabCaseSegments(segments) {
    return segments
      .map(segment => segment.toLowerCase())
      .join('-')
      .replace(REGEX_NON_ALPHANUMERIC, '-')
      .replace(REGEX_REPEATED_DASH, '-')
      .replace(REGEX_EDGE_DASH, '')
  }

  function resolveLayoutNameSegments(fileName, prefixParts) {
    const fileNameParts = splitByCase(fileName)
    const fileNamePartsContent = fileNameParts.join('/').toLowerCase()
    const layoutNameParts = prefixParts.flatMap(part => splitByCase(part))
    const matchedSuffix = []
    let index = prefixParts.length - 1

    while (index >= 0) {
      const prefixPart = prefixParts[index]
      matchedSuffix.unshift(...splitByCase(prefixPart).map(part => part.toLowerCase()))
      const matchedSuffixContent = matchedSuffix.join('/')

      if (
        fileNamePartsContent === matchedSuffixContent
        || fileNamePartsContent.startsWith(\`\${matchedSuffixContent}/\`)
        || (
          prefixPart.toLowerCase() === fileNamePartsContent
          && prefixParts[index + 1]
          && prefixParts[index] === prefixParts[index + 1]
        )
      ) {
        layoutNameParts.length = index
      }

      index -= 1
    }

    return [...layoutNameParts, ...fileNameParts]
  }

  function normalizeLayoutName(file) {
    const normalizedFile = file.replace(REGEX_BACKSLASH, '/')
    const slashIndex = normalizedFile.lastIndexOf('/')
    const dir = slashIndex === -1 ? '' : normalizedFile.slice(0, slashIndex)
    const basename = slashIndex === -1 ? normalizedFile : normalizedFile.slice(slashIndex + 1)
    const dotIndex = basename.lastIndexOf('.')
    const name = dotIndex === -1 ? basename : basename.slice(0, dotIndex)
    const prefixParts = splitByCase(dir)
    const fileName = name.toLowerCase() === 'index' ? '' : name
    const segments = resolveLayoutNameSegments(fileName, prefixParts).filter(Boolean)

    return kebabCaseSegments(segments)
  }

  export const setupLayouts = routes => {
      const layouts = {}
      const inheritDefaultLayout = ${inheritDefaultLayout}

      const modules = ${await createVirtualGlob(
        normalizedTarget,
        isSync,
      )}

      Object.entries(modules).forEach(([name, module]) => {
          let key = normalizeLayoutName(name.replace("${normalizedTarget}/", ''))
          layouts[key] = ${isSync ? 'module.default' : 'module'}
      })

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
          // auto-routes adds a top-level route to the routing group, which we should skip.
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
