# ClientSideLayout

The `ClientSideLayout` uses a simpler [virtual file](https://vite.dev/guide/api-plugin.html#importing-a-virtual-file) +
[glob import](https://vite.dev/guide/features.html#glob-import) scheme. This means that its HMR is faster and more
accurate, but also more limited.

## Usage

```js
// vite.config.ts
import { defineConfig } from 'vite'
import { ClientSideLayout } from 'vite-plugin-vue-layouts-next'

export default defineConfig({
  plugins: [
    ClientSideLayout({
      layoutsDir: 'src/mylayouts', // default to 'src/layouts'
      defaultLayout: 'my-default', // default to 'default', matches myDefault.vue
      importMode: 'sync' // The default will automatically detect -> ssg is sync, other is async
    }),
  ],
})
```

## Options

| Option | Default | Description |
| --- | --- | --- |
| `layoutsDir` | `'src/layouts'` | Directory to scan for layout components. Unlike `layoutsDirs`, this is a single directory. |
| `defaultLayout` | `'default'` | Normalized layout name used when a route has no `meta.layout`. |
| `importMode` | `'sync'` for SSG, `'async'` otherwise | How layout components are imported. |

Layout names follow the same [normalization rules](/config/layout-names) as the main plugin.
