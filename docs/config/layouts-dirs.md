# layoutsDirs

- **Type:** `string | string[]`
- **Default:** `'src/layouts'`

Relative path to the layouts directory. Supports globs. All `.vue` files in this folder are imported async into the
generated code.

Can also be an array of layout dirs:

```js
Layouts({
  layoutsDirs: ['src/layouts', 'src/admin-layouts'],
})
```

Can use `**` to support scenarios like `module1/layouts` and `modules2/layouts` with a setting of `src/**/layouts`:

```js
Layouts({
  layoutsDirs: 'src/**/layouts',
})
```

Any files named `__*__.vue` will be excluded, and you can specify any additional exclusions with the
[`exclude`](/config/exclude) option.
