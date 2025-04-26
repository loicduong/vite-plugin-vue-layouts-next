import type { ResolvedOptions, UserOptions } from './types.js'
import process from 'node:process'

export function defaultImportMode(name: string) {
  if (process.env.VITE_SSG)
    return 'sync'

  return name === 'default' ? 'sync' : 'async'
}

export function resolveOptions(userOptions: UserOptions): ResolvedOptions {
  return Object.assign(
    {
      defaultLayout: 'default',
      layoutsDirs: 'src/layouts',
      pagesDirs: 'src/pages',
      extensions: ['vue'],
      exclude: [],
      wrapComponent: false,
      importMode: defaultImportMode,
    },
    userOptions,
  )
}
