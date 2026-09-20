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
export { normalizeLayoutName } from '../layoutName'
```

`virtual:generated-layouts` re-exports `createGetRoutes`, `setupLayouts`,
`setPageLayout`, `useLayout` and `layouts`. Users import `setPageLayout` and
`useLayout` from `virtual:generated-layouts` (same place as `setupLayouts`);
the `/runtime` entry is an implementation detail but is public so it can be
imported directly if needed.

`client.d.ts` declares the new exports and augments `vue-router`'s `RouteMeta`
with `layout?: string | false` and `isLayout?: boolean`.

## Runtime Behavior

### Layout resolution

Inside the wrapper (and `useLayout`):

```
name = override ?? route.meta.layout ?? defaultLayout
```

- `route.meta` is rebuilt by Vue Router on every navigation, so a guard doing
  `to.meta.layout = 'admin'` is picked up by the computed.
- `override` is a module-level `shallowRef<LayoutName | null>` set by
  `setPageLayout`.
- `undefined`/`null` meta → `defaultLayout`. `false` → no layout.

### Wrapper component

`createLayoutWrapper(layouts, defaultLayout)` returns one component instance
used as the `component` of every generated parent route.

- `name === false` → `h(RouterView)`.
- Otherwise `h(resolve(name), null, { default: () => h(RouterView) })`.
- `resolve(name)`: if `layouts[name]` is a function (async import) wrap it in
  `defineAsyncComponent` once and cache in a `Map`; otherwise return the
  component as-is.
- Unknown name → `console.warn('[vite-plugin-vue-layouts-next] Layout "x" not found, falling back to "default"')`
  and resolve `defaultLayout`. If `defaultLayout` is also missing, render bare
  `RouterView`.
- On `setup`, registers `router.afterEach((to, from) => { if (to.path !== from.path) override.value = null })`
  once per wrapper instance and removes it in `onScopeDispose`.

### `setPageLayout(name)`

Sets `override.value = name`. The override lives until the next navigation to a
different `path` (query/hash changes keep it). Calling it before a router is
active still sets the ref; the wrapper reads it on mount.

### `useLayout()`

Returns `computed(() => name)` using `useRoute()`; usable in any component
rendered under the router.

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
9. `afterEach` guard is removed when the wrapper unmounts.

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
