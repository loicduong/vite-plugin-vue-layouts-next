# Release Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the local `bumpp && pnpm publish` release with the Vue/Vite model: local `release: vX.Y.Z` commit (bump + generated changelog) and tag; GitHub Actions tests, builds, publishes with npm Trusted Publishing and creates the GitHub Release.

**Architecture:** `bumpp --execute "pnpm changelog"` produces one release commit whose changelog entry comes from `conventional-changelog` (angular preset). Three workflows: `ci.yml` (reusable test job), `semantic-pr.yml` (PR title lint), `release.yml` (tag → ci → publish via OIDC → `gh release create` with notes from the same generator). `CHANGELOG.md` is converted once to the generated format, merging the hand-written history.

**Tech Stack:** pnpm 12 (catalog), bumpp 12, conventional-changelog-cli 5 (angular preset), GitHub Actions (`actions/checkout@v7`, `pnpm/action-setup@v6`, `actions/setup-node@v7`, `amannn/action-semantic-pull-request@v6`), npm ≥ 11.5 Trusted Publishing, `gh` CLI (preinstalled on runners).

**Spec:** `docs/superpowers/specs/2026-09-21-release-pipeline-design.md`

## Global Constraints

- All dependency versions go through `pnpm-workspace.yaml` `catalog:`; `package.json` uses `"catalog:"`.
- Release commit message format is exactly `release: vX.Y.Z`; tag is `vX.Y.Z`.
- Changelog preset is `angular` (Vue/Vite parity). Generated headings: `Features`, `Bug Fixes`, `Performance Improvements`, `Reverts`, `BREAKING CHANGES`. The one-time conversion may additionally use `### Miscellaneous` for old `Changed` items.
- No local publish. `release.yml` publishes only from `environment: Release` with `id-token: write`; no `NPM_TOKEN`.
- Workflow action versions match the existing `docs.yml`: `actions/checkout@v7`, `pnpm/action-setup@v6`, `actions/setup-node@v7` with `node-version: 22` and `cache: pnpm`.
- `pnpm test && pnpm lint && pnpm typecheck` pass before each commit (eslint lints markdown and YAML).
- Commit messages end with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- Work on branch `chore/release-pipeline`.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `package.json`, `pnpm-workspace.yaml` (modify) | `release` / `changelog` scripts; `bumpp`, `conventional-changelog-cli` dev deps. |
| `CHANGELOG.md` (rewrite) | Generated-format history, merged with hand-written notes (one-time). |
| `.github/workflows/ci.yml` (create) | Reusable test/build job for PRs, `main`, and release. |
| `.github/workflows/semantic-pr.yml` (create) | PR title lint. |
| `.github/workflows/release.yml` (rewrite) | Tag → ci → publish (OIDC) → GitHub Release. |
| `README.md` (modify) | Contributing: PR titles, how releases are cut. |

---

### Task 1: Release scripts and dev dependencies

**Files:**
- Modify: `pnpm-workspace.yaml` (catalog), `package.json` (`scripts`, `devDependencies`)

**Interfaces:**
- Produces: `pnpm changelog` (prepends the entry for the current `package.json` version to `CHANGELOG.md`), `pnpm release` (bump → changelog → commit → tag → push).

- [ ] **Step 1: Add catalog entries**

In `pnpm-workspace.yaml` under `catalog:` add, keeping alphabetical order:

```yaml
  bumpp: ^12.3.0
  conventional-changelog-cli: ^5.0.0
```

- [ ] **Step 2: Add dev dependencies and scripts**

In `package.json` `devDependencies` add `"bumpp": "catalog:"` and `"conventional-changelog-cli": "catalog:"` (alphabetical). Replace the `release` script and add `changelog`:

```json
"changelog": "conventional-changelog -p angular -i CHANGELOG.md -s",
"release": "bumpp --all --commit \"release: v%s\" --tag --push --execute \"pnpm changelog\"",
```

Then run: `pnpm install`
Expected: lockfile updated, no errors.

- [ ] **Step 3: Verify the generator runs (no file change)**

Run: `pnpm exec conventional-changelog -p angular -r 1`
Expected: prints a section for the current version `3.0.0` (or an empty header for the unreleased range — either is fine; the point is the CLI resolves and the preset loads). Nothing written to disk.

Run: `pnpm exec bumpp --help | head -5`
Expected: bumpp usage text.

- [ ] **Step 4: Lint + commit**

Run: `pnpm lint && pnpm typecheck`

```bash
git add pnpm-workspace.yaml package.json pnpm-lock.yaml
git commit -m "build: release via bumpp + conventional-changelog, no local publish

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Convert CHANGELOG.md to the generated format

**Files:**
- Rewrite: `CHANGELOG.md`
- Scratch (not committed): `<scratchpad>/convert-changelog.mjs`

**Interfaces:**
- Consumes: `conventional-changelog-cli` from Task 1.
- Produces: `CHANGELOG.md` whose top is where `pnpm changelog` will prepend future entries.

- [ ] **Step 1: Regenerate the full history to a scratch file**

Run: `pnpm exec conventional-changelog -p angular -r 0 > <scratchpad>/generated.md`
Expected: ~150 lines, headings from `# [3.0.0]` down to `# [0.0.0]`.

- [ ] **Step 2: Write the merge script**

Create `<scratchpad>/convert-changelog.mjs`:

```js
// One-time: merge the hand-written Keep-a-Changelog history into the
// conventional-changelog output. Generated content wins; old entries are only
// added where the generated section lacks them (all "empty" versions, plus the
// breaking-change items of 2.0.0 and 3.0.0).
import { readFileSync, writeFileSync } from 'node:fs'

const [,, generatedPath, oldPath, outPath] = process.argv
const generated = readFileSync(generatedPath, 'utf8')
const old = readFileSync(oldPath, 'utf8')

// ---- parse old file: version -> { Added: [...], Fixed: [...], Changed: [...], Removed: [...] }
const oldSections = new Map()
for (const block of old.split(/\n(?=## \[)/)) {
  const m = block.match(/^## \[([^\]]+)\]/)
  if (!m || m[1] === 'Unreleased') continue
  const version = m[1]
  const groups = {}
  let current = null
  for (const line of block.split('\n')) {
    const h = line.match(/^### (\w+)/)
    if (h) { current = h[1]; groups[current] = groups[current] || []; continue }
    const item = line.match(/^- (.*)$/)
    if (item && current) groups[current].push(item[1])
  }
  oldSections.set(version, groups)
}

// ---- mapping to generated headings
function convert(groups) {
  const out = { 'Features': [], 'Bug Fixes': [], 'BREAKING CHANGES': [], 'Miscellaneous': [] }
  for (const item of groups.Added || []) out.Features.push(item)
  for (const item of groups.Fixed || []) out['Bug Fixes'].push(item)
  for (const item of groups.Removed || []) out['BREAKING CHANGES'].push(item.replace(/^\*\*Breaking:\*\*\s*/, ''))
  for (const item of groups.Changed || []) {
    if (/^\*\*Breaking:\*\*/.test(item)) out['BREAKING CHANGES'].push(item.replace(/^\*\*Breaking:\*\*\s*/, ''))
    else out.Miscellaneous.push(item)
  }
  return out
}

// ---- split generated file into version blocks
const blocks = generated.split(/\n(?=#{1,2} \[)/).filter(Boolean)
const result = []
for (let block of blocks) {
  const m = block.match(/^#{1,2} \[([^\]]+)\]/)
  const version = m[1]
  const hasBody = /^### /m.test(block)
  const converted = convert(oldSections.get(version) || {})
  const wanted = hasBody
    ? { 'BREAKING CHANGES': converted['BREAKING CHANGES'] }  // only breaking items for non-empty versions
    : converted
  const existingHeadings = new Set([...block.matchAll(/^### (.+)$/gm)].map(x => x[1]))
  let extra = ''
  for (const [heading, items] of Object.entries(wanted)) {
    if (!items.length || existingHeadings.has(heading)) continue
    extra += `\n\n### ${heading}\n\n${items.map(i => `* ${i}`).join('\n')}`
  }
  if (version === '2.0.0') block = block.replace(/^(#{1,2} \[2\.0\.0\][^\n]*)/, '$1 [YANKED]')
  result.push(block.trimEnd() + extra)
}

const header = `# Changelog

All notable changes to this project are documented in this file. Entries are generated from
[Conventional Commits](https://www.conventionalcommits.org/) by [conventional-changelog](https://github.com/conventional-changelog/conventional-changelog)
(angular preset) at release time.
`
writeFileSync(outPath, `${header}\n${result.join('\n\n')}\n`)
console.log(`wrote ${outPath}: ${result.length} versions`)
```

- [ ] **Step 3: Run it and inspect**

Run: `node <scratchpad>/convert-changelog.mjs <scratchpad>/generated.md CHANGELOG.md <scratchpad>/CHANGELOG.new.md`
Expected: `wrote …: 30 versions`.

Check, and fix the script (not the output) until all hold:
- `grep -c "^#\{1,2\} \[" <scratchpad>/CHANGELOG.new.md` → `30`.
- No version heading is directly followed by another heading (every version has at least one `###`): `awk '/^#+ \[/{if(prev&&empty)print prev;prev=$0;empty=1;next}/\S/{empty=0}END{if(empty)print prev}' <scratchpad>/CHANGELOG.new.md` prints nothing.
- `3.0.0` has a `### BREAKING CHANGES` section listing the nested-layout-name change and the `vite-plugin-pages` removal; `2.0.0` heading ends with `[YANKED]` and has `### BREAKING CHANGES`.
- `2.0.1` has `### Bug Fixes` with the `pnpm publish` / `catalog:` item; `0.0.1` has `### Features` "Support Vite 6"; `0.1.4` has `### Miscellaneous` with the deps item.
- No `[Unreleased]` and no trailing `[x.y.z]: https://…` link list.

- [ ] **Step 4: Replace the file**

Run: `cp <scratchpad>/CHANGELOG.new.md CHANGELOG.md`

- [ ] **Step 5: Prove `pnpm changelog` prepends without disturbing the converted history**

Do this on a throwaway clone so the real tree is untouched:

```bash
REPO="D:/projects/personal/loicduong/vite-plugin-vue-layouts-next"
git clone -q "$REPO" <scratchpad>/cl-test && cd <scratchpad>/cl-test
cp "$REPO/CHANGELOG.md" CHANGELOG.md          # the converted file from Step 4 (not yet committed in the repo)
git add -A && git commit -qm "chore: converted changelog"
git commit -q --allow-empty -m "feat: example feature for changelog test"
node -e "const p=require('./package.json');p.version='3.1.0';require('fs').writeFileSync('package.json',JSON.stringify(p,null,2)+'
')"
"$REPO/node_modules/.bin/conventional-changelog" -p angular -i CHANGELOG.md -s
head -12 CHANGELOG.md
```

Expected: a new `# [3.1.0](…compare/v3.0.0...v3.1.0) (date)` section with `### Features` → `* example feature for changelog test` inserted **between the header paragraph and `# [3.0.0]`**; everything from `# [3.0.0]` down is byte-identical to `$REPO/CHANGELOG.md` (compare with `diff <(sed -n '/^# \[3.0.0\]/,$p' CHANGELOG.md) <(sed -n '/^# \[3.0.0\]/,$p' "$REPO/CHANGELOG.md")`). Then `rm -rf <scratchpad>/cl-test`.

- [ ] **Step 6: Lint + commit**

Run: `pnpm lint` (markdown is linted; fix list-marker or spacing complaints in the script's output format, then re-run Steps 3–4).

```bash
git add CHANGELOG.md
git commit -m "docs: convert CHANGELOG to conventional-changelog format

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: `ci.yml`

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Produces: reusable workflow (`workflow_call`) named `CI` with one job `test`, used by Task 5.

- [ ] **Step 1: Write the workflow**

```yaml
name: CI

on:
  pull_request:
  push:
    branches:
      - main
  workflow_call:

permissions:
  contents: read

concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      - uses: pnpm/action-setup@v6

      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - run: pnpm build

      - run: pnpm test

      - run: pnpm lint

      - run: pnpm typecheck

      - name: Build examples
        run: pnpm spa:build && pnpm ssg:build && pnpm cli:build && pnpm ner:build
```

- [ ] **Step 2: Lint + commit**

Run: `pnpm lint`

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add test workflow

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: `semantic-pr.yml`

**Files:**
- Create: `.github/workflows/semantic-pr.yml`

- [ ] **Step 1: Write the workflow**

```yaml
name: Semantic PR

on:
  pull_request_target:
    types:
      - opened
      - edited
      - synchronize
      - reopened

permissions:
  pull-requests: read

jobs:
  title:
    runs-on: ubuntu-latest
    steps:
      # Squash-merged PR titles become commit subjects, which conventional-changelog
      # turns into changelog entries — so titles must be Conventional Commits.
      - uses: amannn/action-semantic-pull-request@v6
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          types: |
            feat
            fix
            docs
            refactor
            perf
            test
            build
            ci
            chore
            revert
          requireScope: false
          subjectPattern: ^(?![A-Z]).+$
          subjectPatternError: |
            The subject "{subject}" must start with a lowercase letter.
```

- [ ] **Step 2: Lint + commit**

```bash
git add .github/workflows/semantic-pr.yml
git commit -m "ci: enforce Conventional Commits PR titles

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Rewrite `release.yml`

**Files:**
- Rewrite: `.github/workflows/release.yml`

**Interfaces:**
- Consumes: `.github/workflows/ci.yml` (`workflow_call`) from Task 3; `pnpm build`; npm Trusted Publishing configured for workflow `release.yml` + environment `Release`.

- [ ] **Step 1: Write the workflow**

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

permissions:
  contents: read

jobs:
  test:
    uses: ./.github/workflows/ci.yml

  publish:
    needs: test
    if: github.repository == 'loicduong/vite-plugin-vue-layouts-next'
    runs-on: ubuntu-latest
    # npm Trusted Publishing is bound to this workflow file + environment;
    # `id-token: write` mints the OIDC token, no NPM_TOKEN secret involved.
    environment: Release
    permissions:
      contents: write
      id-token: write
    steps:
      - uses: actions/checkout@v7
        with:
          persist-credentials: false

      - uses: pnpm/action-setup@v6

      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: pnpm
          registry-url: https://registry.npmjs.org

      - run: pnpm install --frozen-lockfile

      # Trusted Publishing needs npm >= 11.5
      - run: npm i -g npm@latest

      - run: pnpm build

      - run: pnpm publish --no-git-checks

      - name: Release notes for this version
        run: pnpm exec conventional-changelog -p angular -r 1 > release-notes.md

      - name: Create GitHub release
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          TAG: ${{ github.ref_name }}
        run: gh release create "$TAG" --title "$TAG" --notes-file release-notes.md
```

- [ ] **Step 2: Lint + commit**

```bash
git add .github/workflows/release.yml
git commit -m "ci: publish from GitHub Actions with npm Trusted Publishing

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: README contributing notes

**Files:**
- Modify: `README.md` (`## Contributing`, line ~127)

- [ ] **Step 1: Extend the section**

Replace the Contributing body with:

```md
## Contributing

PRs accepted. [Open an issue][open-an-issue] or submit PRs for any improvements.

- PR titles must follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat: …`, `fix: …`, `docs: …`);
  they become the squash-merge commit subject and feed the generated changelog.
- Releases are cut by a maintainer with `pnpm release` (version bump + changelog + `release: vX.Y.Z` commit + tag);
  GitHub Actions then tests, builds, publishes to npm with provenance and creates the GitHub Release.
```

- [ ] **Step 2: Lint + commit**

```bash
git add README.md
git commit -m "docs: describe PR title and release conventions

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Push and verify CI

- [ ] **Step 1: Push the branch and open a draft check**

```bash
git push -u origin chore/release-pipeline
```

Then create the PR (title `ci: release pipeline with generated changelog and trusted publishing`). Expected: `CI` and `Semantic PR` workflows run on the PR and pass; `Docs` also runs (docs unchanged → passes).

- [ ] **Step 2: Report the manual setup to the owner**

Before the first tag after merge, the owner must:
1. npmjs.com → `vite-plugin-vue-layouts-next` → Settings → Trusted publisher → GitHub Actions: repo `loicduong/vite-plugin-vue-layouts-next`, workflow `release.yml`, environment `Release`.
2. GitHub → Settings → Environments → new environment `Release`.

Without (1) the `pnpm publish` step fails with `ENEEDAUTH`; without (2) GitHub creates the environment on first use, but the Trusted Publisher binding requires the name to match.
