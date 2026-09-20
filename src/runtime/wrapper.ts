import type { Component, ComputedRef } from 'vue'
import type { NavigationGuard, RouteLocationNormalized, Router, RouteRecordNormalized } from 'vue-router'
import { computed, defineAsyncComponent, defineComponent, h, inject, shallowRef } from 'vue'
import { matchedRouteKey, RouterView, START_LOCATION, useRoute, useRouter } from 'vue-router'

export type LayoutName = string | false

const LAZY = Symbol.for('vite-plugin-vue-layouts-next:lazy')

export type LazyLayout = (() => Promise<{ default: Component } | Component>) & { [LAZY]: true }

/**
 * Marks a `() => import()` factory as a lazy layout entry.
 *
 * Both virtual-module generators wrap their async imports with this, so a lazy entry
 * is always identified explicitly rather than guessed from its shape — unlike Vue
 * Router's route components, a bare functional component (e.g. an arrow-function
 * default export from a `.tsx` layout) is a perfectly valid, non-lazy layout here.
 */
export function lazyLayout(loader: () => Promise<{ default: Component } | Component>): LazyLayout {
  return Object.assign(loader, { [LAZY]: true as const })
}

export function isLazyLayout(entry: unknown): entry is LazyLayout {
  return typeof entry === 'function' && (entry as any)[LAZY] === true
}

export type LayoutMap = Record<string, Component | LazyLayout>

/** Well-known key the generated wrapper's preload guard is exposed under, so `createSetupLayouts` can attach it as `beforeEnter` without changing the generated route code. */
export const LAYOUT_PRELOAD = Symbol.for('vite-plugin-vue-layouts-next:preload')

/** The parts of a route location the resolution rule needs (current route or a guard's `to`). */
type RouteLike = Pick<RouteLocationNormalized, 'matched' | 'meta'>

const PREFIX = '[vite-plugin-vue-layouts-next]'

/** In-place override set by `setPageLayout`; cleared on navigation to another path. */
const override = shallowRef<LayoutName | null>(null)

/** Routers that already have the guards installed. */
const guardedRouters = new WeakSet<Router>()

/** `defaultLayout` of the last created wrapper; shared with `useLayout()`. */
let resolvedDefaultLayout = 'default'

/**
 * Change the layout of the current page without navigating.
 * The override lasts until the router navigates to a different `path`.
 */
export function setPageLayout(name: LayoutName): void {
  override.value = name
}

/**
 * Reactive name of the layout resolved for the current route.
 * `false` when no wrapper is rendered around it (a static `layout: false` route, or
 * one deliberately left unwrapped because `inheritDefaultLayout` is `false`).
 */
export function useLayout(): ComputedRef<LayoutName> {
  const route = useRoute()
  return computed(() => {
    const own = innermostLayoutRecord(route)
    if (!own)
      return false
    return resolveNameFor(route, own, override.value)
  })
}

/** The generated parent record of the innermost wrapper of `route`, if any. */
function innermostLayoutRecord(route: RouteLike): RouteRecordNormalized | undefined {
  const { matched } = route
  for (let i = matched.length - 1; i >= 0; i--) {
    if (matched[i].meta.isLayout)
      return matched[i]
  }
  return undefined
}

/**
 * Layout name the wrapper whose generated record is `own` renders for `route`.
 *
 * The static name comes from the wrapped record's own meta (`||` fallback to the
 * default, like the original algorithm), so nested trees keep one layout per level.
 * Dynamic inputs — the `setPageLayout` override and a guard assignment to the merged
 * `route.meta.layout` — apply only to the innermost wrapper.
 */
function resolveNameFor(route: RouteLike, own: RouteRecordNormalized, overrideValue: LayoutName | null): LayoutName {
  const { matched } = route
  const idx = matched.indexOf(own)
  const page = matched[idx + 1]
  const staticName: LayoutName = page?.meta.layout || resolvedDefaultLayout
  const innermost = !matched.slice(idx + 2).some(r => r.meta.isLayout)
  if (!innermost)
    return staticName
  const staticMerged = matched.reduce<LayoutName | undefined>((m, r) => r.meta.layout ?? m, undefined)
  const guardValue = route.meta.layout !== staticMerged ? route.meta.layout : undefined
  return overrideValue ?? guardValue ?? staticName
}

function unwrapModule(mod: any): Component {
  return mod && typeof mod === 'object' && 'default' in mod ? mod.default : mod
}

export function createLayoutWrapper(layouts: LayoutMap, defaultLayout: string): Component {
  resolvedDefaultLayout = defaultLayout
  /** Lazy layouts already loaded (by the `beforeResolve` preload or an async render). */
  const resolved = new Map<string, Component>()
  /** In-flight loads, so a layout's factory runs at most once. */
  const pending = new Map<string, Promise<Component>>()
  /** `defineAsyncComponent` per name, for renders that happen before the preload. */
  const asyncCache = new Map<string, Component>()
  const warned = new Set<string>()

  function load(name: string, loader: () => Promise<any>): Promise<Component> {
    let promise = pending.get(name)
    if (!promise) {
      promise = Promise.resolve(loader()).then((mod) => {
        const component = unwrapModule(mod)
        resolved.set(name, component)
        return component
      }, (error) => {
        pending.delete(name) // let the next navigation retry, like a failed route component import
        throw error
      })
      pending.set(name, promise)
    }
    return promise
  }

  function resolveComponent(name: string): Component | undefined {
    const loaded = resolved.get(name)
    if (loaded)
      return loaded
    const entry = layouts[name]
    if (!entry)
      return undefined
    if (isLazyLayout(entry)) {
      let created = asyncCache.get(name)
      if (!created) {
        const loader = entry
        created = defineAsyncComponent(() => load(name, loader))
        asyncCache.set(name, created)
      }
      return created
    }
    return entry
  }

  function resolveLayout(name: string): Component | undefined {
    const found = resolveComponent(name)
    if (found)
      return found
    if (!warned.has(name)) {
      warned.add(name)
      console.warn(`${PREFIX} Layout "${name}" not found, falling back to "${defaultLayout}"`)
    }
    return resolveComponent(defaultLayout)
  }

  // Load lazy layouts before the navigation is confirmed, like when the
  // `() => import()` factory was the route component itself. Attached as
  // `beforeEnter` to every generated layout record by `createSetupLayouts`, so it
  // also covers the initial navigation, before any wrapper has mounted.
  const preload: NavigationGuard = async (to, from) => {
    // The override only survives this navigation if `afterEach` below keeps it.
    const keepOverride = from === START_LOCATION || to.path === from.path
    for (const rec of to.matched) {
      if (!rec.meta.isLayout)
        continue
      const name = resolveNameFor(to, rec, keepOverride ? override.value : null)
      if (name === false)
        continue
      const entry = layouts[name] ?? layouts[defaultLayout]
      const key = layouts[name] ? name : defaultLayout
      if (isLazyLayout(entry) && !resolved.has(key))
        await load(key, entry)
    }
  }

  function installGuards(router: Router) {
    if (guardedRouters.has(router))
      return
    guardedRouters.add(router)
    router.afterEach((to, from, failure) => {
      // A failed navigation (e.g. aborted by a guard) never reaches render; redirects
      // are re-issued as a new navigation rather than reported as a failure here.
      if (failure)
        return
      if (from !== START_LOCATION && to.path !== from.path)
        override.value = null
    })
  }

  const Wrapper = defineComponent({
    name: 'LayoutWrapper',
    setup() {
      const route = useRoute()
      const own = inject(matchedRouteKey)!
      installGuards(useRouter())
      const name = computed(() => resolveNameFor(route, own.value!, override.value))

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

  return Object.assign(Wrapper, { [LAYOUT_PRELOAD]: preload })
}
