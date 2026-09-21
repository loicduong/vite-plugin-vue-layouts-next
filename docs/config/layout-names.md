# Layout Names

Layout names are normalized using Nuxt-compatible rules. `meta.layout`, [`defaultLayout`](/config/plugin-options#defaultlayout)
and the generated `layouts` map all use these normalized names, never raw file paths.

## Normalization Rules

1. The file extension is dropped.
2. Each path segment is converted to kebab-case.
3. Nested paths are flattened with `-`.
4. Overlapping segments between the directory and the filename are collapsed.
5. An `index` filename resolves to its directory name.

## Examples

| File                                       | Layout name       |
| ------------------------------------------ | ----------------- |
| `src/layouts/default.vue`                  | `default`         |
| `src/layouts/someLayout.vue`               | `some-layout`     |
| `src/layouts/desktop/default.vue`          | `desktop-default` |
| `src/layouts/desktop/index.vue`            | `desktop`         |
| `src/layouts/desktop/Desktop.vue`          | `desktop`         |
| `src/layouts/desktop/DesktopDefault.vue`   | `desktop-default` |
| `src/layouts/desktop-base/DesktopBase.vue` | `desktop-base`    |

For clarity, prefer filenames that match the final layout name, such as `DesktopDefault.vue`, `DesktopBase.vue`, and
`Desktop.vue`.

## Using a Layout Name

```vue [src/pages/users.vue]
<route lang="yaml">
meta:
  layout: desktop-default
</route>
```

::: warning Breaking change in v3
Nested layouts used to keep slash-separated names such as `sub/layoutsub`. In v3 they are `sub-layoutsub`. See
[Migration](/guide/migration#layout-name-normalization).
:::
