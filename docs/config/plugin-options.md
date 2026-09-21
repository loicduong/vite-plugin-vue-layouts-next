# Plugin Options

Options accepted by the default `Layouts()` export.

```ts
interface UserOptions {
  layoutsDirs?: string | string[]
  extensions?: string[]
  exclude?: string[]
  defaultLayout?: string
  importMode?: (name: string) => 'sync' | 'async'
  inheritDefaultLayout?: boolean
}
```

## layoutsDirs

- **Type:** `string | string[]`
- **Default:** `'src/layouts'`
- **Related:** [`exclude`](#exclude), [Layout Names](/config/layout-names)

Relative path to the layouts directory. Supports globs. All `.vue` files in this folder are imported async into the
generated code.

Can also be an array of layout dirs:

```js [vite.config.js]
Layouts({
  layoutsDirs: ['src/layouts', 'src/admin-layouts'],
})
```

Can use `**` to support scenarios like `module1/layouts` and `modules2/layouts`:

```js [vite.config.js]
Layouts({
  layoutsDirs: 'src/**/layouts',
})
```

Any files named `__*__.vue` are excluded. Additional exclusions go through [`exclude`](#exclude).

## extensions

- **Type:** `string[]`
- **Default:** `['vue']`

Valid file extensions for layout components.

```js [vite.config.js]
Layouts({
  extensions: ['vue'],
})
```

## exclude

- **Type:** `string[]`
- **Default:** `[]`
- **Related:** [`layoutsDirs`](#layoutsdirs)

List of path globs to exclude when resolving layouts.

```js [vite.config.js]
Layouts({
  exclude: ['**/components/**'],
})
```

Files named `__*__.vue` are always excluded, regardless of this option.

## defaultLayout

- **Type:** `string`
- **Default:** `'default'`
- **Related:** [Layout Names](/config/layout-names)

Normalized layout name to use when a route does not specify `meta.layout`.

The value is a _layout name_, not a filename. For example `myDefault.vue` is named `my-default`:

```js [vite.config.js]
Layouts({
  defaultLayout: 'my-default',
})
```

## importMode

- **Type:** `(name: string) => 'sync' | 'async'`
- **Default:** `'sync'` for SSG, `'async'` otherwise

Mode for importing layouts. The default is detected from the build: static site generation imports synchronously,
everything else asynchronously.

```js [vite.config.js]
Layouts({
  importMode: name => (name === 'default' ? 'sync' : 'async'),
})
```

## inheritDefaultLayout

- **Type:** `boolean`
- **Default:** `true`
- **Related:** [How it works](/guide/how-it-works)

Whether nested routes should inherit the default layout from parent routes.

When `false`, if a child route has its own layout, the parent route won't use the default layout. This prevents
double-wrapping layouts when child routes specify their own layout.

This option applies to Vue Router 5 file-based routes, which generate nested route structures with `children` arrays.
It can only be set globally in the plugin configuration.

```js [vite.config.js]
Layouts({
  inheritDefaultLayout: false,
})
```
