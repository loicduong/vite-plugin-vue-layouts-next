# Layout names

Layout names are normalized using Nuxt-compatible rules: each path segment is converted to kebab-case, nested paths are
flattened with `-`, and overlapping segments between the directory and the filename are collapsed.

| File | Layout name |
| --- | --- |
| `src/layouts/default.vue` | `default` |
| `src/layouts/someLayout.vue` | `some-layout` |
| `src/layouts/desktop/default.vue` | `desktop-default` |
| `src/layouts/desktop/index.vue` | `desktop` |
| `src/layouts/desktop/Desktop.vue` | `desktop` |
| `src/layouts/desktop/DesktopDefault.vue` | `desktop-default` |
| `src/layouts/desktop-base/DesktopBase.vue` | `desktop-base` |

For clarity, prefer filenames that match the final layout name, such as `DesktopDefault.vue`, `DesktopBase.vue`, and
`Desktop.vue`.

::: warning Breaking change in v3
Nested layouts used to keep slash-separated names such as `sub/layoutsub`. In v3 they are `sub-layoutsub`. See
[Migration](/guide/migration#layout-name-normalization).
:::
