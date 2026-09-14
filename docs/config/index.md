# Config

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

## Using configuration

To use custom configuration, pass your options to `Layouts` when instantiating the plugin:

```js
// vite.config.ts
import { defineConfig } from 'vite'
import Layouts from 'vite-plugin-vue-layouts-next'

export default defineConfig({
  plugins: [
    Layouts({
      layoutsDirs: 'src/mylayouts',
      defaultLayout: 'my-default'
    }),
  ],
})
```

## Options

| Option | Type | Default |
| --- | --- | --- |
| [`layoutsDirs`](/config/layouts-dirs) | `string \| string[]` | `'src/layouts'` |
| [`extensions`](/config/extensions) | `string[]` | `['vue']` |
| [`exclude`](/config/exclude) | `string[]` | `[]` |
| [`defaultLayout`](/config/default-layout) | `string` | `'default'` |
| [`importMode`](/config/import-mode) | `(name: string) => 'sync' \| 'async'` | sync for SSG, async otherwise |
| [`inheritDefaultLayout`](/config/inherit-default-layout) | `boolean` | `true` |

See also [Layout names](/config/layout-names) for how filenames are normalized into layout names.
