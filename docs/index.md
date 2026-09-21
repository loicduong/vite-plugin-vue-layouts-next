---
title: vite-plugin-vue-layouts-next
titleTemplate: Router based layouts for Vue
layout: home

hero:
  name: vite-plugin-vue-layouts-next
  text: Router based layouts for Vue
  tagline: Router based layout plugin for Vite 8, Vue 3 and Vue Router 5.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/
    - theme: alt
      text: Config Reference
      link: /config/
    - theme: alt
      text: View on GitHub
      link: https://github.com/loicduong/vite-plugin-vue-layouts-next

features:
  - title: Zero-config layouts
    details: Drop standard Vue components into src/layouts and every page picks up default.vue automatically.
  - title: Per-page layouts
    details: Pick a layout per page from a route block or definePage, with Nuxt-compatible layout names.
  - title: Just nested routes
    details: Layouts compile down to plain vue-router nested routes, so the full vue-router API stays available.
---

## What is it?

`vite-plugin-vue-layouts-next` is a fork of [vite-plugin-vue-layouts](https://github.com/johncampionjr/vite-plugin-vue-layouts) with
improvements and fixes, supporting Vite 8, Vue 3 and Vue Router 5.

Layouts are stored in the `/src/layouts` folder by default and are standard Vue components with a
`<router-view></router-view>` in the template. Pages without a layout specified use `default.vue` for their layout.

You can use route blocks to allow each page to determine its layout. The block below in a page will look for
`/src/layouts/users.vue` for its layout.

```vue
<route lang="yaml">
meta:
  layout: users
</route>
```

Head to [Getting Started](/guide/) to install it, or [Why](/guide/why) for the rationale behind the fork.
