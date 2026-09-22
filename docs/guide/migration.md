# Migration

If you are migrating an older setup, use Vue Router 5 file-based routing as the route source and let this plugin handle
layouts only.

## 1. Remove legacy page-route plugin dependencies and types

```diff
- import Pages from 'vite-plugin-pages'
- /// <reference types="vite-plugin-pages/client" />
```

## 2. Add Vue Router 5's Vite plugin before Vue

```diff [vite.config.js]
 import Vue from '@vitejs/plugin-vue'
+import VueRouter from 'vue-router/vite'
 import Layouts from 'vite-plugin-vue-layouts-next'

 export default defineConfig({
-  plugins: [Vue(), Pages(), Layouts()],
+  plugins: [VueRouter(), Vue(), Layouts()],
 })
```

## 3. Replace generated page-route imports with Vue Router 5 auto routes

```diff
 import { setupLayouts } from 'virtual:generated-layouts'
-import generatedRoutes from 'virtual:generated-pages'
-import generatedRoutes from '~pages'
+import { routes } from 'vue-router/auto-routes'

-const routes = setupLayouts(generatedRoutes)
+const layoutRoutes = setupLayouts(routes)
```

## 4. Drop `pagesDirs`

Remove `pagesDirs` from `Layouts()` options. Vue Router 5 owns page discovery and route HMR; this plugin only watches
and resolves layouts.

## Layout name normalization

v3 uses Nuxt-compatible layout names. Nested layout names no longer use slash-separated paths.

```diff
 definePage({
   meta: {
-    layout: 'sub/layoutsub',
+    layout: 'sub-layoutsub',
   },
 })
```

See [Layout names](/config/layout-names) for the full normalization table.

## Redirects and other route options

`vite-plugin-pages` let a `<route>` block set any route record field. With Vue Router 5 file-based routing, put those
fields in `definePage()` instead - the same way Nuxt's `definePageMeta()` works. `setupLayouts` keeps them on the route
record, so they work with layouts too.

For example, a page at `src/pages/settings/legacy.vue` that forwards to the new settings page:

```diff
-<route>
-{
-  "name": "settings-legacy",
-  "meta": { "title": "Settings" },
-  "redirect": { "name": "/settings/profile" }
-}
-</route>
+<script setup lang="ts">
+definePage({
+  name: 'settings-legacy',
+  meta: { title: 'Settings' },
+  redirect: { name: '/settings/profile' },
+})
+</script>
```

Route names are generated from the file path by default (`src/pages/settings/profile.vue` becomes `/settings/profile`),
so a redirect target must use that name unless the target page overrides it with `definePage({ name: '...' })`.
