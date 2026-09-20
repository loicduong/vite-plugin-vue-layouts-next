# How it works

`setupLayouts` transforms the original `router` by

1. Replacing every page with its specified layout
2. Appending the original page in the `children` property.

Simply put, layouts are [nested routes](https://next.router.vuejs.org/guide/essentials/nested-routes.html#nested-routes)
with the same path.

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

For nested routes, [`inheritDefaultLayout`](/config/plugin-options#inheritdefaultlayout) controls whether a parent route still
receives the default layout when a child route declares its own.

## Resolving the layout at render time

The parent route created for each page does not point at the layout component directly. It uses a small wrapper that
resolves the layout and renders it around the page's `<router-view>`. Each wrapper resolves from its *own wrapped
record*: the `layout` of the page it wraps, falling back to `defaultLayout`, so a nested route with a `layout` at each
level renders one layout per level, exactly as before. The innermost wrapper additionally honours a `meta.layout`
assigned in a router guard and an in-place override from `setPageLayout`. The wrapper's own `beforeRouteEnter` guard
installs a global `beforeResolve` on first use and preloads lazy layouts, so a lazy layout is loaded before the
navigation is confirmed — including the very first navigation and layouts chosen by a page's own guards — and there
is no unstyled flash while a wrapper mounts for the first time. The route tree is still static; only the
component rendered inside the wrapper is dynamic. See [Dynamic Layouts](/guide/dynamic-layout).
