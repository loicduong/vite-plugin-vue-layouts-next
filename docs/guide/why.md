# Why

## The Problem

Vue Router has no concept of a layout. What it has is [nested routes](https://router.vuejs.org/guide/essentials/nested-routes.html):
a parent route component renders a `<router-view>`, and child routes render inside it.

That is enough to build layouts by hand, but with file-based routing it means writing route records manually — exactly
the work file-based routing exists to avoid. Every new page has to be nested under the right parent by hand, and moving
a page between layouts means editing route definitions rather than the page itself.

## The Approach

This plugin closes that gap without inventing a new routing model. It scans a layouts directory, generates a map of
layout name to component, and `setupLayouts` rewrites your generated routes so each page becomes a child of the layout
it asked for.

The output is plain Vue Router route records. Nothing about the router is wrapped or replaced, so guards, meta fields,
scroll behavior and the rest of the [vue-router API](https://router.vuejs.org/api/) keep working exactly as documented.
See [How it works](/guide/how-it-works) for the transformation itself.

Layout choice stays with the page — a `meta.layout` value in a `<route>` block or `definePage` — so the page remains the
single file you edit.

## Relation to vite-plugin-vue-layouts

This package is a fork of [vite-plugin-vue-layouts](https://github.com/JohnCampionJr/vite-plugin-vue-layouts) with
improvements and fixes. The differences that matter when choosing between them:

- **Vite 8, Vue 3 and Vue Router 5 support.** The `peerDependencies` accept Vite 6 to 8 and Vue Router 4.0.11 or 5.
- **Vue Router 5 owns page discovery.** There is no `pagesDirs` option; routes come from `vue-router/auto-routes`, and
  this plugin only watches and resolves layouts.
- **Nuxt-compatible layout names.** Nested layouts are flattened to kebab-case names such as `desktop-default` instead
  of slash-separated paths. See [Layout Names](/config/layout-names).
- **`inheritDefaultLayout`.** Controls whether a parent route still receives the default layout when a child route
  declares its own, which avoids double-wrapped layouts in nested route trees.

If you are coming from the original plugin or from an older version of this one, see [Migration](/guide/migration).

## Two Implementations

There are two exports, and they solve the same problem with different trade-offs:

- `Layouts()` — the default. Resolves layouts at build time and generates explicit imports.
- [`ClientSideLayout()`](/guide/client-side-layout) — a lighter variant built on `import.meta.glob`. HMR is faster and
  more accurate, but it is more limited.
