# Nuxt-Compatible Layout Name Normalization

## Context

`vite-plugin-vue-layouts-next` currently derives layout keys from relative layout file paths. Nested layouts keep slash-separated names such as `sub/layoutsub`.

For v3, layout names should match Nuxt's documented naming behavior:

- normalize file and directory segments to kebab-case
- flatten nested layout paths with `-`
- remove duplicate overlapping path/name segments
- treat this as a breaking change, with no automatic legacy aliases

## Goals

- Make Nuxt-compatible layout naming the default behavior in v3.
- Keep the plugin and `ClientSideLayout` behavior consistent.
- Preserve existing flat layout names such as `default` and `second`.
- Document the migration path for nested layouts.

## Non-Goals

- Support `layout: { name, props }`.
- Add runtime `setPageLayout()`.
- Add a `<NuxtLayout>`-style component.
- Clone Nuxt `routeRules.appLayout`.
- Keep legacy slash-based aliases.

## Expected Names

| File | Layout name |
| --- | --- |
| `default.vue` | `default` |
| `someLayout.vue` | `some-layout` |
| `desktop/default.vue` | `desktop-default` |
| `desktop/index.vue` | `desktop` |
| `desktop/Desktop.vue` | `desktop` |
| `desktop/DesktopDefault.vue` | `desktop-default` |
| `desktop-base/base.vue` | `desktop-base` |
| `desktop-base/DesktopBase.vue` | `desktop-base` |
| `sub/layoutsub.vue` | `sub-layoutsub` |

## Design

Add a shared helper module at `src/layoutName.ts`.

The helper should expose:

- `kebabCaseSegment(value: string): string`
- `normalizeLayoutName(file: string): string`

`normalizeLayoutName` accepts layout file paths relative to the configured layouts directory, removes the file extension, normalizes each segment, flattens with hyphens, and removes duplicated overlap between parent path segments and the filename.

Both generation paths must use the same naming rules:

- `src/importCode.ts` should use `normalizeLayoutName(file)` when creating the server/resolved `layouts` map.
- `src/clientSide.ts` should emit equivalent runtime code inside the virtual module so `import.meta.glob` keys are normalized the same way.

## Data Flow

1. Layout files are discovered as relative paths, for example `desktop/DesktopDefault.vue`.
2. The helper converts the file path to a public layout key, for example `desktop-default`.
3. Generated layout maps use the normalized key.
4. `setupLayouts(routes)` continues to read `route.meta.layout` and look it up in `layouts`.

## Breaking Change

Nested slash-based layout references will no longer work automatically.

Example:

```ts
definePage({
  meta: {
    layout: 'sub-layoutsub',
  },
})
```

Previously this may have been written as `sub/layoutsub`.

## Testing

Use TDD:

1. Add failing unit tests for `normalizeLayoutName`.
2. Add failing tests that generated server/resolved import code uses normalized keys.
3. Add failing tests that `ClientSideLayout` virtual module includes the same normalization logic and no longer assigns raw slash keys.
4. Implement the minimal code to pass.
5. Run `pnpm test`, then `pnpm lint`, `pnpm build`, and `pnpm typecheck` if dependencies are available.

## Documentation

Update README for v3:

- explain Nuxt-compatible layout names
- recommend filenames that match layout names for clarity
- include migration examples from slash paths to kebab names
