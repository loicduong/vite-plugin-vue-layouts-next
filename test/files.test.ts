import type { ResolvedOptions } from '../src/types'
import { mkdir, mkdtemp, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { getFilesFromPath } from '../src/files'
import { normalizePath, resolveDirs } from '../src/utils'

const fixturesRoot = resolve(fileURLToPath(import.meta.url), '..', 'fixtures')
const layoutsRoot = resolve(fixturesRoot, 'layouts-exclude')
const dirsRoot = resolve(fixturesRoot, 'layouts-dirs')

function createOptions(overrides: Partial<ResolvedOptions> = {}): ResolvedOptions {
  return {
    defaultLayout: 'default',
    layoutsDirs: layoutsRoot,
    extensions: ['vue'],
    exclude: [],
    importMode: () => 'async',
    inheritDefaultLayout: true,
    dts: false,
    ...overrides,
  }
}

describe('getFilesFromPath', () => {
  it('always drops __*__ directories and only matches the configured extensions', async () => {
    const files = await getFilesFromPath(layoutsRoot, createOptions())

    expect(files.sort()).toEqual(['default.vue', 'drafts/wip.vue'])
  })

  it('applies the exclude globs', async () => {
    const files = await getFilesFromPath(layoutsRoot, createOptions({ exclude: ['**/drafts/**'] }))

    expect(files).toEqual(['default.vue'])
  })

  it('honours additional extensions', async () => {
    const files = await getFilesFromPath(layoutsRoot, createOptions({ extensions: ['vue', 'md'] }))

    expect(files.sort()).toEqual(['default.vue', 'drafts/wip.vue', 'markdown.md'])
  })

  it('does not return the contents of a directory whose name matches the extension', async () => {
    const files = await getFilesFromPath(layoutsRoot, createOptions())

    expect(files.filter(file => file.startsWith('group.vue/'))).toEqual([])
  })
})

describe('resolveDirs', () => {
  it('resolves plain directories against the root', () => {
    expect(resolveDirs(['src/layouts', 'src/modules/admin/layouts'], dirsRoot)).toEqual([
      normalizePath(resolve(dirsRoot, 'src/layouts')),
      normalizePath(resolve(dirsRoot, 'src/modules/admin/layouts')),
    ])
  })

  it('expands relative `**` patterns from the root, not the cwd', () => {
    expect(process.cwd()).not.toBe(dirsRoot)
    const dirs = resolveDirs('src/**/layouts', dirsRoot)

    expect(dirs.sort()).toEqual([
      normalizePath(resolve(dirsRoot, 'src/layouts')),
      normalizePath(resolve(dirsRoot, 'src/modules/admin/layouts')),
      normalizePath(resolve(dirsRoot, 'src/modules/blog/layouts')),
    ])
  })

  it('keeps absolute `**` patterns absolute when the root differs from the cwd', () => {
    const dirs = resolveDirs(`${normalizePath(dirsRoot)}/src/**/layouts`, fixturesRoot)

    expect(dirs.sort()).toEqual([
      normalizePath(resolve(dirsRoot, 'src/layouts')),
      normalizePath(resolve(dirsRoot, 'src/modules/admin/layouts')),
      normalizePath(resolve(dirsRoot, 'src/modules/blog/layouts')),
    ])
  })

  it('expands a leading brace of absolute roots', () => {
    const modules = normalizePath(resolve(dirsRoot, 'src/modules'))
    const dirs = resolveDirs(`{${modules}/admin,${modules}/blog,${modules}/admin}/**/layouts`, fixturesRoot)

    expect(dirs.sort()).toEqual([
      `${modules}/admin/layouts`,
      `${modules}/blog/layouts`,
    ])
  })

  it('ignores a trailing slash on a `**` pattern', () => {
    expect(resolveDirs('src/**/layouts/', dirsRoot).sort()).toEqual(resolveDirs('src/**/layouts', dirsRoot).sort())
  })

  it('keeps plain-path alternatives of a leading brace that exist', () => {
    const dirs = resolveDirs('{src/modules/**/layouts,src/layouts,src/missing}', dirsRoot)

    expect(dirs.sort()).toEqual([
      normalizePath(resolve(dirsRoot, 'src/layouts')),
      normalizePath(resolve(dirsRoot, 'src/modules/admin/layouts')),
      normalizePath(resolve(dirsRoot, 'src/modules/blog/layouts')),
    ])
  })

  it('matches a leading brace range', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'vue-layouts-range-'))
    try {
      for (const dir of ['1/x/layouts', '2/layouts', '5/layouts', 'src/layouts'])
        await mkdir(join(tmp, dir), { recursive: true })
      const expected = (dirs: string[]) => dirs.map(dir => normalizePath(join(tmp, dir)))

      expect(resolveDirs('{1..3}/**/layouts', tmp).sort()).toEqual(expected(['1/x/layouts', '2/layouts']))
      expect(resolveDirs('{{1..3},src}/**/layouts', tmp).sort()).toEqual(expected(['1/x/layouts', '2/layouts', 'src/layouts']))
    }
    finally {
      await rm(tmp, { recursive: true, force: true })
    }
  })

  it('does not include the base directory of a trailing `**`', () => {
    const dirs = resolveDirs(`${normalizePath(dirsRoot)}/src/modules/**`, fixturesRoot)

    expect(dirs.sort()).toEqual([
      'admin',
      'admin/layouts',
      'admin/layouts/drafts',
      'blog',
      'blog/layouts',
    ].map(dir => normalizePath(resolve(dirsRoot, 'src/modules', dir))))
  })

  it('matches symlinked directories and survives symlink loops', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'vue-layouts-dirs-'))
    try {
      await mkdir(join(tmp, 'shared', 'layouts'), { recursive: true })
      await mkdir(join(tmp, 'src', 'layouts'), { recursive: true })
      await mkdir(join(tmp, 'src', 'module'), { recursive: true })
      // `junction` lets the test create directory links on Windows without admin rights.
      await symlink(join(tmp, 'shared', 'layouts'), join(tmp, 'src', 'module', 'layouts'), 'junction')
      await symlink(join(tmp, 'src'), join(tmp, 'src', 'module', 'loop'), 'junction')

      const dirs = resolveDirs(`${normalizePath(tmp)}/src/**/layouts`, fixturesRoot)

      expect(dirs.sort()).toEqual([
        normalizePath(join(tmp, 'src', 'layouts')),
        normalizePath(join(tmp, 'src', 'module', 'layouts')),
      ])
    }
    finally {
      await rm(tmp, { recursive: true, force: true })
    }
  })

  it('returns no directories for null', () => {
    expect(resolveDirs(null, dirsRoot)).toEqual([])
  })

  it('scans every resolved directory and applies exclude to each', async () => {
    const dirs = resolveDirs(['src/layouts', 'src/modules/**/layouts'], dirsRoot).sort()
    const options = createOptions({ layoutsDirs: dirs, exclude: ['**/drafts/**'] })

    const scanned = await Promise.all(dirs.map(async dir => [normalizePath(relative(dirsRoot, dir)), (await getFilesFromPath(dir, options)).sort()]))

    expect(scanned).toEqual([
      ['src/layouts', ['default.vue']],
      ['src/modules/admin/layouts', ['admin.vue']],
      ['src/modules/blog/layouts', ['post.vue']],
    ])
  })
})
