# Release Pipeline (Vue/Vite-style)

## Context

Today `pnpm release` runs `npx bumpp --commit --tag --push && pnpm publish`:
the version is bumped, tagged and pushed, then `dist/` is published from the
developer's machine without a build or test step. `CHANGELOG.md` is hand-written
(Keep a Changelog) and updated in a separate commit *after* the tag, so the tag
never contains its own changelog. `release.yml` creates a GitHub Release with
`conventional-github-releaser` (unmaintained since 2023) from commit messages —
a second, diverging source of release notes. There is no CI that runs the test
suite.

`vuejs/core`, `vuejs/router` and `vitejs/vite` all use the same two-phase
model: the local release step only bumps, generates the changelog with
`conventional-changelog`, commits `release: vX.Y.Z` and tags; CI builds,
tests, publishes with provenance and creates the GitHub Release. This spec
adopts that model.

## Goals

- One release commit `release: vX.Y.Z` that contains the version bump and the
  changelog entry, with the tag on that commit.
- Changelog generated from Conventional Commits (`conventional-changelog`,
  preset `angular`, like Vue/Vite); the whole existing `CHANGELOG.md` is
  converted to that format once.
- Build, test and publish on GitHub Actions, triggered by the `v*` tag, using
  npm Trusted Publishing (OIDC, no long-lived token, provenance included).
- GitHub Release notes come from the same generator as the changelog.
- PR titles enforced to Conventional Commits so squash-merges feed the changelog.
- A CI workflow that runs on pull requests and `main`.

## Non-Goals

- Changesets, monorepo tagging (`pkg@x.y.z`), canary/edge releases.
- Changing the versioning or support policy.
- Touching `docs.yml` (already deploys on tags).

## Local release step

`package.json` scripts:

```json
"release": "bumpp --all --commit \"release: v%s\" --tag --push --execute \"pnpm changelog\"",
"changelog": "conventional-changelog -p angular -i CHANGELOG.md -s"
```

`bumpp` prompts for the version, writes `package.json`, runs `--execute`
(generates the changelog entry for the new version at the top of
`CHANGELOG.md`), commits as `release: vX.Y.Z`, tags `vX.Y.Z` on that commit
and pushes the branch and the tag. No local publish. `bumpp` only stages the
files it bumps by default, so without `--all` the changelog written by the
`--execute` hook would be left out of the commit; `--all` is what sweeps it
in. Because `--all` stages the entire working tree, the maintainer must start
the release from a clean tree (`git status` clean) or unrelated local changes
end up in the release commit.

Dev dependencies added through the catalog: `bumpp`, `conventional-changelog-cli`.
`npx bumpp` (uncached download) is replaced by the pinned dev dependency.

## CHANGELOG.md conversion (one-time)

`conventional-changelog -p angular -r 0` regenerates every tagged version from
git history. Because older commits do not follow Conventional Commits, 19 of
30 versions come out empty and the hand-written breaking-change notes for
2.0.0 and 3.0.0 are lost. The conversion therefore is:

1. Regenerate the full file with `-r 0`.
2. Keep the generated content of every version (commit links).
3. Merge entries from the old hand-written file, rewritten in the generated
   format (`* text`), under these headings:

   | Keep a Changelog | Converted |
   | --- | --- |
   | `### Added` | `### Features` |
   | `### Fixed` | `### Bug Fixes` |
   | `### Removed`, or items marked **Breaking** | `### BREAKING CHANGES` |
   | remaining `### Changed` (deps, docs, examples) | `### Miscellaneous` |

   Only what the generated section lacks is added: for the 19 empty versions,
   everything from the old file; for versions whose old entry has breaking
   items (3.0.0), those items; for other versions, nothing (generated content
   wins).
4. No header: like `vuejs/core`'s `CHANGELOG.md`, the file starts with the
   latest version heading, because `conventional-changelog -i -s` prepends at
   the very top of the file and would push any preamble down on every release.
   The Keep a Changelog / SemVer preamble, the `[Unreleased]` section and the
   trailing `[x.y.z]: compare` link list are removed (headings carry the
   compare links). A note on how the file is generated lives in `README.md`.
5. `2.0.0`, `0.1.4` and `0.1.0` keep a `[YANKED]` note in their heading line.

The `[Unreleased]` notes written for 3.1.0 are dropped; 3.1.0 will be generated
from the squash commit `feat: dynamic layouts (setPageLayout, useLayout) and shared runtime entry (#38)`.

## CI workflows

### `ci.yml` (new)

- `on: pull_request`, `push: branches: [main]`, `workflow_call`.
- One job: checkout, pnpm (`pnpm/action-setup`), Node 22 (`actions/setup-node`,
  pnpm cache), `pnpm install --frozen-lockfile`, `pnpm build`, `pnpm test`,
  `pnpm lint`, `pnpm typecheck`, then `pnpm spa:build && pnpm ssg:build && pnpm cli:build && pnpm ner:build`.
- Concurrency group per ref, cancel in progress.

### `semantic-pr.yml` (new)

- `on: pull_request_target: [opened, edited, synchronize, reopened]`.
- `amannn/action-semantic-pull-request` with types
  `feat fix docs refactor perf test build ci chore revert`, scope optional,
  subject must not start with an uppercase letter.
- `permissions: pull-requests: read`.

### `release.yml` (rewritten)

- `on: push: tags: ['v*']`.
- job `test`: `uses: ./.github/workflows/ci.yml`.
- job `publish`: `needs: test`, `if: github.repository == 'loicduong/vite-plugin-vue-layouts-next'`,
  `environment: Release`, `permissions: { contents: write, id-token: write }`.
  Steps: checkout (`persist-credentials: false`), pnpm, Node 22 with
  `registry-url: https://registry.npmjs.org`, `pnpm install --frozen-lockfile`,
  `npm i -g npm@latest` (Trusted Publishing needs npm ≥ 11.5), `pnpm build`,
  `pnpm pack --out package.tgz` (pnpm resolves `catalog:` specifiers in the
  packed manifest — the 2.0.0 incident cannot recur) and
  `npm publish package.tgz --provenance --access public` (npm's documented
  OIDC Trusted Publishing path; no `NODE_AUTH_TOKEN`). Release notes are the
  top section of `CHANGELOG.md`, which the release commit already contains
  (`conventional-changelog -r 1` at a tagged HEAD emits nothing, and the
  checkout is shallow): `awk 'NR>1 && /^##? \[/{exit} {print}' CHANGELOG.md > release-notes.md`
  followed by `test -s release-notes.md`. Then, idempotently,
  `gh release view "$TAG" || gh release create "$TAG" --verify-tag --title "$TAG" --notes-file release-notes.md`
  (`GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}`).
- `conventional-github-releaser` and its token are removed.

## One-time manual setup (repository owner)

- npmjs.com → package `vite-plugin-vue-layouts-next` → Settings → Trusted
  publisher: GitHub Actions, repository `loicduong/vite-plugin-vue-layouts-next`,
  workflow `release.yml`, environment `Release`.
- GitHub → Settings → Environments → create `Release` (optionally require a
  reviewer).

## Documentation

- `README.md` Contributing section: PR titles follow Conventional Commits;
  releases are cut with `pnpm release` and published by CI.
- `docs/guide/index.md` Support Policy already says narrowing peers is a major;
  no change.

## Verification

- `pnpm changelog` on a scratch clone with a fake tag produces a new section at
  the top and leaves the converted history untouched.
- On a scratch clone (`git clone` + `pnpm install --frozen-lockfile`), running
  `pnpm exec bumpp --all --commit "release: v%s" --tag --no-push --execute "pnpm changelog"`
  produces a `release: vX.Y.Z` commit whose `git show --stat HEAD` lists both
  `CHANGELOG.md` and `package.json`, and the tagged `CHANGELOG.md` starts with
  the new version heading (`git show vX.Y.Z:CHANGELOG.md | head -1`).
- `ci.yml` green on the PR.
- After merge: `pnpm release` for 3.1.0 → tag pushed → `release.yml` publishes
  3.1.0 with provenance and creates the GitHub Release with the 3.1.0 notes.
