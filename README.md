# vite-plugin-vue-layouts-next

[![npm version][npm-badge]][npm]
[![monthly downloads][monthly-downloads-badge]][monthly-downloads]
[![Keep a Changelog v1.1.0 badge][changelog-badge]][changelog]
[![standard-readme compliant][standard-readme-badge]][standard-readme]

Router based layout plugin for Vite 8, Vue 3 and Vue Router 5.

A fork of [vite-plugin-vue-layouts][vite-plugin-vue-layouts] with some improvements and fixes, supports Vite 8, Vue 3 and Vue Router 5.

Layouts are stored in the `/src/layouts` folder by default and are standard Vue components with a `<router-view></router-view>` in the template.

Pages without a layout specified use `default.vue` for their layout.

You can use route blocks to allow each page to determine its layout. The block below in a page will look for `/src/layouts/users.vue` for its layout.

```html
<route lang="yaml">
meta:
  layout: users
</route>
```

📖 **[Read the documentation][docs]**

## Table of Contents

- [Install](#install)
- [Usage](#usage)
- [Documentation](#documentation)
- [Maintainer](#maintainer)
- [Thanks](#thanks)
- [Contributing](#contributing)
- [License](#license)

## Install

```bash
# npm
npm install -D vite-plugin-vue-layouts-next

# yarn
yarn add -D vite-plugin-vue-layouts-next

# pnpm
pnpm add -D vite-plugin-vue-layouts-next
```

## Usage

Add to your `vite.config.ts`:

```js
import Vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import Layouts from 'vite-plugin-vue-layouts-next'
import VueRouter from 'vue-router/vite'

export default defineConfig({
  plugins: [VueRouter(), Vue(), Layouts()],
})
```

In main.ts, import Vue Router 5's generated file-based routes and setup the layouts.

```js
import { setupLayouts } from 'virtual:generated-layouts'
import { createRouter } from 'vue-router'
import { routes } from 'vue-router/auto-routes'

const router = createRouter({
  // ...
  routes: setupLayouts(routes),
})
```

See [Getting Started][docs-getting-started] for client types and per-page layouts.

### Dynamic layouts

```ts
import { setPageLayout, useLayout } from 'virtual:generated-layouts'

setPageLayout('admin') // switch the current page's layout in place
const layout = useLayout() // ComputedRef<string | false>

router.beforeEach((to) => {
  if (to.path.startsWith('/admin'))
    to.meta.layout = isAdmin() ? 'admin' : 'default'
})
```

See the [Dynamic Layouts guide](https://loicduong.github.io/vite-plugin-vue-layouts-next/guide/dynamic-layout).

## Documentation

Full documentation lives at **[loicduong.github.io/vite-plugin-vue-layouts-next][docs]**:

- [Getting Started][docs-getting-started] — install, usage and client types
- [Why][docs-why] — the rationale, and how this fork differs
- [How it works][docs-how-it-works] — what `setupLayouts` does to your routes
- [Migration][docs-migration] — upgrading to v3, including layout name normalization
- [Config][docs-config] — plugin options, layout names and ClientSideLayout options
- [Common Patterns][docs-patterns] — transitions and passing data between layouts and pages
- [Dynamic Layouts][docs-dynamic-layout] — `setPageLayout` and `useLayout`
- [ClientSideLayout][docs-client-side-layout] — the lighter, glob-import based variant
- [Examples][docs-examples] — runnable SPA, SSG, client-side and nested-routes setups

The site also publishes [`llms.txt`][docs-llms] and `llms-full.txt` for LLM consumption.

The docs site is built with VitePress and lives in [`docs/`](./docs). To work on it locally:

```bash
pnpm install
pnpm docs:dev
```

## Maintainer

[Loic Duong](https://github.com/loicduong)

## Thanks

[vite-plugin-vue-layouts][vite-plugin-vue-layouts]

## Contributing

PRs accepted. [Open an issue][open-an-issue] or submit PRs for any improvements.

- PR titles must follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat: …`, `fix: …`, `docs: …`);
  they become the squash-merge commit subject and feed the generated changelog.
- Releases are cut by a maintainer with `pnpm release` (version bump + changelog + `release: vX.Y.Z` commit + tag);
  GitHub Actions then tests, builds, publishes to npm with provenance and creates the GitHub Release.

## License

[MIT © loicduong][license]

[npm]: https://www.npmjs.com/package/vite-plugin-vue-layouts-next
[npm-badge]: https://img.shields.io/npm/v/vite-plugin-vue-layouts-next
[monthly-downloads]: https://npmjs.com/package/vite-plugin-vue-layouts-next?activeTab=versions
[monthly-downloads-badge]: https://img.shields.io/npm/dm/vite-plugin-vue-layouts-next
[changelog]: ./CHANGELOG.md
[changelog-badge]: https://img.shields.io/badge/changelog-Keep%20a%20Changelog%20v1.1.0-%23E05735
[standard-readme]: https://github.com/RichardLitt/standard-readme
[standard-readme-badge]: https://img.shields.io/badge/readme%20style-standard-brightgreen.svg?style=flat-square
[license]: ./LICENSE
[open-an-issue]: https://github.com/loicduong/vite-plugin-vue-layouts-next/issues/new
[vite-plugin-vue-layouts]: https://github.com/JohnCampionJr/vite-plugin-vue-layouts
[docs]: https://loicduong.github.io/vite-plugin-vue-layouts-next/
[docs-getting-started]: https://loicduong.github.io/vite-plugin-vue-layouts-next/guide/
[docs-why]: https://loicduong.github.io/vite-plugin-vue-layouts-next/guide/why
[docs-how-it-works]: https://loicduong.github.io/vite-plugin-vue-layouts-next/guide/how-it-works
[docs-migration]: https://loicduong.github.io/vite-plugin-vue-layouts-next/guide/migration
[docs-config]: https://loicduong.github.io/vite-plugin-vue-layouts-next/config/
[docs-patterns]: https://loicduong.github.io/vite-plugin-vue-layouts-next/guide/patterns
[docs-dynamic-layout]: https://loicduong.github.io/vite-plugin-vue-layouts-next/guide/dynamic-layout
[docs-client-side-layout]: https://loicduong.github.io/vite-plugin-vue-layouts-next/guide/client-side-layout
[docs-examples]: https://loicduong.github.io/vite-plugin-vue-layouts-next/guide/examples
[docs-llms]: https://loicduong.github.io/vite-plugin-vue-layouts-next/llms.txt
