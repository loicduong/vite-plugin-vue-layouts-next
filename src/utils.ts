import type { Dirent } from 'node:fs'
import { readdirSync, realpathSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import Debug from 'debug'
import picomatch from 'picomatch'

const REGEX_BACKSLASH = /\\/g
const REGEX_PATH_CHARS = /[_.\-\\/]/g
const REGEX_BRACKETS_PARENS = /[[:\]()]/g
const REGEX_TRAILING_SLASHES = /\/+$/

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

function isDirectory(entry: Dirent, path: string) {
  if (entry.isDirectory())
    return true
  if (!entry.isSymbolicLink())
    return false
  try {
    return statSync(path).isDirectory()
  }
  catch {
    return false
  }
}

// `picomatch.scan` finds no base for `{/a,/b}/**`, so a leading brace is split into one pattern per root.
function expandLeadingBraces(pattern: string): string[] {
  if (!pattern.startsWith('{'))
    return [pattern]

  const alternatives: string[] = []
  let depth = 0
  let start = 1
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i]
    if (char === '{') {
      depth++
    }
    else if (char === ',' && depth === 1) {
      alternatives.push(pattern.slice(start, i))
      start = i + 1
    }
    else if (char === '}' && --depth === 0) {
      // A group without a top-level comma, like a `{1..3}` range, is left for picomatch to match.
      if (alternatives.length === 0)
        return [pattern]
      alternatives.push(pattern.slice(start, i))
      const rest = pattern.slice(i + 1)
      return alternatives.flatMap(alternative => expandLeadingBraces(alternative + rest))
    }
  }

  return [pattern]
}

// tinyglobby does not return a directory symlink as a match, so the directories are walked here.
function findDirs(pattern: string, root: string): string[] {
  const found = new Set<string>()
  for (const expanded of expandLeadingBraces(pattern)) {
    for (const dir of walkDirs(expanded, root))
      found.add(dir)
  }
  return [...found]
}

function walkDirs(pattern: string, root: string): string[] {
  // Walked paths never end in a slash, so `src/**/layouts/` would match nothing.
  const { base, glob } = picomatch.scan(pattern.replace(REGEX_TRAILING_SLASHES, ''))
  // A brace alternative can be a plain path, as in `{src/**/layouts,shared/layouts}`.
  if (!glob) {
    const dir = resolve(root, base)
    try {
      return statSync(dir).isDirectory() ? [dir] : []
    }
    catch {
      return []
    }
  }

  const isMatch = picomatch(glob)
  const found: string[] = []
  const ancestors = new Set<string>()

  const walk = (dir: string, relDir: string) => {
    let real: string
    let entries: Dirent[]
    try {
      real = realpathSync(dir)
      // A symlink can point back to one of its own ancestors.
      if (ancestors.has(real))
        return
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
        found.push(path)
      walk(path, relPath)
    }
    ancestors.delete(real)
  }

  walk(resolve(root, base), '')
  return found
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
