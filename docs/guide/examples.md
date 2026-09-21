# Examples

The repository ships four runnable examples under
[`examples/`](https://github.com/loicduong/vite-plugin-vue-layouts-next/tree/main/examples).

| Example                                                                                                       | What it shows                                                                                           | Run from the repo root |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------- |
| [`spa`](https://github.com/loicduong/vite-plugin-vue-layouts-next/tree/main/examples/spa)                     | Multiple `layoutsDirs`, `exclude`, per-layout `importMode` and [dynamic layouts](/guide/dynamic-layout) | `pnpm spa:dev`         |
| [`ssg`](https://github.com/loicduong/vite-plugin-vue-layouts-next/tree/main/examples/ssg)                     | Static site generation with `vite-ssg`                                                                  | `pnpm ssg:dev`         |
| [`client-side`](https://github.com/loicduong/vite-plugin-vue-layouts-next/tree/main/examples/client-side)     | [`ClientSideLayout`](/guide/client-side-layout) with every [option](/config/client-side-options) set    | `pnpm cli:dev`         |
| [`nested-routes`](https://github.com/loicduong/vite-plugin-vue-layouts-next/tree/main/examples/nested-routes) | Nested routes and [`inheritDefaultLayout`](/config/plugin-options#inheritdefaultlayout)                 | `pnpm ner:dev`         |

Each example also has `:build` and `:preview` scripts, for example `pnpm spa:build` and `pnpm spa:preview`.

Building the plugin first is required, since the examples consume `dist/`:

```bash
pnpm install
pnpm build
pnpm spa:dev
```
