import type { ResolvedOptions } from '../src/types'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { getFilesFromPath } from '../src/files'

const layoutsRoot = resolve(fileURLToPath(import.meta.url), '..', 'fixtures', 'layouts-exclude')

function createOptions(overrides: Partial<ResolvedOptions> = {}): ResolvedOptions {
  return {
    defaultLayout: 'default',
    layoutsDirs: layoutsRoot,
    extensions: ['vue'],
    exclude: [],
    importMode: () => 'async',
    inheritDefaultLayout: true,
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
