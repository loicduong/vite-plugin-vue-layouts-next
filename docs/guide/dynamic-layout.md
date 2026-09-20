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
- `useLayout()` returns the *requested* name — `meta.layout`, or the last value passed to `setPageLayout` — not the
  rendered fallback. So for an unknown name it still reports that name, even though the wrapper renders
  `defaultLayout` (and warns). This matches Nuxt's `useLayout` semantics.
- Switching layouts remounts the layout subtree. If you use a `<transition>` keyed on the route (see
  [Common Patterns](/guide/patterns#transitions)), an in-place `setPageLayout` does not change the key, so no transition
  runs.
- These helpers are also exported from `vite-plugin-vue-layouts-next/runtime` if you need them outside the virtual module.
- The `RouteMeta` augmentation (`layout?: string | false`, `isLayout?: boolean`) ships in
  `vite-plugin-vue-layouts-next/runtime` and reaches you through `client.d.ts`, which imports types via the package's
  `exports`. This requires `moduleResolution: "bundler"` (or `node16`/`nodenext`) in `tsconfig.json` — the Vite default.
