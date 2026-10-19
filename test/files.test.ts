import type { ResolvedOptions } from '../src/types'
import { relative, resolve } from 'node:path'
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
})

describe('resolveDirs', () => {
  it('resolves plain directories against the root', () => {
    expect(resolveDirs(['src/layouts', 'src/modules/admin/layouts'], dirsRoot)).toEqual([
      normalizePath(resolve(dirsRoot, 'src/layouts')),
      normalizePath(resolve(dirsRoot, 'src/modules/admin/layouts')),
    ])
  })

  it('expands `**` patterns to the matching directories only', () => {
    // `**` patterns are matched from the process cwd.
    const pattern = `${normalizePath(relative(process.cwd(), dirsRoot))}/src/**/layouts`
    const dirs = resolveDirs(pattern, process.cwd())

    expect(dirs.sort()).toEqual([
      normalizePath(resolve(dirsRoot, 'src/layouts')),
      normalizePath(resolve(dirsRoot, 'src/modules/admin/layouts')),
      normalizePath(resolve(dirsRoot, 'src/modules/blog/layouts')),
    ])
  })

  it('returns no directories for null', () => {
    expect(resolveDirs(null, dirsRoot)).toEqual([])
  })

  it('scans every resolved directory and applies exclude to each', async () => {
    const pattern = `${normalizePath(relative(process.cwd(), dirsRoot))}/src/modules/**/layouts`
    const dirs = resolveDirs([normalizePath(resolve(dirsRoot, 'src/layouts')), pattern], process.cwd()).sort()
    const options = createOptions({ layoutsDirs: dirs, exclude: ['**/drafts/**'] })

    const scanned = await Promise.all(dirs.map(async dir => [normalizePath(relative(dirsRoot, dir)), (await getFilesFromPath(dir, options)).sort()]))

    expect(scanned).toEqual([
      ['src/layouts', ['default.vue']],
      ['src/modules/admin/layouts', ['admin.vue']],
      ['src/modules/blog/layouts', ['post.vue']],
    ])
  })
})
