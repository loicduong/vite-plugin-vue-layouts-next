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
