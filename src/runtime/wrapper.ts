import type { Component, ComputedRef } from 'vue'
import type { Router } from 'vue-router'
import { computed, defineAsyncComponent, defineComponent, h, shallowRef } from 'vue'
import { RouterView, START_LOCATION, useRoute, useRouter } from 'vue-router'

export type LayoutName = string | false
export type LayoutMap = Record<string, Component | (() => Promise<{ default: Component } | Component>)>

const PREFIX = '[vite-plugin-vue-layouts-next]'

/** In-place override set by `setPageLayout`; cleared on navigation to another path. */
const override = shallowRef<LayoutName | null>(null)

/** Routers that already have the override-reset guard installed. */
const guardedRouters = new WeakSet<Router>()

let resolvedDefaultLayout = 'default'

/**
 * Change the layout of the current page without navigating.
 * The override lasts until the router navigates to a different `path`.
 */
export function setPageLayout(name: LayoutName): void {
  override.value = name
}

/** Reactive name of the layout resolved for the current route (`false` when none). */
export function useLayout(): ComputedRef<LayoutName> {
  const route = useRoute()
  return computed(() => resolveName(route.meta.layout as LayoutName | undefined))
}

function resolveName(metaLayout: LayoutName | undefined): LayoutName {
  if (override.value !== null)
    return override.value
  return metaLayout ?? resolvedDefaultLayout
}

function installResetGuard(router: Router) {
  if (guardedRouters.has(router))
    return
  guardedRouters.add(router)
  router.afterEach((to, from) => {
    if (from !== START_LOCATION && to.path !== from.path)
      override.value = null
  })
}

export function createLayoutWrapper(layouts: LayoutMap, defaultLayout: string): Component {
  resolvedDefaultLayout = defaultLayout
  const asyncCache = new Map<string, Component>()

  function resolveComponent(name: string): Component | undefined {
    const entry = layouts[name]
    if (!entry)
      return undefined
    if (typeof entry === 'function') {
      const cached = asyncCache.get(name)
      if (cached)
        return cached
      const loader = entry as () => Promise<any>
      const created: Component = defineAsyncComponent(() =>
        Promise.resolve(loader()).then(mod =>
          mod && typeof mod === 'object' && 'default' in mod ? mod.default : mod,
        ),
      )
      asyncCache.set(name, created)
      return created
    }
    return entry
  }

  function resolveLayout(name: string): Component | undefined {
    const found = resolveComponent(name)
    if (found)
      return found
    console.warn(`${PREFIX} Layout "${name}" not found, falling back to "${defaultLayout}"`)
    return resolveComponent(defaultLayout)
  }

  return defineComponent({
    name: 'LayoutWrapper',
    setup() {
      const route = useRoute()
      installResetGuard(useRouter())
      const name = computed(() => resolveName(route.meta.layout as LayoutName | undefined))

      return () => {
        if (name.value === false)
          return h(RouterView)
        const LayoutComponent = resolveLayout(name.value)
        return LayoutComponent
          ? h(LayoutComponent, null, { default: () => h(RouterView) })
          : h(RouterView)
      }
    },
  })
}
