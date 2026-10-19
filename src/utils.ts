import { resolve } from 'node:path'
import Debug from 'debug'
import { globSync } from 'tinyglobby'

const REGEX_BACKSLASH = /\\/g
const REGEX_PATH_CHARS = /[_.\-\\/]/g
const REGEX_BRACKETS_PARENS = /[[:\]()]/g

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

export function resolveDirs(dirs: string | string[] | null, root: string) {
  if (dirs === null)
    return []
  const dirsArray = Array.isArray(dirs) ? dirs : [dirs]
  const dirsResolved: string[] = []

  for (const dir of dirsArray) {
    if (dir.includes('**')) {
      // tinyglobby would otherwise also match every subdirectory of each layouts dir.
      const matches = globSync(dir, { onlyDirectories: true, expandDirectories: false })
      for (const match of matches)
        dirsResolved.push(normalizePath(resolve(root, match)))
    }
    else {
      dirsResolved.push(normalizePath(resolve(root, dir)))
    }
  }

  return dirsResolved
}
