# ClientSideLayout

`ClientSideLayout` is an alternative to the default `Layouts()` plugin. It uses a simpler
[virtual file](https://vite.dev/guide/api-plugin.html#importing-a-virtual-file) +
[glob import](https://vite.dev/guide/features.html#glob-import) scheme, which means its HMR is faster and more
accurate, but also more limited.

## When to Use It

|                          | `Layouts()`                              | `ClientSideLayout()`         |
| ------------------------ | ---------------------------------------- | ---------------------------- |
| Layout resolution        | Build time, explicit generated imports   | Run time, `import.meta.glob` |
| HMR                      | Regenerates the virtual module           | Faster and more accurate     |
| `layoutsDirs`            | One or many directories, globs supported | A single directory           |
| `importMode`             | Per-layout function                      | One mode for all layouts     |
| `exclude` / `extensions` | Supported                                | Not supported                |

Reach for `ClientSideLayout` when you have a single flat layouts directory and want the tightest dev feedback loop.
Stay on `Layouts()` when you need multiple layout directories, glob paths, or per-layout import modes.

## Usage

```js [vite.config.js]
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

`setupLayouts` is imported from `virtual:generated-layouts` exactly as with the default plugin, and layout names follow
the same [normalization rules](/config/layout-names).

See [ClientSideLayout Options](/config/client-side-options) for the full reference.
