import type { ResolvedOptions } from './types'
import fg from 'fast-glob'
import { extensionsToGlob } from './utils'

/**
 * Resolves the files that are valid pages for the given context.
 */
export async function getFilesFromPath(path: string, options: ResolvedOptions): Promise<string[]> {
  const {
    exclude,
    extensions,
  } = options

  const ext = extensionsToGlob(extensions)
  if (!ext)
    return []

  const files = await fg(`**/*.${ext}`, {
    ignore: ['**/node_modules/**', '**/.git/**', '**/__*__/**', ...exclude],
    onlyFiles: true,
    cwd: path,
    dot: false,
    unique: true,
    followSymbolicLinks: false,
  })

  return files
}
