import type { ResolvedOptions } from './types'
import { glob } from 'tinyglobby'
import { debug, extensionsToGlob } from './utils'

export async function getFilesFromPath(path: string, options: ResolvedOptions): Promise<string[]> {
  const {
    exclude,
    extensions,
  } = options

  const ext = extensionsToGlob(extensions)
  debug(extensions)

  const files = await glob(`**/*.${ext}`, {
    ignore: ['node_modules', '.git', '**/__*__/*', ...exclude],
    onlyFiles: true,
    // Otherwise a directory named like `group.vue/` matches and every file inside it is returned.
    expandDirectories: false,
    cwd: path,
  })

  return files
}
