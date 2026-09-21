# ClientSideLayout Options

Options accepted by the named `ClientSideLayout()` export. See [ClientSideLayout](/guide/client-side-layout) for when
to prefer it over the default plugin.

```js [vite.config.js]
import { defineConfig } from 'vite'
import { ClientSideLayout } from 'vite-plugin-vue-layouts-next'

export default defineConfig({
  plugins: [
    ClientSideLayout({
      layoutsDirs: 'src/mylayouts',
      defaultLayout: 'my-default',
      importMode: 'sync',
    }),
  ],
})
```

## layoutsDirs

- **Type:** `string`
- **Default:** `'src/layouts'`
- **Related:** [`layoutsDirs`](/config/plugin-options#layoutsdirs)

Directory to scan for layout components. Same name as the default plugin's option so configs can move between the two
exports, but here it is a single directory: no array, no glob.

::: details Deprecated alias: `layoutDir`
Earlier versions called this option `layoutDir`. It still works, but is ignored when `layoutsDirs` is also set, and will
be removed in the next major.
:::

## defaultLayout

- **Type:** `string`
- **Default:** `'default'`
- **Related:** [Layout Names](/config/layout-names)

Normalized layout name used when a route has no `meta.layout`. As with the default plugin, this is a layout name rather
than a filename, so `myDefault.vue` is `my-default`.

## importMode

- **Type:** `'sync' | 'async'`
- **Default:** `'sync'` for SSG, `'async'` otherwise
- **Related:** [`importMode`](/config/plugin-options#importmode)

How layout components are imported. Unlike the default plugin, this takes a plain string rather than a function, since
the glob import applies one mode to every layout.

## inheritDefaultLayout

- **Type:** `boolean`
- **Default:** `true`
- **Related:** [`inheritDefaultLayout`](/config/plugin-options#inheritdefaultlayout)

Whether nested routes should inherit the default layout from parent routes. Behaves exactly like the default plugin's
option.
