# defaultLayout

- **Type:** `string`
- **Default:** `'default'`

Normalized layout name to use when a route does not specify `meta.layout`.

For example, `myDefault.vue` is named `my-default`, so use:

```js
Layouts({
  defaultLayout: 'my-default',
})
```

The value is a *layout name*, not a filename — see [Layout names](/config/layout-names).
