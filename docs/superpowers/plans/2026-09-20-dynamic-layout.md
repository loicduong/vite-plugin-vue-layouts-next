# Dynamic Layouts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a page's layout be changed at runtime (`setPageLayout`, router guards) and read reactively (`useLayout`), by moving the generated runtime into a real, tested `vite-plugin-vue-layouts-next/runtime` module shared by both plugin modes.

**Architecture:** `setupLayouts` keeps producing the same route tree, but every generated parent route now uses one shared `LayoutWrapper` component that resolves the layout at render time from `override ?? route.meta.layout ?? defaultLayout`. The runtime (`createLayoutWrapper`, `createSetupLayouts`, `createGetRoutes`, `setPageLayout`, `useLayout`) lives in `src/runtime/index.ts`, built as a second tsdown entry; the two virtual-module generators shrink to "build the `layouts` map + wire the runtime".

**Tech Stack:** TypeScript, Vue 3 (`defineComponent`, `h`, `defineAsyncComponent`, `shallowRef`, `computed`), Vue Router 4/5 (`useRoute`, `useRouter`, `RouterView`, `START_LOCATION`), tsdown, vitest + happy-dom + @vue/test-utils, pnpm workspace with `catalog:` versions.

**Spec:** `docs/superpowers/specs/2026-09-20-dynamic-layout-design.md`

## Global Constraints

- Public behavior of `setupLayouts`, `createGetRoutes`, `meta.isLayout`, `layout: false`, `inheritDefaultLayout` and layout-name normalization must not change.
- Peer ranges stay `vue ^3.2.4`, `vue-router ^4.0.11 || ^5.0.0`, `vite ^6 || ^7 || ^8`. Runtime may only use `useRoute`, `useRouter`, `RouterView`, `START_LOCATION`, `afterEach`, `defineComponent`, `h`, `defineAsyncComponent`, `shallowRef`, `computed`.
- Runtime code must be browser-safe: no `node:*` imports under `src/runtime/` or `src/layoutName.ts`.
- Warning prefix is exactly `[vite-plugin-vue-layouts-next]`.
- Version bump is `3.1.0`.
- All dependency versions go through `pnpm-workspace.yaml` `catalog:`.
- Run the full suite with `pnpm test`; lint with `pnpm lint`; typecheck with `pnpm typecheck`. All three must pass before each commit.
- Commit messages end with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- Work on branch `feat/dynamic-layout`.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `src/layoutName.ts` (modify) | Layout name normalization; becomes browser-safe (no `node:path`). |
| `src/runtime/index.ts` (create) | Public runtime: `createGetRoutes`, `createLayoutWrapper`, `createSetupLayouts`, `setPageLayout`, `useLayout`, re-export `normalizeLayoutName`. |
| `src/runtime/wrapper.ts` (create) | `createLayoutWrapper` + override state + `setPageLayout` + `useLayout` (they share the `override` ref). |
| `src/runtime/setupLayouts.ts` (create) | `createSetupLayouts` (the existing `deepSetupLayout` algorithm) and `createGetRoutes`. |
| `src/RouteLayout.ts` (modify) | Plugin-mode virtual module: imports runtime, emits `layouts`, wires wrapper + setupLayouts. |
| `src/clientSide.ts` (modify) | Client-side-mode virtual module: same shape, `layouts` from `import.meta.glob`. |
| `src/index.ts` (modify) | Adds `config()` hook with `optimizeDeps.include` to both plugin factories. |
| `tsdown.config.ts` (create) | Two entries: `index`, `runtime`. |
| `package.json`, `pnpm-workspace.yaml` (modify) | `./runtime` export, version, dev deps. |
| `client.d.ts` (modify) | New exports + `RouteMeta` augmentation. |
| `vitest.config.ts` (modify) | Alias `vite-plugin-vue-layouts-next/runtime` → `src/runtime/index.ts`. |
| `test/runtime.test.ts` (create) | Mounted-app tests for wrapper / setPageLayout / useLayout. |
| `test/setup-layouts.test.ts` (create) | Pure route-tree tests for `createSetupLayouts`. |
| `test/load-hook.test.ts`, `test/integration.test.ts` (modify) | Assert new virtual-module shape. |
| `examples/spa/...` (modify) | Admin layout + role toggle demo. |
| `docs/guide/dynamic-layout.md` (create), other docs, READMEs, CHANGELOG (modify) | Documentation. |

---

### Task 1: Make `normalizeLayoutName` browser-safe

**Files:**
- Modify: `src/layoutName.ts:1,118-126`
- Test: `test/layout-name.test.ts` (existing, must keep passing)

**Interfaces:**
- Produces: `normalizeLayoutName(file: string): string` unchanged signature; no `node:path` import.

- [ ] **Step 1: Add a regression test for the path-splitting the `parse()` call used to do**

Append to `test/layout-name.test.ts` inside the existing `describe('layout name normalization', ...)`:

```ts
  it('splits dir/base/ext without node:path', () => {
    expect(normalizeLayoutName('a/b/c.layout.vue')).toBe('a-b-c-layout')
    expect(normalizeLayoutName('noext')).toBe('noext')
    expect(normalizeLayoutName('dir\\Win.vue')).toBe('dir-win')
    expect(normalizeLayoutName('.hidden.vue')).toBe('hidden')
  })
```

- [ ] **Step 2: Run the test to confirm current behavior**

Run: `pnpm vitest run test/layout-name.test.ts`
Expected: PASS (this locks in current `parse()` output before the refactor; if any expectation fails, adjust the expectation to the current output — the goal is zero behavior change).

- [ ] **Step 3: Replace `parse()` with manual splitting**

In `src/layoutName.ts`, delete `import { parse } from 'node:path'` and replace the `normalizeLayoutName` body:

```ts
export function normalizeLayoutName(file: string): string {
  const normalizedFile = file.replace(REGEX_BACKSLASH, '/')
  const slashIndex = normalizedFile.lastIndexOf('/')
  const dir = slashIndex === -1 ? '' : normalizedFile.slice(0, slashIndex)
  const basename = slashIndex === -1 ? normalizedFile : normalizedFile.slice(slashIndex + 1)
  const dotIndex = basename.lastIndexOf('.')
  // Mirror node:path parse(): a leading dot with no other dot is the whole name, not an extension.
  const name = dotIndex <= 0 ? basename : basename.slice(0, dotIndex)
  const prefixParts = splitByCase(dir)
  const fileName = dir && name.toLowerCase() === 'index' ? '' : name
  const segments = resolveLayoutNameSegments(fileName, prefixParts).filter(Boolean)

  return kebabCaseSegments(segments)
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run test/layout-name.test.ts test/load-hook.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/layoutName.ts test/layout-name.test.ts
git commit -m "refactor: make normalizeLayoutName browser-safe

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Test tooling — happy-dom, @vue/test-utils, runtime alias

**Files:**
- Modify: `pnpm-workspace.yaml` (catalog), `package.json` (devDependencies), `vitest.config.ts`

**Interfaces:**
- Produces: specifier `vite-plugin-vue-layouts-next/runtime` resolves to `src/runtime/index.ts` inside vitest and inside Vite builds started from tests.

- [ ] **Step 1: Add catalog entries**

In `pnpm-workspace.yaml` under `catalog:` add (keep alphabetical order with the existing entries):

```yaml
  '@vue/test-utils': ^2.4.6
  happy-dom: ^20.0.0
```

- [ ] **Step 2: Add dev deps and install**

In `package.json` `devDependencies` add `"@vue/test-utils": "catalog:"` and `"happy-dom": "catalog:"` (alphabetical). Then:

Run: `pnpm install`
Expected: lockfile updated, no errors.

- [ ] **Step 3: Alias the runtime specifier in vitest**

Replace `vitest.config.ts` with:

```ts
import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts', 'test/integration.test.ts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, 'src'),
      'vite-plugin-vue-layouts-next/runtime': resolve(import.meta.dirname, 'src/runtime/index.ts'),
    },
  },
})
```

- [ ] **Step 4: Run existing suite**

Run: `pnpm test`
Expected: PASS (nothing uses the alias yet).

- [ ] **Step 5: Commit**

```bash
git add pnpm-workspace.yaml package.json pnpm-lock.yaml vitest.config.ts
git commit -m "test: add happy-dom and @vue/test-utils

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: `createSetupLayouts` and `createGetRoutes` in the runtime

**Files:**
- Create: `src/runtime/setupLayouts.ts`
- Create: `test/setup-layouts.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export function createSetupLayouts(wrapper: Component, options: { inheritDefaultLayout: boolean }): (routes: readonly RouteRecordRaw[]) => RouteRecordRaw[]
  export function createGetRoutes(router: Router, withLayout?: boolean): () => RouteRecordRaw[]
  ```

- [ ] **Step 1: Write failing tests**

Create `test/setup-layouts.test.ts`:

```ts
import type { RouteRecordRaw } from 'vue-router'
import { describe, expect, it } from 'vitest'
import { createGetRoutes, createSetupLayouts } from '../src/runtime/setupLayouts'

const Wrapper = { name: 'Wrapper', render: () => null }
const Page = { name: 'Page', render: () => null }

describe('createSetupLayouts', () => {
  it('wraps a top-level route with the wrapper and marks it isLayout', () => {
    const setupLayouts = createSetupLayouts(Wrapper, { inheritDefaultLayout: true })
    const [route] = setupLayouts([{ path: '/about', component: Page, meta: { layout: 'admin' } }])
    expect(route).toMatchObject({
      path: '/about',
      component: Wrapper,
      meta: { isLayout: true },
      children: [{ path: '', component: Page, meta: { layout: 'admin' } }],
    })
  })

  it('keeps the root path on the child for "/"', () => {
    const setupLayouts = createSetupLayouts(Wrapper, { inheritDefaultLayout: true })
    const [route] = setupLayouts([{ path: '/', component: Page }])
    expect(route.children![0]!.path).toBe('/')
  })

  it('does not wrap layout: false routes', () => {
    const setupLayouts = createSetupLayouts(Wrapper, { inheritDefaultLayout: true })
    const [route] = setupLayouts([{ path: '/raw', component: Page, meta: { layout: false } }])
    expect(route.component).toBe(Page)
    expect(route.meta).toEqual({ layout: false })
  })

  it('wraps nested children that declare a layout', () => {
    const setupLayouts = createSetupLayouts(Wrapper, { inheritDefaultLayout: true })
    const [parent] = setupLayouts([{
      path: '/p',
      component: Page,
      children: [{ path: 'c', component: Page, meta: { layout: 'admin' } }],
    }])
    const child = parent.children![0]!.children![0]!
    expect(child).toMatchObject({ path: 'c', component: Wrapper, meta: { isLayout: true } })
  })

  it('skips the default layout for a parent when inheritDefaultLayout is false and a child has a layout', () => {
    const setupLayouts = createSetupLayouts(Wrapper, { inheritDefaultLayout: false })
    const [parent] = setupLayouts([{
      path: '/p',
      component: Page,
      children: [{ path: 'c', component: Page, meta: { layout: 'admin' } }],
    }])
    expect(parent.component).toBe(Page)
    expect(parent.meta?.isLayout).toBeUndefined()
  })

  it('skips auto-routes group routes whose "" child is already a layout', () => {
    const setupLayouts = createSetupLayouts(Wrapper, { inheritDefaultLayout: true })
    const group: RouteRecordRaw = {
      path: '/g',
      children: [{ path: '', component: Wrapper, meta: { isLayout: true }, children: [] }],
    }
    const [route] = setupLayouts([group])
    expect(route).toBe(group)
  })
})

describe('createGetRoutes', () => {
  const routes = [
    { path: '/a', meta: { isLayout: true } },
    { path: '/b', meta: {} },
  ]
  const router = { getRoutes: () => routes } as any

  it('returns a getter that filters layout routes by default', () => {
    expect(createGetRoutes(router)()).toEqual([{ path: '/b', meta: {} }])
  })

  it('returns all routes when withLayout is true', () => {
    // existing behavior: returns the array itself, not a getter
    expect(createGetRoutes(router, true)).toBe(routes)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm vitest run test/setup-layouts.test.ts`
Expected: FAIL — cannot find module `../src/runtime/setupLayouts`.

- [ ] **Step 3: Implement**

Create `src/runtime/setupLayouts.ts` (algorithm copied from the current `src/RouteLayout.ts` string, only `component` changed):

```ts
import type { Component } from 'vue'
import type { RouteRecordRaw, Router } from 'vue-router'

export interface SetupLayoutsOptions {
  inheritDefaultLayout: boolean
}

type AnyRoute = RouteRecordRaw & { children?: AnyRoute[] }

/**
 * Same signature as before: without `withLayout` it returns a getter that hides
 * generated layout routes; with `withLayout` it returns the raw array.
 */
export function createGetRoutes(router: Router, withLayout = false): any {
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
    if (child.meta?.layout && child.meta.layout !== false)
      return true
    // Also check if child is already a layout route (after transformation)
    if (child.meta?.isLayout)
      return true
    return hasChildWithLayout(child)
  })
}

export function createSetupLayouts(wrapper: Component, options: SetupLayoutsOptions) {
  const { inheritDefaultLayout } = options

  function wrap(route: AnyRoute): AnyRoute {
    return {
      path: route.path,
      component: wrapper,
      children: route.path === '/' ? [route] : [{ ...route, path: '' }],
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
            return wrap(route)
        }
      }

      if (route.meta?.layout)
        return wrap(route)

      return route
    })
  }

  return (routes: readonly RouteRecordRaw[]): RouteRecordRaw[] => deepSetupLayout(routes as AnyRoute[])
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run test/setup-layouts.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/runtime/setupLayouts.ts test/setup-layouts.test.ts
git commit -m "feat(runtime): extract createSetupLayouts and createGetRoutes

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: `createLayoutWrapper`, `setPageLayout`, `useLayout`

**Files:**
- Create: `src/runtime/wrapper.ts`
- Create: `src/runtime/index.ts`
- Create: `test/runtime.test.ts`

**Interfaces:**
- Consumes: `createSetupLayouts` from Task 3.
- Produces:
  ```ts
  export type LayoutName = string | false
  export type LayoutMap = Record<string, Component | (() => Promise<unknown>)>
  export function createLayoutWrapper(layouts: LayoutMap, defaultLayout: string): Component
  export function setPageLayout(name: LayoutName): void
  export function useLayout(): ComputedRef<LayoutName>
  ```

- [ ] **Step 1: Write failing tests**

Create `test/runtime.test.ts`:

```ts
// @vitest-environment happy-dom
import type { Component } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import { createLayoutWrapper, createSetupLayouts, setPageLayout, useLayout } from '../src/runtime'

function layout(name: string): Component {
  return defineComponent({
    name: `${name}-layout`,
    setup: () => () => h('div', { 'data-layout': name }, [h(RouterView)]),
  })
}

const Default = layout('default')
const Admin = layout('admin')
const Lazy = layout('lazy')
const lazyFactory = vi.fn(() => Promise.resolve({ default: Lazy }))

function page(text: string): Component {
  return defineComponent({
    setup() {
      const current = useLayout()
      return () => h('p', { 'data-page': text, 'data-use-layout': String(current.value) }, text)
    },
  })
}

interface AppOptions {
  inheritDefaultLayout?: boolean
  initialPath?: string
  beforeEach?: Parameters<ReturnType<typeof createRouter>['beforeEach']>[0]
}

// Navigates to `initialPath` BEFORE mounting so the router plugin does not
// perform its own initial navigation to "/" on install.
async function createApp(opts: AppOptions = {}) {
  const layouts = { default: Default, admin: Admin, lazy: lazyFactory }
  const Wrapper = createLayoutWrapper(layouts, 'default')
  const setupLayouts = createSetupLayouts(Wrapper, { inheritDefaultLayout: opts.inheritDefaultLayout ?? true })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: setupLayouts([
      { path: '/', component: page('home') },
      { path: '/admin', component: page('admin'), meta: { layout: 'admin' } },
      { path: '/lazy', component: page('lazy'), meta: { layout: 'lazy' } },
      { path: '/missing', component: page('missing'), meta: { layout: 'nope' } },
      { path: '/raw', component: page('raw'), meta: { layout: false } },
      { path: '/dyn', component: page('dyn') },
    ]),
  })
  if (opts.beforeEach)
    router.beforeEach(opts.beforeEach)
  await router.push(opts.initialPath ?? '/')
  const wrapper = mount(defineComponent({ setup: () => () => h(RouterView) }), {
    global: { plugins: [router] },
  })
  return { router, wrapper, layouts }
}

function layoutOf(wrapper: ReturnType<typeof mount>) {
  return wrapper.find('[data-layout]').exists() ? wrapper.find('[data-layout]').attributes('data-layout') : null
}
function useLayoutOf(wrapper: ReturnType<typeof mount>) {
  return wrapper.find('[data-page]').attributes('data-use-layout')
}

afterEach(() => {
  setPageLayout(null as any) // reset module state between tests
  vi.restoreAllMocks()
})

describe('LayoutWrapper', () => {
  it('renders meta.layout and falls back to default', async () => {
    const { router, wrapper } = await createApp()
    expect(layoutOf(wrapper)).toBe('default')
    expect(useLayoutOf(wrapper)).toBe('default')

    await router.push('/admin')
    expect(layoutOf(wrapper)).toBe('admin')
    expect(useLayoutOf(wrapper)).toBe('admin')
  })

  it('picks up meta.layout assigned in a beforeEach guard', async () => {
    const { wrapper } = await createApp({
      initialPath: '/dyn',
      beforeEach: (to) => {
        if (to.path === '/dyn')
          to.meta.layout = 'admin'
      },
    })
    expect(layoutOf(wrapper)).toBe('admin')
  })

  it('resolves async layouts once per name', async () => {
    const { router, wrapper } = await createApp({ initialPath: '/lazy' })
    await flushPromises()
    expect(layoutOf(wrapper)).toBe('lazy')
    await router.push('/')
    await router.push('/lazy')
    await flushPromises()
    expect(lazyFactory).toHaveBeenCalledTimes(1)
  })

  it('warns and falls back to default for an unknown layout', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { wrapper } = await createApp({ initialPath: '/missing' })
    expect(layoutOf(wrapper)).toBe('default')
    expect(warn).toHaveBeenCalledWith('[vite-plugin-vue-layouts-next] Layout "nope" not found, falling back to "default"')
  })

  it('leaves layout: false routes unwrapped', async () => {
    const { wrapper } = await createApp({ initialPath: '/raw' })
    expect(layoutOf(wrapper)).toBeNull()
    expect(wrapper.find('[data-page="raw"]').exists()).toBe(true)
  })
})

describe('setPageLayout', () => {
  it('switches the layout in place and resets on path change', async () => {
    const { router, wrapper } = await createApp()

    setPageLayout('admin')
    await nextTick()
    expect(layoutOf(wrapper)).toBe('admin')
    expect(useLayoutOf(wrapper)).toBe('admin')

    await router.push('/?tab=2')
    expect(layoutOf(wrapper)).toBe('admin')

    await router.push('/dyn')
    expect(layoutOf(wrapper)).toBe('default')
  })

  it('supports false (no layout)', async () => {
    const { wrapper } = await createApp({ initialPath: '/admin' })
    setPageLayout(false)
    await nextTick()
    expect(layoutOf(wrapper)).toBeNull()
    expect(wrapper.find('[data-page="admin"]').exists()).toBe(true)
    expect(useLayoutOf(wrapper)).toBe('false')
  })

  it('applies when called before the initial navigation', async () => {
    setPageLayout('admin')
    const { wrapper } = await createApp({ initialPath: '/dyn' })
    expect(layoutOf(wrapper)).toBe('admin')
  })

  it('registers the reset guard once per router across wrapper remounts', async () => {
    const { router, wrapper } = await createApp()
    const afterEach = vi.spyOn(router, 'afterEach')
    await router.push('/raw') // wrapper unmounts
    await router.push('/')    // wrapper mounts again
    expect(afterEach).toHaveBeenCalledTimes(0) // guard was registered before the spy, on first setup

    // override set while on an unwrapped route must still reset on the next path change
    await router.push('/raw')
    setPageLayout('admin')
    await router.push('/dyn')
    expect(layoutOf(wrapper)).toBe('default')
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm vitest run test/runtime.test.ts`
Expected: FAIL — cannot find module `../src/runtime`.

- [ ] **Step 3: Implement the wrapper**

Create `src/runtime/wrapper.ts`:

```ts
import type { Component, ComputedRef } from 'vue'
import type { Router } from 'vue-router'
import { computed, defineAsyncComponent, defineComponent, h, shallowRef } from 'vue'
import { RouterView, START_LOCATION, useRoute, useRouter } from 'vue-router'

export type LayoutName = string | false
export type LayoutMap = Record<string, Component | (() => Promise<unknown>)>

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
      let cached = asyncCache.get(name)
      if (!cached) {
        cached = defineAsyncComponent(entry as () => Promise<any>)
        asyncCache.set(name, cached)
      }
      return cached
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
```

Create `src/runtime/index.ts`:

```ts
export { normalizeLayoutName } from '../layoutName'
export { createGetRoutes, createSetupLayouts } from './setupLayouts'
export type { SetupLayoutsOptions } from './setupLayouts'
export { createLayoutWrapper, setPageLayout, useLayout } from './wrapper'
export type { LayoutMap, LayoutName } from './wrapper'
```

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run test/runtime.test.ts`
Expected: PASS. If `registers the reset guard once per router` fails because `afterEach` is called on remount, the `WeakSet` check is not being hit — verify `installResetGuard` is called with the same `Router` instance.

- [ ] **Step 5: Lint + typecheck**

Run: `pnpm lint && pnpm typecheck`
Expected: clean. Fix any `any` complaints by narrowing types (the `entry as () => Promise<any>` cast may need `// eslint-disable-next-line ts/no-explicit-any` if the config forbids it; prefer `Promise<{ default: Component } | Component>`).

- [ ] **Step 6: Commit**

```bash
git add src/runtime test/runtime.test.ts
git commit -m "feat(runtime): add LayoutWrapper, setPageLayout and useLayout

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Build + package wiring for `./runtime`

**Files:**
- Create: `tsdown.config.ts`
- Modify: `package.json` (`exports`, `files`, `version`), `client.d.ts`

**Interfaces:**
- Produces: `dist/index.mjs`, `dist/index.d.mts`, `dist/runtime.mjs`, `dist/runtime.d.mts`; specifier `vite-plugin-vue-layouts-next/runtime`.

- [ ] **Step 1: Create tsdown config**

Create `tsdown.config.ts`:

```ts
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    runtime: 'src/runtime/index.ts',
  },
  format: 'esm',
  dts: true,
  clean: true,
  external: ['vue', 'vue-router'],
})
```

- [ ] **Step 2: Update package.json**

In `package.json`:
- `"version": "3.1.0"`
- Add to `exports` after `"."`:
  ```json
  "./runtime": {
    "types": "./dist/runtime.d.mts",
    "import": "./dist/runtime.mjs"
  },
  ```
  (keep the existing `"./client"` and `"./*"` entries after it).

- [ ] **Step 3: Update client.d.ts**

Replace `client.d.ts` with:

```ts
declare module 'virtual:generated-layouts' {
  import type { Component } from 'vue'
  import type { Router, RouteRecordRaw } from 'vue-router'
  import type { LayoutMap, LayoutName } from 'vite-plugin-vue-layouts-next/runtime'

  export const layouts: LayoutMap
  // need any here due to different types for vue-router versions
  export function createGetRoutes(router: Router | any, withLayout?: boolean): () => RouteRecordRaw[]
  export function setupLayouts(routes: readonly RouteRecordRaw[]): RouteRecordRaw[]
  export function setPageLayout(name: LayoutName): void
  export function useLayout(): import('vue').ComputedRef<LayoutName>
}

declare module 'vue-router' {
  interface RouteMeta {
    /** Layout name for this page, or `false` to render without a layout. */
    layout?: string | false
    /** Set on the generated parent routes created by `setupLayouts`. */
    isLayout?: boolean
  }
}

export {}
```

- [ ] **Step 4: Build and verify output**

Run: `pnpm build && ls dist`
Expected: `index.mjs index.d.mts runtime.mjs runtime.d.mts`. Then:

Run: `node -e "import('./dist/runtime.mjs').then(m => console.log(Object.keys(m).sort().join()))"`
Expected: `createGetRoutes,createLayoutWrapper,createSetupLayouts,normalizeLayoutName,setPageLayout,useLayout`

- [ ] **Step 5: Typecheck**

Run: `pnpm typecheck`
Expected: clean (the `client.d.ts` import of the runtime types resolves through `exports`).

- [ ] **Step 6: Commit**

```bash
git add tsdown.config.ts package.json client.d.ts
git commit -m "build: add runtime entry and public types

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Plugin-mode virtual module uses the runtime

**Files:**
- Modify: `src/RouteLayout.ts` (whole file), `src/index.ts:38-52,146-167`
- Modify: `test/load-hook.test.ts`, `test/integration.test.ts`

**Interfaces:**
- Consumes: `getImportCode()` (unchanged, still emits `export const layouts = {...}`).
- Produces: virtual module exporting `layouts`, `setupLayouts`, `createGetRoutes`, `setPageLayout`, `useLayout`.

- [ ] **Step 1: Update load-hook tests for the new shape**

In `test/load-hook.test.ts`, inside `describe('layout (server/resolved)')` add:

```ts
    it('wires the runtime wrapper into the generated module', async () => {
      const plugin = Layout({
        layoutsDirs: resolve(fixturesRoot, 'layouts'),
        extensions: ['vue'],
        defaultLayout: 'main',
        inheritDefaultLayout: false,
      }) as Plugin & { configResolved: (config: { root: string }) => void }
      plugin.configResolved!({ root: fixturesRoot })
      const load = getLoadFunction(plugin)
      const result = await load!(MODULE_ID_VIRTUAL) as { code: string }

      expect(result.code).toContain('from \'vite-plugin-vue-layouts-next/runtime\'')
      expect(result.code).toContain('export { createGetRoutes, setPageLayout, useLayout }')
      expect(result.code).toContain('const LayoutWrapper = createLayoutWrapper(layouts, \'main\')')
      expect(result.code).toContain('export const setupLayouts = createSetupLayouts(LayoutWrapper, { inheritDefaultLayout: false })')
      expect(result.code).not.toContain('function deepSetupLayout')
    })
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm vitest run test/load-hook.test.ts -t "wires the runtime wrapper"`
Expected: FAIL on the `from 'vite-plugin-vue-layouts-next/runtime'` assertion.

- [ ] **Step 3: Rewrite `src/RouteLayout.ts`**

Replace the whole file with:

```ts
import type { ResolvedOptions } from './types'

export const RUNTIME_ID = 'vite-plugin-vue-layouts-next/runtime'

function getClientCode(importCode: string, options: ResolvedOptions) {
  const inheritDefaultLayout = options.inheritDefaultLayout ?? true

  return `
import { createGetRoutes, createLayoutWrapper, createSetupLayouts, setPageLayout, useLayout } from '${RUNTIME_ID}'
export { createGetRoutes, setPageLayout, useLayout }
${importCode}
const LayoutWrapper = createLayoutWrapper(layouts, '${options.defaultLayout}')
export const setupLayouts = createSetupLayouts(LayoutWrapper, { inheritDefaultLayout: ${inheritDefaultLayout} })
`
}

export default getClientCode
```

- [ ] **Step 4: Add `optimizeDeps.include` to the plugin-mode factory**

In `src/index.ts`, import `RUNTIME_ID` from `./RouteLayout` and add a `config` hook right after `enforce: 'pre',` in the object returned by `Layout()`:

```ts
    config() {
      return { optimizeDeps: { include: [RUNTIME_ID] } }
    },
```

- [ ] **Step 5: Point the integration build at the source runtime**

In `test/integration.test.ts`, add `resolve.alias` to the `build()` call so the fixture app (which has no `node_modules` of its own) can resolve the runtime:

```ts
    const result = await build({
      root,
      logLevel: 'warn',
      plugins: [Vue(), ClientSideLayout({ layoutDir: 'src/layouts' })],
      resolve: {
        alias: {
          'vite-plugin-vue-layouts-next/runtime': resolve(fixturesRoot, '..', '..', 'src', 'runtime', 'index.ts'),
        },
      },
      build: {
        rollupOptions: {
          input: resolve(root, 'index.html'),
        },
      },
    })
```

(This test currently exercises `ClientSideLayout`; it will fail until Task 7 — that is expected. Run only the load-hook tests now.)

- [ ] **Step 6: Run tests**

Run: `pnpm vitest run test/load-hook.test.ts`
Expected: the plugin-mode tests PASS. The client-side `normalizes client-side layout keys` and `emits helper` tests still pass because `clientSide.ts` is untouched so far.

- [ ] **Step 7: Commit**

```bash
git add src/RouteLayout.ts src/index.ts test/load-hook.test.ts test/integration.test.ts
git commit -m "feat: generate plugin-mode virtual module from the runtime

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Client-side-mode virtual module uses the runtime

**Files:**
- Modify: `src/clientSide.ts` (whole file), `src/index.ts:146-167`
- Modify: `test/load-hook.test.ts` (client-side describe), `test/integration.test.ts`

**Interfaces:**
- Consumes: `normalizeLayoutName` re-exported from the runtime; `createLayoutWrapper`, `createSetupLayouts`.
- Produces: same virtual-module shape as Task 6.

- [ ] **Step 1: Update client-side load-hook tests**

In `test/load-hook.test.ts`:
- Delete the `getNormalizeLayoutName` helper and the `runInNewContext` import.
- Replace the two tests `normalizes client-side layout keys with Nuxt-compatible names` and `emits helper that normalizes representative layout paths` with:

```ts
    it('builds the layouts map with normalizeLayoutName from the runtime', async () => {
      const plugin = ClientSideLayout({ layoutDir: 'src/layouts', defaultLayout: 'main', inheritDefaultLayout: false }) as Plugin
      const load = getLoadFunction(plugin)
      const result = await load!(MODULE_ID_NULL) as { code: string }

      expect(result.code).toContain('from \'vite-plugin-vue-layouts-next/runtime\'')
      expect(result.code).toContain('export { createGetRoutes, setPageLayout, useLayout }')
      expect(result.code).toContain('import.meta.glob("/src/layouts/**/*.vue", { eager: false })')
      expect(result.code).toContain('normalizeLayoutName(name.replace("/src/layouts/", \'\'))')
      expect(result.code).toContain('const LayoutWrapper = createLayoutWrapper(layouts, \'main\')')
      expect(result.code).toContain('export const setupLayouts = createSetupLayouts(LayoutWrapper, { inheritDefaultLayout: false })')
      expect(result.code).not.toContain('function normalizeLayoutName(file)')
      expect(result.code).not.toContain('function deepSetupLayout')
    })

    it('uses eager glob and module.default in sync mode', async () => {
      const plugin = ClientSideLayout({ layoutDir: 'src/layouts', importMode: 'sync' }) as Plugin
      const load = getLoadFunction(plugin)
      const result = await load!(MODULE_ID_NULL) as { code: string }
      expect(result.code).toContain('{ eager: true }')
      expect(result.code).toContain('layouts[key] = module.default')
    })
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm vitest run test/load-hook.test.ts`
Expected: the two new client-side tests FAIL.

- [ ] **Step 3: Rewrite `src/clientSide.ts`**

Replace the whole file with:

```ts
import { posix } from 'node:path'
import { RUNTIME_ID } from './RouteLayout'

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

export async function createVirtualModuleCode(options: VirtualModuleCodeOptions) {
  const { layoutDir, defaultLayout, importMode, inheritDefaultLayout = true } = options
  const normalizedTarget = normalizePath(layoutDir)
  const isSync = importMode === 'sync'

  return `
import { createGetRoutes, createLayoutWrapper, createSetupLayouts, normalizeLayoutName, setPageLayout, useLayout } from '${RUNTIME_ID}'
export { createGetRoutes, setPageLayout, useLayout }

const modules = import.meta.glob("${normalizedTarget}/**/*.vue", { eager: ${isSync} })

export const layouts = {}
Object.entries(modules).forEach(([name, module]) => {
  const key = normalizeLayoutName(name.replace("${normalizedTarget}/", ''))
  layouts[key] = ${isSync ? 'module.default' : 'module'}
})

const LayoutWrapper = createLayoutWrapper(layouts, '${defaultLayout}')
export const setupLayouts = createSetupLayouts(LayoutWrapper, { inheritDefaultLayout: ${inheritDefaultLayout} })
`
}
```

- [ ] **Step 4: Add `optimizeDeps.include` to `ClientSideLayout`**

In `src/index.ts`, inside the object returned by `ClientSideLayout()` add after `name`:

```ts
    config() {
      return { optimizeDeps: { include: [RUNTIME_ID] } }
    },
```

- [ ] **Step 5: Run the full suite**

Run: `pnpm test`
Expected: PASS, including `test/integration.test.ts` (the fixture build now resolves the runtime through the alias added in Task 6). If the build fails with "Failed to resolve import vue-router", confirm `vue-router` is in root `devDependencies` (it is) and that the alias path points at an existing file.

- [ ] **Step 6: Lint + typecheck, then commit**

Run: `pnpm lint && pnpm typecheck`

```bash
git add src/clientSide.ts src/index.ts test/load-hook.test.ts
git commit -m "feat: generate client-side virtual module from the runtime

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Example — role-based admin layout in `examples/spa`

**Files:**
- Create: `examples/spa/src/layouts/admin.vue`, `examples/spa/src/pages/admin/index.vue`, `examples/spa/src/role.ts`
- Modify: `examples/spa/src/main.ts`, `examples/spa/src/layouts/default.vue`

**Interfaces:**
- Consumes: `setPageLayout`, `useLayout` from `virtual:generated-layouts`.

- [ ] **Step 1: Add a tiny role store**

Create `examples/spa/src/role.ts`:

```ts
import { ref } from 'vue'

export type Role = 'user' | 'admin'
export const role = ref<Role>('user')
```

- [ ] **Step 2: Add the admin layout and page**

Create `examples/spa/src/layouts/admin.vue`:

```vue
<template>
  <main class="px-4 py-10 text-center text-gray-700 dark:text-gray-200">
    <div class="w-1/4 m-auto text-center text-gray-100 bg-red-800">
      Admin Layout
    </div>
    <router-link to="/">
      Back home
    </router-link>
    <router-view />
  </main>
</template>
```

Create `examples/spa/src/pages/admin/index.vue`:

```vue
<script setup lang="ts">
import { useLayout } from 'virtual:generated-layouts'

const layout = useLayout()
</script>

<template>
  <div>
    <p>Admin page — current layout: {{ layout }}</p>
    <p>Switch the role on the home page to see this page rendered in the default layout instead.</p>
  </div>
</template>
```

- [ ] **Step 3: Role-based guard in main.ts**

Replace `examples/spa/src/main.ts` with:

```ts
import { createGetRoutes, setupLayouts } from 'virtual:generated-layouts'
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { routes } from 'vue-router/auto-routes'
import App from './App.vue'
import { role } from './role'

const router = createRouter({
  history: createWebHistory(),
  routes: setupLayouts(routes),
})

// Role-based layout: admin pages use the admin layout only for admins.
router.beforeEach((to) => {
  if (to.path.startsWith('/admin'))
    to.meta.layout = role.value === 'admin' ? 'admin' : 'default'
})

const getRoutes = createGetRoutes(router)
// eslint-disable-next-line no-console
console.log(getRoutes())

const app = createApp(App)

app.use(router)

app.mount('#app')
```

- [ ] **Step 4: Role toggle + in-place switch in the default layout**

Replace `examples/spa/src/layouts/default.vue` with:

```vue
<script setup lang="ts">
import { setPageLayout, useLayout } from 'virtual:generated-layouts'
import { role } from '../role'

const layout = useLayout()

function toggleRole() {
  role.value = role.value === 'admin' ? 'user' : 'admin'
}
</script>

<template>
  <main class="px-4 py-10 text-center text-gray-700 dark:text-gray-200">
    <div class="w-1/4 m-auto text-center text-gray-300 bg-teal-800">
      Default Layout (useLayout: {{ layout }})
    </div>
    <p>
      Role: {{ role }}
      <button @click="toggleRole">
        Toggle role
      </button>
      <router-link to="/admin">
        Go to admin
      </router-link>
      <button @click="setPageLayout('admin')">
        Preview admin layout here
      </button>
    </p>
    <router-view />
  </main>
</template>
```

- [ ] **Step 5: Build the example**

Run: `pnpm build && pnpm spa:build`
Expected: build succeeds. (The example resolves the package via `workspace:*`, so `dist/runtime.mjs` must exist — hence `pnpm build` first.)

- [ ] **Step 6: Commit**

```bash
git add examples/spa
git commit -m "docs(examples): demo role-based dynamic layouts in spa example

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: Documentation, README, CHANGELOG

**Files:**
- Create: `docs/guide/dynamic-layout.md`
- Modify: `docs/.vitepress/config.ts:94-100`, `docs/guide/how-it-works.md`, `docs/guide/patterns.md`, `docs/guide/why.md`, `README.md`, `README.ja.md`, `CHANGELOG.md`

- [ ] **Step 1: Write the guide page**

Create `docs/guide/dynamic-layout.md`:

````md
# Dynamic Layouts

Since v3.1, the layout of a page is resolved when it renders, not when the router is created. That makes three things
possible: changing the layout per navigation from a router guard, switching it in place with `setPageLayout`, and
reading the active layout with `useLayout`.

## Per-navigation: router guards

`setupLayouts` still wraps each page in a parent route, but that parent reads `route.meta.layout` on every navigation.
So a guard can decide the layout, for example based on a user role:

```ts [src/router.ts]
router.beforeEach((to) => {
  if (to.path.startsWith('/admin'))
    to.meta.layout = user.role === 'admin' ? 'admin' : 'default'
})
```

`meta.layout` from the page's `<route>` block is the default; the guard only needs to assign when it wants to override.

## In place: `setPageLayout`

```vue [src/pages/settings.vue]
<script setup lang="ts">
import { setPageLayout } from 'virtual:generated-layouts'
</script>

<template>
  <button @click="setPageLayout('focus')">Focus mode</button>
  <button @click="setPageLayout(false)">No layout</button>
</template>
```

- Takes a layout name or `false` (render the page without a layout).
- The override lasts until the router navigates to a different `path`. Query or hash changes keep it.
- It can be called before the router is ready; the first page then renders with that layout.

## Reading it: `useLayout`

```vue
<script setup lang="ts">
import { useLayout } from 'virtual:generated-layouts'

const layout = useLayout() // ComputedRef<string | false>
</script>
```

## Notes

- Pages with a static `layout: false` are never wrapped, so they cannot be given a layout at runtime.
- An unknown layout name logs a warning and falls back to `defaultLayout`.
- Switching layouts remounts the layout subtree. If you use a `<transition>` keyed on the route (see
  [Common Patterns](/guide/patterns#transitions)), an in-place `setPageLayout` does not change the key, so no transition
  runs.
- These helpers are also exported from `vite-plugin-vue-layouts-next/runtime` if you need them outside the virtual module.
````

- [ ] **Step 2: Sidebar entry**

In `docs/.vitepress/config.ts`, in the `Guide` sidebar group, add `{ text: 'Dynamic Layouts', link: '/guide/dynamic-layout' },` right after `Common Patterns`.

- [ ] **Step 3: Update how-it-works.md**

Append to `docs/guide/how-it-works.md`:

```md

## Resolving the layout at render time

The parent route created for each page does not point at the layout component directly. It uses a small wrapper that
reads `route.meta.layout` (or an in-place override from `setPageLayout`) and renders that layout around the page's
`<router-view>`. The route tree is still static; only the component rendered inside the wrapper is dynamic. See
[Dynamic Layouts](/guide/dynamic-layout).
```

- [ ] **Step 4: Update patterns.md and why.md**

In `docs/guide/patterns.md`, at the end of the **Transitions** section add:

```md
Note that `setPageLayout` changes the layout without changing the route, so a key derived from the route will not
trigger a transition in that case.
```

In `docs/guide/why.md`, in the bullet list under **Relation to vite-plugin-vue-layouts** add:

```md
- **Dynamic layouts.** `setPageLayout` and `useLayout` (modelled on Nuxt) let a page's layout change at runtime — for
  example per user role from a router guard. See [Dynamic Layouts](/guide/dynamic-layout).
```

- [ ] **Step 5: README.md and README.ja.md**

In `README.md`, under `## Usage` add a subsection (after the existing usage code):

````md
### Dynamic layouts

```ts
import { setPageLayout, useLayout } from 'virtual:generated-layouts'

setPageLayout('admin') // switch the current page's layout in place
const layout = useLayout() // ComputedRef<string | false>

router.beforeEach((to) => {
  if (to.path.startsWith('/admin'))
    to.meta.layout = isAdmin() ? 'admin' : 'default'
})
```

See the [Dynamic Layouts guide](https://loicduong.github.io/vite-plugin-vue-layouts-next/guide/dynamic-layout).
````

In `README.ja.md`, add the same block with the heading `### 動的レイアウト` and the sentence `詳細は [Dynamic Layouts ガイド](https://loicduong.github.io/vite-plugin-vue-layouts-next/guide/dynamic-layout) を参照してください。`.

- [ ] **Step 6: CHANGELOG**

In `CHANGELOG.md`, replace `## [Unreleased]` with:

```md
## [Unreleased]

## [3.1.0] - 2026-09-20

### Added

- `setPageLayout()` to change the current page's layout at runtime and `useLayout()` to read it, exported from `virtual:generated-layouts` ([#4](https://github.com/loicduong/vite-plugin-vue-layouts-next/discussions/4))
- `route.meta.layout` is now read on every navigation, so router guards can assign layouts per role
- New `vite-plugin-vue-layouts-next/runtime` entry
- `RouteMeta` type augmentation for `layout` and `isLayout` in `client.d.ts`

### Changed

- Generated layout parent routes use a shared wrapper component that resolves the layout at render time, instead of the layout component itself. `meta.isLayout` is unchanged; code that read `route.matched[n].components.default` of a layout route will now see the wrapper.
```

- [ ] **Step 7: Build docs**

Run: `pnpm docs:build`
Expected: builds with no dead-link errors.

- [ ] **Step 8: Commit**

```bash
git add docs README.md README.ja.md CHANGELOG.md
git commit -m "docs: document dynamic layouts (setPageLayout, useLayout)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 10: Final verification

**Files:** none new.

- [ ] **Step 1: Clean build + full checks**

Run: `pnpm build && pnpm test && pnpm lint && pnpm typecheck`
Expected: all PASS.

- [ ] **Step 2: Build every example**

Run: `pnpm spa:build && pnpm ssg:build && pnpm cli:build && pnpm ner:build`
Expected: all succeed. `ssg:build` uses `VITE_SSG` sync import mode — confirm no warnings about unresolved `vite-plugin-vue-layouts-next/runtime`.

- [ ] **Step 3: Manual smoke test of the spa example**

Run: `pnpm spa:dev`, open the app, then:
1. Click **Go to admin** with role `user` → page renders inside the **Default Layout**.
2. Go home, **Toggle role** → `admin`, **Go to admin** → page renders inside the **Admin Layout**, `useLayout` shows `admin`.
3. On the home page click **Preview admin layout here** → layout switches without navigation; click **Go to admin** or any other link → override is gone.
4. Check the dev server console: no "new dependencies optimized" full-reload after first load.

- [ ] **Step 4: Update the plan checkboxes and commit any leftovers**

```bash
git status
```
Expected: clean tree (all work committed).
