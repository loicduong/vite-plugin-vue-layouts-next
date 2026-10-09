# Typed Layouts

Since v3.3, the plugin can generate a `.d.ts` that lists your layouts, so a wrong layout name is a type error instead
of a page that silently renders the fallback layout. Editors also autocomplete layout names.

## Enable it

```ts [vite.config.ts]
Layouts({
  dts: true, // writes layouts.d.ts in the Vite root
})
```

The Vite root is the project directory unless you set `root` in `vite.config`. `dts` also accepts a path relative to
that root, for example `'src/layouts.d.ts'`, which most Vite templates' tsconfig already includes through `src/**/*`.
It works the same with `ClientSideLayout()`.

Then add the file to your `tsconfig.json`:

```json [tsconfig.json]
{
  "include": ["src/**/*", "layouts.d.ts"]
}
```

The file is regenerated when a layout is added or removed, at dev server start and at build. Commit it, like
`typed-router.d.ts`, so type checking works in CI without running Vite first.

## What gets typed

```ts
definePage({ meta: { layout: 'admin' } }) // ok
definePage({ meta: { layout: 'adimn' } }) // error
definePage({ meta: { layout: { name: 'admin', props: { title: 'Users' } } } }) // ok

setPageLayout('admin') // ok
setPageLayout('typo') // error

const layout = useLayout() // ComputedRef<'admin' | 'default' | ... | false>
```

`defaultLayout` and `fallbackLayout` in `vite.config` stay plain strings: the types are generated from that config.

## Names only known at runtime

When the name comes from outside the code, for example an API response, cast it:

```ts
import type { LayoutName } from 'vite-plugin-vue-layouts-next/runtime'

setPageLayout(user.layout as LayoutName)
```

`LayoutKey` is the same type without `false`, under the name Nuxt uses.

## Compared to Nuxt

The generated file uses the same mechanism as Nuxt: an interface keyed by layout name (`LayoutRegistry`, Nuxt's
`NuxtLayouts`), and `string` when it is empty. Two differences: the option is opt-in, and you add the file to
`tsconfig.json` yourself, because the plugin does not own your tsconfig. Layout props are not typed per layout yet.
