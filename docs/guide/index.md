# Getting Started

## Overview

`vite-plugin-vue-layouts-next` gives Vue Router 5 file-based routes a layout system. Layouts live in `src/layouts` and
are ordinary Vue components with a `<router-view>` in the template; every page is wrapped in one.

It consists of two parts:

- A Vite plugin that scans your layouts directory and generates the `virtual:generated-layouts` module.
- A `setupLayouts` helper that rewrites your route records so each page becomes a child of its layout.

Pages that do not choose a layout use `default.vue`. Pages that do choose one name it through `meta.layout`, using a
[normalized layout name](/config/layout-names).

You can learn more about the rationale behind the fork in the [Why](/guide/why) section, and about the route
transformation in [How it works](/guide/how-it-works).

## Installation

::: code-group

```bash [npm]
npm install -D vite-plugin-vue-layouts-next
```

```bash [yarn]
yarn add -D vite-plugin-vue-layouts-next
```

```bash [pnpm]
pnpm add -D vite-plugin-vue-layouts-next
```

:::

### Compatibility Note

This package targets Vite 6 to 8, Vue 3.2+, and Vue Router 4.0.11 or 5. Page discovery is owned by Vue Router 5's own
Vite plugin — this plugin only resolves layouts, so no page-routing plugin is needed alongside it.

## Adding the Plugin

Add it to your `vite.config.ts`, after `VueRouter()`:

```js [vite.config.js]
import Vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import Layouts from 'vite-plugin-vue-layouts-next'
import VueRouter from 'vue-router/vite'

export default defineConfig({
  plugins: [VueRouter(), Vue(), Layouts()],
})
```

In `main.ts`, import Vue Router 5's generated file-based routes and wrap them with `setupLayouts`:

```js [src/main.ts]
import { setupLayouts } from 'virtual:generated-layouts'
import { createRouter } from 'vue-router'
import { routes } from 'vue-router/auto-routes'

const router = createRouter({
  // ...
  routes: setupLayouts(routes),
})
```

See the [Config Section](/config/) for the options `Layouts()` accepts.

## Writing a Layout

A layout is a standard Vue component whose template renders a `<router-view>`:

```vue [src/layouts/default.vue]
<template>
  <div class="app">
    <header>My site</header>
    <router-view />
  </div>
</template>
```

Every page without an explicit layout renders inside this one.

## Choosing a Layout Per Page

A page selects its layout through `meta.layout`, either in a `<route>` block:

```html [src/pages/users.vue]
<route lang="yaml">
meta:
  layout: users
</route>
```

or with `definePage`:

```vue [src/pages/users.vue]
<script setup lang="ts">
definePage({
  meta: {
    layout: 'users',
  },
})
</script>
```

Both look for `src/layouts/users.vue`. Note that the value is a *layout name*, not a path — see
[Layout Names](/config/layout-names).

## Client Types

To get type definitions for `virtual:generated-layouts`, add the client types to your `tsconfig`:

```json [tsconfig.json]
{
  "compilerOptions": {
    "types": ["vite-plugin-vue-layouts-next/client"]
  }
}
```

## Trying It Out

The repository ships four runnable setups covering SPA, SSG, client-side layouts and nested routes. See
[Examples](/guide/examples).
