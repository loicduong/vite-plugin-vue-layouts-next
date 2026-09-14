---
title: Configuring the Plugin
---

# Configuring the Plugin

The plugin is configured by passing an options object to `Layouts()` inside your Vite config. With no options, layouts
are read from `src/layouts` and pages fall back to `default.vue`.

```js [vite.config.js]
import Vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import Layouts from 'vite-plugin-vue-layouts-next'
import VueRouter from 'vue-router/vite'

export default defineConfig({
  plugins: [
    VueRouter(),
    Vue(),
    Layouts({
      layoutsDirs: 'src/mylayouts',
      defaultLayout: 'my-default',
    }),
  ],
})
```

## Config Intellisense

The plugin ships with TypeScript typings, so options are checked when your Vite config is a `.ts` file. In a plain
JavaScript config you can get the same completion through a JSDoc type hint:

```js [vite.config.js]
/** @type {import('vite-plugin-vue-layouts-next').UserOptions} */
const layoutsOptions = {
  // ...
}
```

## Client Types

To type the `virtual:generated-layouts` module, add `vite-plugin-vue-layouts-next/client` to `compilerOptions.types`
of your `tsconfig`:

```json [tsconfig.json]
{
  "compilerOptions": {
    "types": ["vite-plugin-vue-layouts-next/client"]
  }
}
```

That declares `setupLayouts` and the generated `layouts` map:

```ts
import { setupLayouts } from 'virtual:generated-layouts'
```

## Options Reference

- [Plugin Options](/config/plugin-options) — every option accepted by `Layouts()`
- [Layout Names](/config/layout-names) — how filenames become layout names
- [ClientSideLayout Options](/config/client-side-options) — options for the lighter `ClientSideLayout` variant
