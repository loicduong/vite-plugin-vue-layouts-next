# Dynamic Layouts (`setPageLayout` / `useLayout`)

## Context

`setupLayouts` currently bakes each layout into the route tree as a static
parent route: `component: layouts[route.meta.layout ?? defaultLayout]`. The
layout name is read exactly once, when the router is created. Nothing can change
a page's layout afterwards, so role-based layouts (see
[discussion #4](https://github.com/loicduong/vite-plugin-vue-layouts-next/discussions/4))
are impossible without a hand-written "shell" layout.

Nuxt 4.5 solves this by keeping the layout as a reactive value
(`route.meta.layout`) and rendering it through a wrapper (`<NuxtLayout>`), with
`setPageLayout()` to change it and `useLayout()` to read it. This spec brings the
same model to this plugin while keeping the existing route-tree API.

The runtime code is currently an inline string, duplicated between
`src/RouteLayout.ts` (plugin mode) and `src/clientSide.ts` (client-side mode),
and is only tested as a string. The new behavior is reactive logic that must be
tested against a real router, so the runtime moves into a real module.

## Goals

- Change a page's layout at runtime, per navigation (router guard) or in place
  (`setPageLayout`).
- Expose the resolved layout reactively (`useLayout`).
- Keep `setupLayouts`, `createGetRoutes`, `meta.isLayout`, `layout: false`,
  `inheritDefaultLayout` and layout-name normalization behavior unchanged.
- Single runtime implementation shared by plugin mode and client-side mode,
  covered by tests that mount a real Vue app + Vue Router.
- Ship as a minor release (`3.1.0`).

## Non-Goals

- `routeRules.appLayout`-style config. Users do the same with
  `router.beforeEach`.
- Layout props (`setPageLayout(name, props)`).
- SSR/hydration handling. This plugin targets SPA/SSG builds; SSG pre-render
  uses the static `meta.layout` and `setPageLayout` is a client-side concern.
- A `<Layout>` component for pages to render their own layout
  (`layout: false` + `<NuxtLayout :name>`). Pages with `layout: false` can
  already render any component themselves.
- Making statically `layout: false` routes dynamically layout-able. They stay
  unwrapped, exactly as today.

## Public API

New entry `vite-plugin-vue-layouts-next/runtime` (`src/runtime/index.ts`):

```ts
export type LayoutName = string | false
export type LayoutMap = Record<string, Component | (() => Promise<unknown>)>

export function createGetRoutes(router: Router, withLayout?: boolean): () => RouteRecordRaw[]
export function createLayoutWrapper(layouts: LayoutMap, defaultLayout: string): Component
export function createSetupLayouts(
  wrapper: Component,
  options: { inheritDefaultLayout: boolean },
): (routes: readonly RouteRecordRaw[]) => RouteRecordRaw[]
export function setPageLayout(name: LayoutName): void
export function useLayout(): ComputedRef<LayoutName>
export { normalizeLayoutName } from '../layoutName'   // layoutName.ts drops its node:path import so it is browser-safe
```

`virtual:generated-layouts` re-exports `createGetRoutes`, `setupLayouts`,
`setPageLayout`, `useLayout` and `layouts`. Users import `setPageLayout` and
`useLayout` from `virtual:generated-layouts` (same place as `setupLayouts`);
the `/runtime` entry is an implementation detail but is public so it can be
imported directly if needed.

`client.d.ts` declares the new exports. The `RouteMeta` augmentation
(`layout?: string | false` and `isLayout?: boolean`) lives in
`src/runtime/index.ts` (bundled into `dist/runtime.d.mts`) and reaches
consumers via `client.d.ts`.

## Runtime Behavior

### Layout resolution

`useRoute().meta` is the *merged* meta of every matched record (leaf wins), so a
wrapper must not read the layout from it directly: with nested route trees
(`pages/news.vue` + `pages/news/index.vue`, each with its own `layout`) every
wrapper would resolve to the leaf's layout. Each wrapper therefore resolves
from its **own wrapped record**:

```
own       = inject(matchedRouteKey).value          // the generated parent record
idx       = route.matched.indexOf(own)
page      = route.matched[idx + 1]                 // the record this wrapper wraps
static    = page.meta.layout || defaultLayout      // own record meta, `||` like the original
innermost = no record after idx + 1 has meta.isLayout
guard     = route.meta.layout !== staticMerged ? route.meta.layout : undefined
            // staticMerged = fold of own `meta.layout` over route.matched
name      = innermost ? (override ?? guard ?? static) : static
```

- Static layouts reproduce the original algorithm exactly (per-record
  `meta.layout`, `||` fallback to `defaultLayout`, nested `layout: false`
  children stay inside the parent's layout).
- Dynamic inputs (`setPageLayout` override and guard assignments to
  `to.meta.layout`) apply only to the innermost wrapper — the one directly
  wrapping the leaf page. A guard assignment is detected as "merged
  `route.meta.layout` differs from what the records alone would produce".
- `false` → no layout.

### Wrapper component

`createLayoutWrapper(layouts, defaultLayout)` returns one component used as
the `component` of every generated parent route.

- `name === false` → `h(RouterView)`.
- Otherwise `h(resolve(name), null, { default: () => h(RouterView) })`.
- `resolve(name)`: returns the cached, already-loaded component if the
  record's `beforeEnter` preload (below) has resolved it; otherwise, if
  `layouts[name]` is a function, wraps it in `defineAsyncComponent` once
  (cached per name); otherwise returns the component as-is.
- Unknown name → `console.warn('[vite-plugin-vue-layouts-next] Layout "x" not found, falling back to "default"')`
  once per name, then resolve `defaultLayout`. If `defaultLayout` is also
  missing, render bare `RouterView`.
- `createLayoutWrapper` also builds a standalone `NavigationGuard` (`preload`)
  and returns it attached to the component under `Symbol.for('vite-plugin-vue-layouts-next:preload')`.
  `createSetupLayouts` reads that symbol once and, when present, sets it as
  `beforeEnter` on every generated parent route record — so it runs during
  navigation resolution for *any* matched record, including the initial
  navigation, before any wrapper has ever mounted. For every `meta.isLayout`
  record in `to.matched`, it computes the name that wrapper will render
  (same rule as above, using `override`/guard for the innermost) and, if
  `layouts[name]` is a function, `await`s it and stores the resolved
  component (`mod.default ?? mod`) in the cache. This keeps the original
  timing: lazy layouts load *before* the navigation is confirmed, the
  previous page stays visible, and a chunk load error fails the navigation.
  In-place `setPageLayout` to a not-yet-loaded lazy layout falls back to
  `defineAsyncComponent`.
- On `setup`, installs the `afterEach` override-reset guard once per router
  (module-level `WeakSet<Router>`), which also registers the same `preload`
  guard with `router.beforeResolve` so a guard that switches layouts between
  params of a reused route record (e.g. `/user/1` -> `/user/2`, where
  `beforeEnter` never fires) is still preloaded before the navigation confirms:
  `router.afterEach((to, from) => { if (from !== START_LOCATION && to.path !== from.path) override.value = null })`
  — the initial navigation is skipped so `setPageLayout` called before the
  router is ready still applies to the first page. `beforeEnter` runs before
  `afterEach`, so this reset logic is unaffected by the move.

### `setupLayouts`

`createSetupLayouts(wrapper, { inheritDefaultLayout })` contains the existing
`deepSetupLayout` algorithm verbatim, with the two `component: layouts[...]`
sites replaced by `component: wrapper`. Route shape, `meta.isLayout`, the
`layout: false` branch and `inheritDefaultLayout` are unchanged.

## Generated Virtual Module

Both modes generate:

```js
import { createGetRoutes, createLayoutWrapper, createSetupLayouts, setPageLayout, useLayout } from 'vite-plugin-vue-layouts-next/runtime'
export { createGetRoutes, setPageLayout, useLayout }

export const layouts = { /* mode-specific */ }
const LayoutWrapper = createLayoutWrapper(layouts, '<defaultLayout>')
export const setupLayouts = createSetupLayouts(LayoutWrapper, { inheritDefaultLayout: <bool> })
```

The plugin's `resolveId` does not special-case the runtime import; Vite resolves
`vite-plugin-vue-layouts-next/runtime` through the package's own `exports`.
Both plugin factories add `optimizeDeps.include: ['vite-plugin-vue-layouts-next/runtime']`
in a `config` hook so dev mode does not trigger a late re-optimization reload.
Tests that build a fixture app alias the specifier to `src/runtime/index.ts`.

- Plugin mode (`src/RouteLayout.ts` + `src/importCode.ts`): `layouts` built from
  scanned files as today (sync `import` or `() => import()` per `importMode`).
- Client-side mode (`src/clientSide.ts`): `layouts` built from
  `import.meta.glob` + `normalizeLayoutName` imported from the runtime entry.
  The ~60 lines of inlined regex/normalization string are removed.

## Package / Build

- `tsdown` entries: `src/index.ts`, `src/runtime/index.ts` →
  `dist/runtime.mjs`, `dist/runtime.d.mts`. `vue` and `vue-router` external.
- `package.json`: add `"./runtime": { types, import }` to `exports`; bump to
  `3.1.0`.
- Peer ranges unchanged: wrapper uses only `useRoute`, `useRouter`,
  `RouterView`, `afterEach` (vue-router 4 & 5) and `defineAsyncComponent`,
  `onScopeDispose`, `shallowRef`, `computed` (vue ≥ 3.2).

## Testing

Dev deps: `happy-dom`, `@vue/test-utils`. New file `test/runtime.test.ts`
with `// @vitest-environment happy-dom`; existing tests keep `node`.

Fixture: `createRouter({ history: createMemoryHistory() })`, layouts
`default`, `admin` (sync) and `lazy` (async), pages as inline components,
routes built with the real `createSetupLayouts`.

Cases:

1. `meta.layout: 'admin'` renders inside admin; no meta renders inside default.
2. `router.beforeEach(to => { if (to.path.startsWith('/admin')) to.meta.layout = 'admin' })`
   switches layout per navigation.
3. `setPageLayout('admin')` from a page updates the DOM without navigation;
   navigating to another path resets to that route's meta; same path with a
   different query keeps the override.
4. `setPageLayout(false)` renders the page with no layout.
5. `useLayout()` reflects cases 1–4.
6. Async layout resolves; `defineAsyncComponent` is created once per name.
7. Unknown name warns and falls back to default.
8. Static `layout: false` route is not wrapped (regression).
9. The reset guard is registered once per router even when the wrapper mounts
   several times (navigating through a `layout: false` route and back).
10. `setPageLayout('admin')` called before the initial navigation applies to
    the first rendered page.
11. Nested trees render exactly as 3.0.0: parent without layout + child
    `layout: 'second'` → `default > second > page`; parent `'a'` + child
    `'b'` → `a > b > page`; parent `'second'` + child `layout: false` →
    `second > page`. A guard / `setPageLayout` on a nested route changes only
    the innermost layout.
12. A lazy layout is loaded before the navigation is confirmed (the
    `beforeResolve` preload): the DOM shows the new layout on the first
    render after `router.push` resolves, with no empty intermediate render.

`test/load-hook.test.ts` and `test/integration.test.ts` are updated to assert
the new module shape (imports from `/runtime`; no inline regex) and to import
`normalizeLayoutName` from `src/layoutName.ts` instead of parsing the string.

## Docs, Example, Changelog

- `examples/spa`: `layouts/admin.vue`, `pages/admin/index.vue`, a role toggle in
  `default.vue` calling `setPageLayout`, a role-based `router.beforeEach` in
  `main.ts`.
- `docs/guide/dynamic-layout.md`: `setPageLayout`, `useLayout`, role-based
  guard pattern, `false`, note on `<transition :key>` when switching without
  navigation. Sidebar entry added.
- Update `how-it-works.md` (parent component is a wrapper that resolves the
  layout at render time), `patterns.md`, `why.md`, `README.md`, `README.ja.md`.
- `CHANGELOG.md` `[3.1.0]`:
  - Added: `setPageLayout`, `useLayout`, `/runtime` entry, `RouteMeta` types.
  - Changed: generated parent routes use a shared wrapper component instead of
    the layout component itself (affects anyone reading
    `route.matched[n].components.default` of a layout route; `meta.isLayout`
    is unchanged).

## Versioning

`3.1.0`. Additive public API; the only observable change is the parent route's
component identity, which is undocumented and covered by a changelog note.
