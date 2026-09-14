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
