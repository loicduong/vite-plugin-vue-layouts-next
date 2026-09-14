# Getting Started

## Install

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

## Usage

Add to your `vite.config.ts`:

```js
import Vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import Layouts from 'vite-plugin-vue-layouts-next'
import VueRouter from 'vue-router/vite'

export default defineConfig({
  plugins: [VueRouter(), Vue(), Layouts()],
})
```

In `main.ts`, import Vue Router 5's generated file-based routes and setup the layouts.

```js
import { setupLayouts } from 'virtual:generated-layouts'
import { createRouter } from 'vue-router'
import { routes } from 'vue-router/auto-routes'

const router = createRouter({
  // ...
  routes: setupLayouts(routes),
})
```

## Choosing a layout per page

Layouts live in `src/layouts` and are ordinary Vue components containing a `<router-view>`:

```vue
<!-- src/layouts/users.vue -->
<template>
  <div class="users-layout">
    <router-view />
  </div>
</template>
```

A page selects its layout through `meta.layout`:

```html
<route lang="yaml">
meta:
  layout: users
</route>
```

Pages that do not specify a layout use `default.vue`. See [Layout names](/config/layout-names) for how filenames map
to layout names.

## Client Types

If you want type definition of `virtual:generated-layouts`, add `vite-plugin-vue-layouts-next/client` to
`compilerOptions.types` of your `tsconfig`:

```json
{
  "compilerOptions": {
    "types": ["vite-plugin-vue-layouts-next/client"]
  }
}
```

## Next steps

- [How it works](/guide/how-it-works) — what `setupLayouts` does to your routes
- [Config](/config/) — every plugin option
- [Migration](/guide/migration) — coming from an older setup
