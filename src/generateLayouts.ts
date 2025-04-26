import type { ResolvedConfig } from 'vite'
import type { FileContainer, ResolvedOptions } from './types.js'
import { resolve } from 'node:path'
import { getFilesFromPath } from './files.js'
import { getImportCode } from './importCode.js'
import getClientCode from './RouteLayout.js'
import { debug, normalizePath } from './utils.js'

export async function generateLayouts(layoutDirs: string[], options: ResolvedOptions, config: ResolvedConfig) {
  const container: FileContainer[] = []

  for (const dir of layoutDirs) {
    const layoutsDirPath = dir.substr(0, 1) === '/'
      ? normalizePath(dir)
      : normalizePath(resolve(config.root, dir))

    const _f = await getFilesFromPath(layoutsDirPath, options)
    container.push({ path: layoutsDirPath, files: _f })
  }

  const importCode = getImportCode(container, options)

  const clientCode = getClientCode(importCode, options)

  debug('Client code: %O', clientCode)
  return clientCode
}
