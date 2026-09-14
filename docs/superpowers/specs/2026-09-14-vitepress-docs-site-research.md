# Research: VitePress Documentation Site

> Research notes, not an implementation plan. Goal: assess feasibility, technical constraints, and options for adding a VitePress documentation site to `vite-plugin-vue-layouts-next`.

**Status:** Phase 1 shipped. The decisions listed in [Decisions](#decisions-to-settle-before-implementing) were resolved as: VitePress 2 (`next`), root at `docs/` with option A (keep `docs/superpowers/` and exclude it), GitHub Pages, README trimmed down to a quickstart. Phases 2 and 3 are still open.

## 1. Context and current state

- All user-facing documentation currently lives in two long README files:
  - `README.md` (~11 KB, 13 level-2 sections, ~25 headings)
  - `README.ja.md` (~12 KB, Japanese translation, already slightly out of sync with the English version — for example, EN has `### Layout name normalization` and `### Layout names`, which JA lacks)
- The repo has **no** documentation site, and no `homepage` pointing at docs (`package.json.homepage` points back at the GitHub repo).
- A `docs/` directory **already exists**, but holds internal development-process documentation:
  - `docs/superpowers/plans/*.md`
  - `docs/superpowers/specs/*.md`
- `.github/workflows/` contains only `release.yml` (conventional-github-releaser on tags). There is **no** CI workflow for lint/test, and no Pages deployment workflow.
- pnpm monorepo: `pnpm-workspace.yaml` declares `packages: ['examples/*']`, uses `catalog:` for most dependencies, and sets `catalogMode: prefer`.

## 2. The main constraint: Vite version conflict

This is the most important finding of this research.

`pnpm-workspace.yaml` contains:

```yaml
overrides:
  vite: 'catalog:'   # catalog: vite ^8.2.2
```

`overrides` applies to the **entire** workspace dependency graph, including dependencies nested inside VitePress. Therefore:

| Option | Vite that VitePress depends on | Compatible with the `vite@^8.2.2` override? |
| --- | --- | --- |
| `vitepress@1.6.4` (dist-tag `latest`) | `vite ^5.4.14`, `@vitejs/plugin-vue ^5.2.1` | No — forced up to Vite 8, almost certainly breaking runtime/build |
| `vitepress@2.0.0-alpha.20` (dist-tag `next`) | `vite ^8.2.1`, `@vitejs/plugin-vue ^6.0.8`, `vue ^3.5.41` | Yes — matches the current catalog exactly |

**Conclusion:** a docs site for this repo has to use **VitePress 2.x (`next`)**. VitePress 1.x would force an exception in `overrides`/`resolutions`, complicating the workspace and working against the package's Vite-8-first direction.

**Trade-offs of the v2 alpha:**

- The config API may change between alpha releases (breaking changes outside semver).
- Some community themes and plugins do not support v2 yet.
- `vitepress` needs an entry in `minimumReleaseAgeExclude` in `pnpm-workspace.yaml` (the same treatment `vite@8.1.2` and `vitest@5.0.0` already get), since a freshly published alpha would otherwise be blocked by `minimumReleaseAge`.
- `trustPolicy: no-downgrade` needs re-checking on each alpha bump.

## 3. Directory location

Three options:

| Option | Pros | Cons |
| --- | --- | --- |
| **A. VitePress root = `docs/`**, keep `docs/superpowers/` and drop it from the build via `srcExclude` | Most common convention, familiar Pages deployment, short paths | `docs/` mixes two kinds of documentation (user-facing vs internal); the dev server also watches internal files |
| **B. VitePress root = `docs/`**, **move** `docs/superpowers/` to `.superpowers/` or `notes/` | Clean separation, no `srcExclude` needed | Paths inside existing plans/specs need updating; it is a structural change of its own |
| **C. VitePress root = `website/`** (or `site/`) | Leaves the current `docs/` untouched | Off-convention; contributors are likely to look in the wrong place |

**Recommendation: option B**, or A for the smallest possible change. Either way, a separate package is needed so the site joins the workspace:

```yaml
# pnpm-workspace.yaml
packages:
  - 'examples/*'
  - docs        # (or 'website')
```

Note that `docs/` is currently **not** a package — adding it to `packages` means creating `docs/package.json` (`private: true`, mirroring `examples/*`).

## 4. Proposed information architecture

Derived directly from the headings in `README.md`:

```
/                         -> Home (hero + features, from the README intro)
/guide/getting-started    <- Install + Usage + Client Types
/guide/how-it-works       <- How it works
/guide/migration          <- Migration + Layout name normalization
/guide/client-side-layout <- ClientSideLayout
/guide/patterns/          <- Common patterns
    transitions           <- Transitions
    layout-to-page        <- Data from layout to page + Set static data at the page
    page-to-layout        <- Data dynamically from page to layout
/config/                  <- API
    layouts-dirs, extensions, exclude, default-layout,
    layout-names, import-mode, inherit-default-layout
/examples                 -> links to examples/spa | ssg | client-side | nested-routes
```

The `Maintainer`, `Thanks`, `Contributing`, and `License` sections should **stay in the README** rather than moving onto the site.

## 5. i18n

`README.ja.md` shows the project already has a multi-language need. VitePress supports i18n natively through `locales`:

```
docs/
  index.md            # en (root locale)
  guide/...
  ja/
    index.md
    guide/...
```

**Recommendation:** ship English only in phase 1, leaving the `locales` structure in place but with `ja` disabled. Reason: the Japanese version has already drifted from the English one; porting both in parallel would double the translation work and the accumulated debt. Porting JA is its own phase.

## 6. Repo-level changes required

1. `pnpm-workspace.yaml`
   - add `docs` to `packages`
   - add `vitepress` to `catalog` (required by `catalogMode: prefer`)
   - add `vitepress@2.0.0-alpha.x` to `minimumReleaseAgeExclude`
2. `package.json` (root) — add scripts in the existing style (`npm -C <dir> run <script>`):
   ```json
   "docs:dev": "npm -C docs run dev",
   "docs:build": "npm -C docs run build",
   "docs:preview": "npm -C docs run preview"
   ```
   Consider updating `homepage` to the site URL once it is deployed.
3. `docs/package.json` — `private: true`, deps `vitepress: catalog:`, `vue: catalog:`.
4. `.gitignore` — add `docs/.vitepress/cache` and `docs/.vitepress/dist`.
5. `tsconfig.json` — `exclude` currently only lists `**/dist` and `**/node_modules`, so `pnpm typecheck` will pick up `docs/.vitepress/config.ts`. Verify it passes, or add an exclude.
6. `eslint.config.js` — `antfu()` lints Markdown by default; roughly 30 code fences in the docs will be linted. This may need an `ignores` entry for `docs/**/*.md`, or the code fences will have to be made lint-clean.

## 7. CI/CD

There is no Pages workflow yet. A `.github/workflows/docs.yml` is needed:

- trigger: `push` to `main` (scoped with `paths: docs/**`), plus `workflow_dispatch`
- use `actions/configure-pages`, `actions/upload-pages-artifact`, `actions/deploy-pages`
- permissions: `pages: write`, `id-token: write`
- set up pnpm + Node 22 (matching `volta.node: 22.18.0`)
- **important:** run `pnpm build` (tsdown) before building the docs if any docs page imports directly from `dist/`

If the docs are hosted at `https://<user>.github.io/<repo>/`, the config must set `base: '/vite-plugin-vue-layouts-next/'`. A custom domain or Netlify/Vercel/Cloudflare Pages does not need it.

Also worth adding a docs build step for pull requests to catch dead links — VitePress fails the build on broken internal links, which is a significant side benefit.

## 8. Benefits and costs

**Benefits**

- The README is already too long to navigate; the hand-maintained `Table of Contents` is a clear symptom.
- Search becomes available (VitePress local search is sufficient; Algolia is not needed).
- A dedicated Migration page for v2 to v3 (layout name normalization) that release notes can link to.
- Automatic dead-link checking at build time.
- A proper home for i18n content instead of parallel README files.

**Costs**

- A dependency on a VitePress alpha (risk of breaking changes).
- A new risk of documentation drift: README vs site. The README should be **trimmed** to an intro, a quickstart, and a link to the site, rather than maintaining two full copies.
- Extra surface area for CI and maintenance.

## 9. Recommendation

Worth doing, in three phases:

1. **Phase 1 — site skeleton (EN):** set up `docs/` on VitePress 2 alpha, port the README into the IA from section 4, trim the README, add the Pages workflow. Estimate: moderate — mostly content porting rather than code.
2. **Phase 2 — quality:** local search, dead-link checking in CI, an Examples page linking to `examples/*`, possibly an embedded playground.
3. **Phase 3 — i18n:** enable the `ja` locale, resync the content that has drifted between EN and JA, and remove `README.ja.md` in favor of a link.

### Decisions to settle before implementing

- VitePress 2 alpha (recommended), or stay on v1 with a Vite override exception?
- Location: `docs/` (moving `superpowers/`), or `website/`?
- Hosting: GitHub Pages (needs `base`), or Netlify/Vercel/Cloudflare?
- The README once the site exists: trim it, or keep it complete?
