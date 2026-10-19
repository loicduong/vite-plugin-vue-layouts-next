import type { ResolvedOptions } from '../src/types'
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
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

async function withTmpDirs(dirs: string[], run: (tmp: string) => void | Promise<void>) {
  const tmp = await mkdtemp(join(tmpdir(), 'vue-layouts-'))
  try {
    for (const dir of dirs)
      await mkdir(join(tmp, dir), { recursive: true })
    await run(tmp)
  }
  finally {
    await rm(tmp, { recursive: true, force: true })
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

  it('expands brace ranges in exclude', async () => {
    await withTmpDirs(['1', '2', '10', 'keep'], async (tmp) => {
      for (const dir of ['1', '2', '10', 'keep'])
        await writeFile(join(tmp, dir, 'layout.vue'), '')

      const files = await getFilesFromPath(tmp, createOptions({ exclude: ['{1..10}/**'] }))

      expect(files).toEqual(['keep/layout.vue'])
    })
  })

  it('treats a non-expanding brace in exclude as literal', async () => {
    await withTmpDirs(['{tenant}', 'tenant', 'keep'], async (tmp) => {
      for (const dir of ['{tenant}', 'tenant', 'keep'])
        await writeFile(join(tmp, dir, 'layout.vue'), '')

      const files = await getFilesFromPath(tmp, createOptions({ exclude: ['{tenant}/**'] }))

      expect(files.sort()).toEqual(['keep/layout.vue', 'tenant/layout.vue'])
    })
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

  it('expands multi-digit, padded and stepped brace ranges', async () => {
    await withTmpDirs(['1/x/layouts', '2/layouts', '5/layouts', '10/layouts', '01/layouts', 'src/layouts'], (tmp) => {
      const expected = (dirs: string[]) => dirs.map(dir => normalizePath(join(tmp, dir))).sort()

      expect(resolveDirs('{1..10}/**/layouts', tmp).sort()).toEqual(expected(['1/x/layouts', '2/layouts', '5/layouts', '10/layouts']))
      expect(resolveDirs('{01..03}/**/layouts', tmp).sort()).toEqual(expected(['01/layouts']))
      expect(resolveDirs('{1..9..4}/**/layouts', tmp).sort()).toEqual(expected(['1/x/layouts', '5/layouts']))
      expect(resolveDirs('{{1..2},src}/**/layouts', tmp).sort()).toEqual(expected(['1/x/layouts', '2/layouts', 'src/layouts']))
    })
  })

  it('keeps an escaped comma inside a brace alternative', async () => {
    await withTmpDirs(['foo,bar/layouts', 'bar/layouts', 'baz/layouts'], (tmp) => {
      expect(resolveDirs('{foo\\,bar,baz}/**/layouts', tmp).sort()).toEqual([
        normalizePath(join(tmp, 'baz/layouts')),
        normalizePath(join(tmp, 'foo,bar/layouts')),
      ])
    })
  })

  it('unescapes glob characters in the static base', async () => {
    await withTmpDirs(['src/[tenant]/x/layouts'], (tmp) => {
      expect(resolveDirs('src/\\[tenant\\]/**/layouts', tmp)).toEqual([
        normalizePath(join(tmp, 'src/[tenant]/x/layouts')),
      ])
    })
  })

  it('keeps escaped glob characters after `**` literal', async () => {
    await withTmpDirs(['src/a/layouts[old]', 'src/b/layoutso', 'src/c/layoutsd'], (tmp) => {
      expect(resolveDirs('src/**/layouts\\[old\\]', tmp)).toEqual([
        normalizePath(join(tmp, 'src/a/layouts[old]')),
      ])
    })
  })

  it('keeps escaped braces after `**` literal', async () => {
    await withTmpDirs(['src/a/layouts{admin,legacy}', 'src/b/layoutsadmin', 'src/c/layoutslegacy'], (tmp) => {
      expect(resolveDirs('src/**/layouts\\{admin,legacy\\}', tmp)).toEqual([
        normalizePath(join(tmp, 'src/a/layouts{admin,legacy}')),
      ])
    })
  })

  it('walks below a non-expanding brace in the base', async () => {
    await withTmpDirs(['src/{tenant}/x/layouts', 'src/other/layouts'], (tmp) => {
      expect(resolveDirs('src/{tenant}/**/layouts', tmp)).toEqual([
        normalizePath(join(tmp, 'src/{tenant}/x/layouts')),
      ])
    })
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
