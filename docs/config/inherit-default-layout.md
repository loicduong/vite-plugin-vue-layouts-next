# inheritDefaultLayout

- **Type:** `boolean`
- **Default:** `true`

Whether nested routes should inherit the default layout from parent routes.

When `false`, if a child route has its own layout, the parent route won't use the default layout. This prevents
double-wrapping layouts when child routes specify their own layout.

This option applies to Vue Router 5 file-based routes, which generate nested route structures with `children` arrays.
This option can only be set globally in the plugin configuration.

```js
Layouts({
  inheritDefaultLayout: false,
})
```
