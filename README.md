# vite-plugin-vue-layouts-next

[![npm version](https://img.shields.io/npm/v/vite-plugin-vue-layouts-next)](https://www.npmjs.com/package/vite-plugin-vue-layouts-next)

> Router based layout for Vue 3 applications using [Vite](https://github.com/vitejs/vite)

## Overview

A fork of [vite-plugin-vue-layouts](https://github.com/JohnCampionJr/vite-plugin-vue-layouts) with some improvements and fixes, supports the latest versions of Vite and Vue.

This works best along with the [vite-plugin-pages](https://github.com/hannoeru/vite-plugin-pages).

Layouts are stored in the `/src/layouts` folder by default and are standard Vue components with a `<router-view></router-view>` in the template.

Pages without a layout specified use `default.vue` for their layout.

You can use route blocks to allow each page to determine its layout.  The block below in a page will look for `/src/layouts/users.vue` for its layout.

See the [Vitesse starter template](https://github.com/antfu/vitesse) for a working example with [vite-plugin-vue-layouts](https://github.com/JohnCampionJr/vite-plugin-vue-layouts) and it also works similarly with this.

```html
<route lang="yaml">
meta:
  layout: users
</route>
```

## Getting Started

Install Layouts:

```bash
npm install -D vite-plugin-vue-layouts-next
```

Add to your `vite.config.js`:

```js
import Vue from '@vitejs/plugin-vue'
import Pages from 'vite-plugin-pages'
import Layouts from 'vite-plugin-vue-layouts-next'

export default {
  plugins: [Vue(), Pages(), Layouts()],
}
```

In main.ts, you need to add a few lines to import the generated code and setup the layouts.

## vue-router

```js
import { setupLayouts } from 'virtual:generated-layouts'
import { createRouter } from 'vue-router'
import generatedRoutes from '~pages'

const routes = setupLayouts(generatedRoutes)

const router = createRouter({
  // ...
  routes,
})
```

## [unplugin-vue-router](https://github.com/posva/unplugin-vue-router)

```js
import { setupLayouts } from 'virtual:generated-layouts'
import { createRouter } from 'vue-router'
import { routes } from 'vue-router/auto-routes'

const router = createRouter({
  // ...
  routes: setupLayouts(routes),
})
```

## Client Types

If you want type definition of `virtual:generated-layouts`, add `vite-plugin-vue-layouts-next/client` to `compilerOptions.types` of your `tsconfig`:

```json
{
  "compilerOptions": {
    "types": ["vite-plugin-vue-layouts-next/client"]
  }
}
```

## Configuration

```ts
interface UserOptions {
  layoutsDirs?: string | string[]
  pagesDirs?: string | string[] | null
  extensions?: string[]
  exclude?: string[]
  defaultLayout?: string
  wrapComponent?: boolean
  importMode?: (name: string) => 'sync' | 'async'
}
```

### Using configuration

To use custom configuration, pass your options to Layouts when instantiating the plugin:

```js
// vite.config.js
import Layouts from 'vite-plugin-vue-layouts-next'

export default {
  plugins: [
    Layouts({
      layoutsDirs: 'src/mylayouts',
      pagesDirs: 'src/pages',
      defaultLayout: 'myDefault'
    }),
  ],
}
```

### layoutsDirs

Relative path to the layouts directory. Supports globs.
All .vue files in this folder are imported async into the generated code.

Can also be an array of layout dirs

Can use `**` to support scenarios like `module1/layouts` and `modules2/layouts` with a setting of `src/**/layouts`

Any files named `__*__.vue` will be excluded, and you can specify any additional exclusions with the `exclude` option

**Default:** `'src/layouts'`

### pagesDirs

Defines the pages dir to avoid HMR reloading for all added or deleted files anywhere in the project.

Relative path to the pages directory.  If you want it to watch for all files, like in v0.8.0 or earlier, set to null.

Can also be an array of layout dirs or use `**` glob patterns

**Default:** `'src/pages'`

### extensions

Valid file extensions for page components.

**Default:** `['vue']`

### exclude

List of path globs to exclude when resolving pages.

### defaultLayout

Filename of default layout (".vue" is not needed).

**Default:** `'default'`

### importMode

Mode for importing layouts.

**Default:** ssg is `'sync'`，other is `'async'`

### wrapComponent

If set to `true`, wraps the route's internal component with a layout instead of adding a wrapping route. This can be useful for better performance and simpler route structure. Especially if you have extensive routes, you can use this to avoid the overhead of adding a wrapping route for each page and maintain an easily parsable route structure.

**Default:** `false`

## How it works

`setupLayouts` transforms the original `router` by

1. Replacing every page with its specified layout
2. Appending the original page in the `children` property.

Simply put, layouts are [nested routes](https://next.router.vuejs.org/guide/essentials/nested-routes.html#nested-routes) with the same path.

Before:

```text
router: [ page1, page2, page3 ]
```

After `setupLayouts()`:

```text
router: [
  layoutA: page1,
  layoutB: page2,
  layoutA: page3,
]
```

That means you have the full flexibility of the [vue-router API](https://next.router.vuejs.org/api/) at your disposal.

## Common patterns

### Transitions

Layouts and Transitions work as expected and explained in the [vue-router docs](https://next.router.vuejs.org/guide/advanced/transitions.html) only as long as `Component` changes on each route. So if you want a transition between pages with the same layout *and* a different layout, you have to mutate `:key` on `<component>` (for a detailed example, see the vue docs about [transitions between elements](https://v3.vuejs.org/guide/transitions-enterleave.html#transitioning-between-elements)).

`App.vue`

```html
<template>
  <router-view v-slot="{ Component, route }">
    <transition name="slide">
      <component :is="Component" :key="route" />
    </transition>
  </router-view>
</template>
```

Now Vue will always trigger a transition if you change the route.

### Data from layout to page

If you want to send data *down* from the layout to the page, use props

```html
<router-view foo="bar" />
```

### Set static data at the page

If you want to set state in your page and do something with it in your layout, add additional properties to a route's `meta` property. Doing so only works if you know the state at build-time.

You can use the `<route>` block if you work with [vite-plugin-pages](https://github.com/hannoeru/vite-plugin-pages).

In `page.vue`:

```html
<template><div>Content</div></template>
<route lang="yaml">
meta:
  layout: default
  bgColor: yellow
</route>
```

Now you can read `bgColor` in `layout.vue`:

```html
<script setup>
import { useRouter } from 'vue-router'
</script>
<template>
  <div :style="`background: ${useRouter().currentRoute.value.meta.bgColor};`">
    <router-view />
  </div>
</template>
```

### Data dynamically from page to layout

If you need to set `bgColor` dynamically at run-time, you can use [custom events](https://v3.vuejs.org/guide/component-custom-events.html#custom-events).

Emit the event in `page.vue`:

```html
<script setup>
import { defineEmit } from 'vue'
const emit = defineEmit(['setColor'])

if (2 + 2 === 4)
  emit('setColor', 'green')
else
  emit('setColor', 'red')
</script>
```

Listen for `setColor` custom-event in `layout.vue`:

```html
<script setup>
import { ref } from 'vue'

const bgColor = ref('yellow')
const setBg = (color) => {
  bgColor.value = color
}
</script>

<template>
  <main :style="`background: ${bgColor};`">
    <router-view @set-color="setBg" />
  </main>
</template>
```

## ClientSideLayout

The clientSideLayout uses a simpler [virtual file](https://vitejs.dev/guide/api-plugin.html#importing-a-virtual-file) + [glob import](https://vitejs.dev/guide/features.html#glob-import) scheme, This means that its hmr is faster and more accurate, but also more limited

### Usage

```js
// vite.config.js
import { ClientSideLayout } from 'vite-plugin-vue-layouts-next'

export default {
  plugins: [
    ClientSideLayout({
      layoutsDir: 'src/mylayouts', // default to 'src/layouts'
      defaultLayout: 'myDefault', // default to 'default', no need '.vue'
      importMode: 'sync' // The default will automatically detect -> ssg is sync，other is async
    }),
  ],
}
```
