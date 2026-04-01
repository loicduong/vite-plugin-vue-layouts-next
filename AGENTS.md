# AGENTS.md

## Project Overview

`vite-plugin-vue-layouts-next` is a Vite plugin for Vue 3 and Vue Router that generates layout-aware routes from files in `src/layouts`. It is published as an ESM TypeScript package and includes multiple example apps used to validate behavior across SPA, SSG, client-side, and auto-routes setups.

Core implementation areas:

- `src/index.ts`: main plugin entry, option resolution, dev-server hooks, virtual module loading
- `src/clientSide.ts`: client-side virtual module code generation
- `src/RouteLayout.ts`: route/layout transformation output
- `src/files.ts`: layout file discovery
- `src/importCode.ts`: import-generation logic
- `src/types.ts`: public and internal types
- `test/*.test.ts`: unit/integration coverage
- `test/fixtures/`: minimal apps used by integration tests
- `examples/*`: manual validation apps wired to the local workspace package

## Environment And Tooling

- Package manager: `pnpm` (`packageManager` is `pnpm@10.32.1`)
- Node runtime: Volta pins Node `22.18.0` in the root package
- Language/runtime: TypeScript, ESM, Vite plugin API
- Workspace: `pnpm-workspace.yaml` includes `examples/*`
- Lint config: `eslint.config.js` uses `@antfu/eslint-config`
- Formatting baseline comes from `.editorconfig`: UTF-8, LF, spaces, 2-space indentation, final newline

## Setup Commands

Install dependencies from the repository root:

```bash
pnpm install
```

Primary root commands:

- `pnpm build`: build the published package into `dist/`
- `pnpm dev`: watch-mode package build
- `pnpm lint`: run ESLint
- `pnpm lint:fix`: auto-fix ESLint issues
- `pnpm test`: run Vitest
- `pnpm typecheck`: run `tsc`

Example-app commands exposed from the root:

- `pnpm spa:dev`, `pnpm spa:build`, `pnpm spa:preview`
- `pnpm ssg:dev`, `pnpm ssg:build`, `pnpm ssg:preview`
- `pnpm cli:dev`, `pnpm cli:build`, `pnpm cli:preview`
- `pnpm aur:dev`, `pnpm aur:build`, `pnpm aur:preview`

Use the root wrappers instead of running inside `examples/*` unless you are debugging an example package directly.

## Development Workflow

Typical loop for package work:

1. Run `pnpm build` after changing plugin code to refresh `dist/`.
2. Use one of the example apps for manual verification when behavior changes affect routing, layout resolution, or HMR.
3. Run `pnpm lint`, `pnpm test`, and `pnpm typecheck` before finalizing.

When changing route-generation behavior, test both:

- the package output in `dist/`
- at least one example app or fixture exercising the changed path

## Testing Instructions

Automated tests use Vitest with a Node environment, configured in `vitest.config.ts`.

- Run all tests: `pnpm test`
- Run one test file: `pnpm test -- test/integration.test.ts`
- Run the other focused test file: `pnpm test -- test/load-hook.test.ts`

Test locations:

- `test/load-hook.test.ts`
- `test/integration.test.ts`

The integration suite builds a minimal Vite app from `test/fixtures/build-app`, so changes to virtual module output, import paths, or layout discovery should be validated there.

## Code Style And Conventions

- Keep TypeScript ESM style consistent with the existing source.
- Follow the current formatting style used by the repo and enforced by ESLint/EditorConfig.
- Preserve the existing file split: option resolution and plugin hooks in `src/index.ts`, code generation in dedicated helper modules.
- Prefer small, pure helpers for path normalization, import generation, and route transformation.
- Avoid adding CommonJS patterns; this package is ESM-first.
- Keep public option/type changes reflected in `src/types.ts`, README usage docs, and generated output behavior where relevant.

## Build And Release

- `pnpm build` produces the distributable files in `dist/`
- Package exports point to `dist/index.mjs` and `dist/index.d.mts`
- `pnpm release` runs `npx bumpp --commit --tag --push && pnpm publish`
- GitHub release automation lives in `.github/workflows/release.yml` and triggers on pushed tags

Do not run `pnpm release` unless the task is explicitly to publish a new version.

## Pull Request Expectations

Before opening or updating a PR, run:

- `pnpm lint`
- `pnpm build`
- `pnpm test`
- `pnpm typecheck`

If behavior or public API changes:

- update `README.md`
- update changelog files when the change is release-facing
- keep at least one example or fixture aligned with the new behavior

## Troubleshooting

Current workspace caveat observed during initialization:

- `pnpm lint` and `pnpm build` succeeded
- `pnpm test` failed because `vitest` was not resolvable from the local install
- `pnpm typecheck` failed because `vitest` and `@vitejs/plugin-vue` type resolution was missing locally

If you hit similar dependency-resolution failures, refresh the workspace install first:

```bash
pnpm install
```

If a change appears correct in source but not in the examples, rebuild the package before re-running an example app so `dist/` is current.
