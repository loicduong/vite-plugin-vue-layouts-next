import * as fs from 'node:fs'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { normalizePath, resolveDirs } from '../src/utils'

vi.mock('node:fs', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:fs')>()
  return { ...original, readdirSync: vi.fn(original.readdirSync), realpathSync: vi.fn(original.realpathSync) }
})

let tmp: string

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'vue-layouts-walk-'))
  for (const dir of ['src/a/layouts-1', 'src/b/layouts-3', 'src/c/d/e', 'src/f/g'])
    await mkdir(join(tmp, dir), { recursive: true })
  vi.mocked(fs.readdirSync).mockClear()
  vi.mocked(fs.realpathSync).mockClear()
})

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true })
})

describe('resolveDirs directory walk', () => {
  it('walks a base once for every brace alternative after it', () => {
    resolveDirs('src/**/layouts-1', tmp)
    const single = vi.mocked(fs.readdirSync).mock.calls.length
    vi.mocked(fs.readdirSync).mockClear()

    const dirs = resolveDirs('src/**/layouts-{1..20}', tmp)

    expect(vi.mocked(fs.readdirSync).mock.calls.length).toBe(single)
    expect(dirs.sort()).toEqual([
      normalizePath(join(tmp, 'src/a/layouts-1')),
      normalizePath(join(tmp, 'src/b/layouts-3')),
    ])
  })

  it('resolves real paths only for the base and symlinks', () => {
    resolveDirs('src/**/layouts-1', tmp)

    expect(vi.mocked(fs.realpathSync)).toHaveBeenCalledTimes(1)
  })
})
