import type { Dirent } from 'node:fs'
import { readdirSync, realpathSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import expand from 'brace-expansion'
import Debug from 'debug'
import picomatch from 'picomatch'

const REGEX_BACKSLASH = /\\/g
const REGEX_PATH_CHARS = /[_.\-\\/]/g
const REGEX_BRACKETS_PARENS = /[[:\]()]/g
const REGEX_TRAILING_SLASHES = /\/+$/
const REGEX_BRACES = /[{}]/g
const REGEX_REPEATED_SLASHES = /(?<=[^/])\/{2,}/g

export function extensionsToGlob(extensions: string[]) {
  return extensions.length > 1 ? `{${extensions.join(',')}}` : extensions[0] || ''
}

export function normalizePath(str: string): string {
  return str.replace(REGEX_BACKSLASH, '/')
}

export const debug = Debug('vite-plugin-layouts-next')

export function pathToName(filepath: string) {
  return filepath.replace(REGEX_PATH_CHARS, '_').replace(REGEX_BRACKETS_PARENS, '$')
}

function isExistingDir(path: string) {
  try {
    return statSync(path).isDirectory()
  }
  catch {
    return false
  }
}

function isDirectory(entry: Dirent, path: string) {
  return entry.isDirectory() || (entry.isSymbolicLink() && isExistingDir(path))
}

/**
 * picomatch, which tinyglobby also uses, matches `{1..3}` but not ranges like `{1..10}` or `{01..10}`.
 * Any brace left after expansion is literal, either escaped or like `{tenant}`, but brace-expansion drops
 * the escapes, so they are added back before picomatch reads the pattern.
 */
export function expandBraces(patterns: string[]): string[] {
  return patterns.flatMap(pattern => expand(pattern).map(expanded => expanded.replace(REGEX_BRACES, '\\$&')))
}

// `picomatch.scan` misses every glob after an escaped brace, so the static base is found one segment at a time.
function splitBase(pattern: string) {
  const segments = pattern.split('/')
  // A leading `!` in a single segment is part of the name, not a negation of the whole pattern.
  const globStart = segments.findIndex(segment => picomatch.scan(segment, { nonegate: true }).isGlob)
  const staticSegments = globStart === -1 ? segments : segments.slice(0, globStart)
  return {
    // Only the base is a filesystem path; the glob keeps the escapes the matcher still needs.
    base: staticSegments.map(segment => picomatch.scan(segment, { unescape: true, nonegate: true }).base).join('/'),
    glob: globStart === -1 ? '' : segments.slice(globStart).join('/'),
  }
}

// tinyglobby does not return a directory symlink as a match, so the directories are walked here.
// Braces are expanded first because `picomatch.scan` finds no base for `{/a,/b}/**`.
function findDirs(pattern: string, root: string): string[] {
  const found = new Set<string>()
  const globsByBase = new Map<string, string[]>()

  for (const expanded of expandBraces([pattern])) {
    // Walked paths never end in a slash or hold an empty segment, so `src/**/layouts/` and `src/**//layouts`
    // would match nothing. A leading `//` is kept for UNC paths.
    const split = splitBase(expanded.replace(REGEX_TRAILING_SLASHES, '').replace(REGEX_REPEATED_SLASHES, '/'))
    const base = resolve(root, split.base)
    const { glob } = split
    // A brace alternative can be a plain path, as in `{src/**/layouts,shared/layouts}`.
    if (!glob) {
      if (isExistingDir(base))
        found.add(base)
      continue
    }
    const globs = globsByBase.get(base)
    if (globs)
      globs.push(glob)
    else
      globsByBase.set(base, [glob])
  }

  for (const [base, globs] of globsByBase) {
    // `posix` makes `[!b]` a negated class, as it is in fast-glob.
    for (const dir of walkDirs(base, picomatch(globs, { posix: true })))
      found.add(dir)
  }
  return [...found]
}

function walkDirs(base: string, isMatch: (path: string) => boolean): string[] {
  const found: { path: string, depth: number }[] = []
  const ancestors = new Set<string>()

  const walk = (dir: string, real: string, relDir: string, depth: number) => {
    // A symlink can point back to one of its own ancestors.
    if (ancestors.has(real))
      return
    let entries: Dirent[]
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    }
    catch {
      return
    }

    ancestors.add(real)
    for (const entry of entries) {
      const path = join(dir, entry.name)
      if (!isDirectory(entry, path))
        continue
      const relPath = relDir ? `${relDir}/${entry.name}` : entry.name
      if (isMatch(relPath))
        found.push({ path, depth })
      let childReal = join(real, entry.name)
      if (entry.isSymbolicLink()) {
        try {
          childReal = realpathSync(path)
        }
        catch {
          continue
        }
      }
      walk(path, childReal, relPath, depth + 1)
    }
    ancestors.delete(real)
  }

  let real: string
  try {
    real = realpathSync(base)
  }
  catch {
    return []
  }
  walk(base, real, '', 0)
  // Shallower directories come first, as they did with fast-glob, because a later layout of the same name wins.
  return found.sort((a, b) => a.depth - b.depth).map(({ path }) => path)
}

export function resolveDirs(dirs: string | string[] | null, root: string) {
  if (dirs === null)
    return []
  const dirsArray = Array.isArray(dirs) ? dirs : [dirs]
  const dirsResolved: string[] = []

  for (const dir of dirsArray) {
    if (dir.includes('**')) {
      for (const match of findDirs(dir, root))
        dirsResolved.push(normalizePath(match))
    }
    else {
      dirsResolved.push(normalizePath(resolve(root, dir)))
    }
  }

  return dirsResolved
}
