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
  <button @click="setPageLayout('focus')">
    Focus mode
  </button>
  <button @click="setPageLayout(false)">
    No layout
  </button>
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
- In a nested route (a page with children, each level with its own `layout`), guards and `setPageLayout` target the
  *innermost* layout — the one directly around the leaf page. The static layouts of the outer levels are unaffected.
- An unknown layout name logs a warning and falls back to `defaultLayout`.
- Layouts are rendered by a shared wrapper component, not matched as route components, so an Options-API
  `beforeRouteEnter` / `beforeRouteUpdate` / `beforeRouteLeave` declared *inside a layout component* never runs; a
  warning is logged once per layout name when this is detected. Use `onBeforeRouteUpdate` / `onBeforeRouteLeave`
  (Composition API) or a router-level guard instead — these still work correctly.
- **Vue < 3.3:** `app.runWithContext` doesn't exist yet, so the wrapper's `beforeRouteEnter` can't reach the router to
  preload a lazy layout, and the global `beforeResolve` fallback is only installed once a wrapper's `setup()` has run
  at least once. In practice this only matters for a lazy layout selected by a *page's own* `beforeRouteEnter` during
  the *initial* navigation: it renders once its chunk loads instead of being awaited by the navigation. Static `meta.layout`,
  `<route>` blocks, `beforeEach`, route-level `beforeEnter`, and any navigation after the first are unaffected.
- `useLayout()` returns the *requested* name — `meta.layout`, or the last value passed to `setPageLayout` — not the
  rendered fallback. So for an unknown name it still reports that name, even though the wrapper renders
  `defaultLayout` (and warns). This matches Nuxt's `useLayout` semantics.
- Switching layouts remounts the layout subtree. If you use a `<transition>` keyed on the route (see
  [Common Patterns](/guide/patterns#transitions)), an in-place `setPageLayout` does not change the key, so no transition
  runs.
- These helpers are also exported from `vite-plugin-vue-layouts-next/runtime` if you need them outside the virtual module.
- The override is module-level state. During SSG pre-rendering (vite-ssg creates a fresh app per route in one process)
  do not call `setPageLayout` in a component's setup: the override would leak into the routes pre-rendered after it.
  Use `meta.layout` or a router guard instead.
- The override is cleared by a guard that the layout wrapper installs on first mount. If the app's first route has a
  static `layout: false`, a `setPageLayout` called there is not cleared until a wrapper has mounted once.
- Layouts may be any component, including a bare functional component. If you build a `layouts` map by hand for
  `createLayoutWrapper`, wrap `() => import()` factories with `lazyLayout()` from `vite-plugin-vue-layouts-next/runtime`
  so they aren't mistaken for a synchronous component.
- The `RouteMeta` augmentation (`layout?: string | false`, `isLayout?: boolean`) ships in
  `vite-plugin-vue-layouts-next/runtime` and reaches you through `client.d.ts`, which imports types via the package's
  `exports`. This requires `moduleResolution: "bundler"` (or `node16`/`nodenext`) in `tsconfig.json` — the Vite default.
