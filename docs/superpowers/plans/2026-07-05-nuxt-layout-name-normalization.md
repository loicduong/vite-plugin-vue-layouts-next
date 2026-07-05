# Nuxt Layout Name Normalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Nuxt-compatible layout name normalization as the default v3 behavior.

**Architecture:** Add a shared `src/layoutName.ts` helper for build-time layout key generation and emit equivalent helper code into the client-side virtual module. Keep `setupLayouts(routes)` unchanged: it continues to look up `route.meta.layout` in the generated `layouts` map.

**Tech Stack:** TypeScript ESM, Vite plugin virtual modules, Vitest, pnpm.

---

## File Structure

- Create `src/layoutName.ts`: shared build-time helper for kebab-case conversion and Nuxt-style layout path normalization.
- Create `test/layout-name.test.ts`: focused unit tests for the helper.
- Modify `src/importCode.ts`: use `normalizeLayoutName(file)` for generated layout keys and pass normalized names to `importMode`.
- Modify `src/clientSide.ts`: emit equivalent normalization helpers into the virtual module and use them for `import.meta.glob` keys.
- Modify `test/load-hook.test.ts`: assert generated virtual code contains normalized layout key logic and no longer assigns raw slash keys.
- Modify `README.md`: document Nuxt-compatible layout names and v3 migration.

### Task 1: Shared Layout Name Helper

**Files:**
- Create: `src/layoutName.ts`
- Test: `test/layout-name.test.ts`

- [ ] **Step 1: Write the failing helper tests**

Create `test/layout-name.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { kebabCaseSegment, normalizeLayoutName } from '../src/layoutName'

describe('layout name normalization', () => {
  it.each([
    ['default', 'default'],
    ['someLayout', 'some-layout'],
    ['DesktopDefault', 'desktop-default'],
    ['desktop-base', 'desktop-base'],
    ['layout_v2', 'layout-v2'],
  ])('normalizes segment %s to %s', (input, expected) => {
    expect(kebabCaseSegment(input)).toBe(expected)
  })

  it.each([
    ['default.vue', 'default'],
    ['someLayout.vue', 'some-layout'],
    ['desktop/default.vue', 'desktop-default'],
    ['desktop/index.vue', 'desktop'],
    ['desktop/Desktop.vue', 'desktop'],
    ['desktop/DesktopDefault.vue', 'desktop-default'],
    ['desktop-base/base.vue', 'desktop-base'],
    ['desktop-base/DesktopBase.vue', 'desktop-base'],
    ['sub/layoutsub.vue', 'sub-layoutsub'],
  ])('normalizes layout path %s to %s', (input, expected) => {
    expect(normalizeLayoutName(input)).toBe(expected)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm test -- test/layout-name.test.ts
```

Expected: FAIL because `../src/layoutName` does not exist.

- [ ] **Step 3: Add minimal helper implementation**

Create `src/layoutName.ts`:

```ts
import { parse } from 'node:path'

const REGEX_BACKSLASH = /\\/g
const REGEX_CAMEL_CASE = /([a-z0-9])([A-Z])/g
const REGEX_SEPARATORS = /[\s_.]+/g
const REGEX_NON_ALPHANUMERIC = /[^a-z0-9-]+/gi
const REGEX_REPEATED_DASH = /-+/g
const REGEX_EDGE_DASH = /^-|-$/g

export function kebabCaseSegment(value: string): string {
  return value
    .replace(REGEX_CAMEL_CASE, '$1-$2')
    .replace(REGEX_SEPARATORS, '-')
    .replace(REGEX_NON_ALPHANUMERIC, '-')
    .replace(REGEX_REPEATED_DASH, '-')
    .replace(REGEX_EDGE_DASH, '')
    .toLowerCase()
}

function removeOverlappingPrefix(parentSegments: string[], fileSegments: string[]) {
  let overlap = 0
  const maxOverlap = Math.min(parentSegments.length, fileSegments.length)

  for (let length = maxOverlap; length > 0; length -= 1) {
    const parentTail = parentSegments.slice(parentSegments.length - length)
    const fileHead = fileSegments.slice(0, length)

    if (parentTail.join('-') === fileHead.join('-')) {
      overlap = length
      break
    }
  }

  return fileSegments.slice(overlap)
}

export function normalizeLayoutName(file: string): string {
  const normalizedFile = file.replace(REGEX_BACKSLASH, '/')
  const parsed = parse(normalizedFile)
  const parentSegments = parsed.dir
    .split('/')
    .filter(Boolean)
    .map(kebabCaseSegment)
    .filter(Boolean)

  if (parsed.name === 'index')
    return parentSegments.join('-') || 'index'

  const fileSegments = kebabCaseSegment(parsed.name).split('-').filter(Boolean)
  const dedupedFileSegments = removeOverlappingPrefix(parentSegments, fileSegments)

  return [...parentSegments, ...dedupedFileSegments].join('-')
}
```

- [ ] **Step 4: Run helper tests to verify they pass**

Run:

```bash
pnpm test -- test/layout-name.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit helper**

```bash
git add src/layoutName.ts test/layout-name.test.ts
git commit -m "feat: add Nuxt layout name helper"
```

### Task 2: Server/Resolved Layout Map Generation

**Files:**
- Modify: `src/importCode.ts`
- Test: `test/layout-name.test.ts`

- [ ] **Step 1: Write failing import code tests**

Append to `test/layout-name.test.ts`:

```ts
import type { ResolvedOptions } from '../src/types'
import { getImportCode } from '../src/importCode'

function createOptions(): ResolvedOptions {
  return {
    defaultLayout: 'default',
    layoutsDirs: 'src/layouts',
    extensions: ['vue'],
    exclude: [],
    importMode: () => 'async',
    inheritDefaultLayout: true,
  }
}

describe('layout import code', () => {
  it('uses Nuxt-compatible names as layout map keys', () => {
    const code = getImportCode(
      [{
        path: '/project/src/layouts',
        files: [
          'desktop/default.vue',
          'desktop/DesktopDefault.vue',
          'desktop-base/DesktopBase.vue',
          'sub/layoutsub.vue',
        ],
      }],
      createOptions(),
    )

    expect(code).toContain(`'desktop-default': () => import('/project/src/layouts/desktop/default.vue'),`)
    expect(code).toContain(`'desktop-base': () => import('/project/src/layouts/desktop-base/DesktopBase.vue'),`)
    expect(code).toContain(`'sub-layoutsub': () => import('/project/src/layouts/sub/layoutsub.vue'),`)
    expect(code).not.toContain(`'desktop/default'`)
    expect(code).not.toContain(`'desktop/DesktopDefault'`)
    expect(code).not.toContain(`'sub/layoutsub'`)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm test -- test/layout-name.test.ts
```

Expected: FAIL because `getImportCode` still emits slash-based keys.

- [ ] **Step 3: Update `src/importCode.ts`**

Replace the `parse`/`join` naming logic with `normalizeLayoutName`.

Expected `src/importCode.ts`:

```ts
import type { FileContainer, ResolvedOptions } from './types'
import { normalizeLayoutName } from './layoutName'

export function getImportCode(files: FileContainer[], options: ResolvedOptions) {
  const imports: string[] = []
  const head: string[] = []
  let id = 0

  for (const __ of files) {
    for (const file of __.files) {
      const path = __.path.startsWith('/') ? `${__.path}/${file}` : `/${__.path}/${file}`
      const name = normalizeLayoutName(file)
      if (options.importMode(name) === 'sync') {
        const variable = `__layout_${id}`
        head.push(`import ${variable} from '${path}'`)
        imports.push(`'${name}': ${variable},`)
        id += 1
      }
      else {
        imports.push(`'${name}': () => import('${path}'),`)
      }
    }
  }

  const importsCode = `
${head.join('\n')}
export const layouts = {
${imports.join('\n')}
}`
  return importsCode
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
pnpm test -- test/layout-name.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit server generation**

```bash
git add src/importCode.ts test/layout-name.test.ts
git commit -m "feat: normalize generated layout keys"
```

### Task 3: ClientSideLayout Virtual Module Generation

**Files:**
- Modify: `src/clientSide.ts`
- Modify: `test/load-hook.test.ts`

- [ ] **Step 1: Write failing client virtual module test**

Add this test inside `describe('clientSideLayout', () => { ... })` in `test/load-hook.test.ts`:

```ts
it('normalizes client-side layout keys with Nuxt-compatible names', async () => {
  const plugin = ClientSideLayout({ layoutDir: 'src/layouts' }) as Plugin
  const load = getLoadFunction(plugin)
  expect(load).toBeTypeOf('function')

  const result = await load!(MODULE_ID_NULL) as { code: string }

  expect(result.code).toContain('function normalizeLayoutName(file)')
  expect(result.code).toContain(`let key = normalizeLayoutName(name.replace("/src/layouts/", '').replace('.vue', ''))`)
  expect(result.code).not.toContain(`let key = name.replace("/src/layouts/", '').replace('.vue', '')`)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm test -- test/load-hook.test.ts
```

Expected: FAIL because the virtual module still assigns raw path keys.

- [ ] **Step 3: Update `src/clientSide.ts` virtual code**

Add equivalent helper functions inside the returned virtual module string before `export const setupLayouts`.

Update the `Object.entries(modules)` block to:

```text
      Object.entries(modules).forEach(([name, module]) => {
          let key = normalizeLayoutName(name.replace("${normalizedTarget}/", '').replace('.vue', ''))
          layouts[key] = ${isSync ? 'module.default' : 'module'}
      })
```

The emitted helper code should match the behavior from `src/layoutName.ts` without importing Node modules into the browser virtual module.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm test -- test/load-hook.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run focused helper and load tests together**

Run:

```bash
pnpm test -- test/layout-name.test.ts test/load-hook.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit client generation**

```bash
git add src/clientSide.ts test/load-hook.test.ts
git commit -m "feat: normalize client-side layout keys"
```

### Task 4: README Migration Docs

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update README**

Add a section under the `layoutsDirs`/`defaultLayout` API area:

```md
### Layout names

Layout names are normalized using Nuxt-compatible rules.

| File | Layout name |
| --- | --- |
| `src/layouts/default.vue` | `default` |
| `src/layouts/someLayout.vue` | `some-layout` |
| `src/layouts/desktop/default.vue` | `desktop-default` |
| `src/layouts/desktop/index.vue` | `desktop` |
| `src/layouts/desktop/Desktop.vue` | `desktop` |
| `src/layouts/desktop/DesktopDefault.vue` | `desktop-default` |
| `src/layouts/desktop-base/DesktopBase.vue` | `desktop-base` |

For clarity, prefer filenames that match the final layout name, such as `DesktopDefault.vue`, `DesktopBase.vue`, and `Desktop.vue`.
```

Add a v3 migration note:

```md
### Layout name normalization

v3 uses Nuxt-compatible layout names by default. Nested layout names no longer use slash-separated paths.

```diff
 definePage({
   meta: {
-    layout: 'sub/layoutsub',
+    layout: 'sub-layoutsub',
   },
 })
```
```

- [ ] **Step 2: Review docs diff**

Run:

```bash
git diff -- README.md
```

Expected: README explains layout names and migration without mentioning legacy aliases.

- [ ] **Step 3: Commit docs**

```bash
git add README.md
git commit -m "docs: document Nuxt layout names"
```

### Task 5: Full Verification

**Files:**
- No source edits expected.

- [ ] **Step 1: Run full test suite**

Run:

```bash
pnpm test
```

Expected: PASS.

- [ ] **Step 2: Run lint**

Run:

```bash
pnpm lint
```

Expected: PASS.

- [ ] **Step 3: Run build**

Run:

```bash
pnpm build
```

Expected: PASS.

- [ ] **Step 4: Run typecheck**

Run:

```bash
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 5: Inspect final status**

Run:

```bash
git status --short --branch
```

Expected: clean worktree on `31-featv3-support-nuxt-compatible-layout-name-normalization`.
