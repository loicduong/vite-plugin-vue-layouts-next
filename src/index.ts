import type { ModuleNode, Plugin, ResolvedConfig } from 'vite'
import type { clientSideOptions, FileContainer, ResolvedOptions, UserOptions } from './types'
import { resolve } from 'node:path'
import process from 'node:process'
import fg from 'fast-glob'
import { createVirtualModuleCode } from './clientSide'
import { generateDts, resolveDtsPath } from './dts'
import { getFilesFromPath } from './files'
import { getImportCode } from './importCode'
import { normalizeLayoutName } from './layoutName'
import getClientCode, { RUNTIME_ID } from './RouteLayout'

import { debug, normalizePath, resolveDirs } from './utils'

const MODULE_ID = 'virtual:generated-layouts'
const MODULE_ID_VIRTUAL = '/@vite-plugin-vue-layouts-next/generated-layouts'
const REGEX_LEADING_SLASH = /^\/+/

export function defaultImportMode(name: string) {
  if (process.env.VITE_SSG)
    return 'sync'

  return name === 'default' ? 'sync' : 'async'
}

function resolveOptions(userOptions: UserOptions): ResolvedOptions {
  return {
    defaultLayout: 'default',
    layoutsDirs: 'src/layouts',
    extensions: ['vue'],
    exclude: [],
    importMode: defaultImportMode,
    inheritDefaultLayout: true,
    dts: false,
    ...userOptions,
  }
}

export default function Layout(userOptions: UserOptions = {}): Plugin {
  // The client-side variant performs better, so it is used whenever the options allow it.
  if (canEnableClientLayout(userOptions)) {
    return ClientSideLayout({
      defaultLayout: userOptions.defaultLayout,
      fallbackLayout: userOptions.fallbackLayout,
      layoutsDirs: userOptions.layoutsDirs as string,
      inheritDefaultLayout: userOptions.inheritDefaultLayout,
      dts: userOptions.dts,
    })
  }

  let config: ResolvedConfig

  const options: ResolvedOptions = resolveOptions(userOptions)

  let layoutsDirs: string[]
  let dtsPath: string | undefined

  const isLayoutFile = (path: string) => layoutsDirs.some(dir => normalizePath(path).startsWith(dir))

  const scanLayouts = async (): Promise<FileContainer[]> => {
    const container: FileContainer[] = []

    for (const dir of layoutsDirs) {
      const layoutsDirPath = dir.startsWith('/')
        ? normalizePath(dir)
        : normalizePath(resolve(config.root, dir))

      debug('Loading Layout Dir: %O', layoutsDirPath)

      const _f = await getFilesFromPath(layoutsDirPath, options)
      container.push({ path: layoutsDirPath, files: _f })
    }

    return container
  }

  const updateDts = async (container: FileContainer[]) => {
    if (dtsPath)
      await generateDts(dtsPath, container.flatMap(({ files }) => files.map(normalizeLayoutName)), config.logger)
  }

  return {
    name: 'vite-plugin-vue-layouts-next',
    enforce: 'pre',
    config() {
      return { optimizeDeps: { include: [RUNTIME_ID] } }
    },
    configResolved(_config) {
      config = _config
      layoutsDirs = resolveDirs(options.layoutsDirs, config.root)
      dtsPath = resolveDtsPath(options.dts, config.root)
    },
    async buildStart() {
      if (dtsPath)
        await updateDts(await scanLayouts())
    },
    configureServer({ moduleGraph, watcher, ws }) {
      watcher.add(options.layoutsDirs)

      const reloadModule = (module: ModuleNode | undefined, path = '*') => {
        if (module) {
          moduleGraph.invalidateModule(module)
          if (ws) {
            ws.send({
              path,
              type: 'full-reload',
            })
          }
        }
      }

      const updateVirtualModule = (path: string) => {
        if (isLayoutFile(path)) {
          debug('reload', path)
          const module = moduleGraph.getModuleById(MODULE_ID_VIRTUAL)
          reloadModule(module)
        }
      }

      // Only add/unlink can change the set of layout names.
      const regenerateDts = async (path: string) => {
        if (dtsPath && isLayoutFile(path))
          await updateDts(await scanLayouts())
      }

      watcher.on('add', async (path) => {
        updateVirtualModule(path)
        await regenerateDts(path)
      })

      watcher.on('unlink', async (path) => {
        updateVirtualModule(path)
        await regenerateDts(path)
      })

      watcher.on('change', async (path) => {
        updateVirtualModule(path)
      })
    },
    resolveId(id) {
      return id === MODULE_ID || id.startsWith(MODULE_ID)
        ? MODULE_ID_VIRTUAL
        : null
    },
    async load(id) {
      if (id === MODULE_ID_VIRTUAL) {
        const container = await scanLayouts()
        await updateDts(container)

        const importCode = getImportCode(container, options)

        const clientCode = getClientCode(importCode, options)

        debug('Client code: %O', clientCode)
        return { code: clientCode, moduleType: 'js' as const }
      }
    },
  }
}

export function ClientSideLayout(options?: clientSideOptions): Plugin {
  const {
    layoutsDirs,
    layoutDir: legacyLayoutDir,
    defaultLayout = 'default',
    fallbackLayout,
    importMode = process.env.VITE_SSG ? 'sync' : 'async',
    inheritDefaultLayout = true,
    dts,
  } = options || {}
  const layoutDir = layoutsDirs ?? legacyLayoutDir ?? 'src/layouts'

  let config: ResolvedConfig
  let layoutsRoot: string
  let dtsPath: string | undefined

  // The virtual module globs in the browser, so names for the .d.ts are scanned here with the same pattern.
  const regenerateDts = async () => {
    if (!dtsPath)
      return
    const files = await fg('**/*.vue', { cwd: layoutsRoot, onlyFiles: true })
    await generateDts(dtsPath, files.map(normalizeLayoutName), config.logger)
  }

  return {
    name: 'vite-plugin-vue-layouts-next',
    config() {
      return { optimizeDeps: { include: [RUNTIME_ID] } }
    },
    configResolved(_config) {
      config = _config
      // `layoutDir` is root-relative like the glob ('/src/layouts'), not absolute on disk.
      layoutsRoot = normalizePath(resolve(config.root, layoutDir.replace(REGEX_LEADING_SLASH, '')))
      dtsPath = resolveDtsPath(dts, config.root)
    },
    async buildStart() {
      await regenerateDts()
    },
    configureServer({ watcher }) {
      if (!dtsPath)
        return

      watcher.add(layoutsRoot)

      const onLayoutsChange = async (path: string) => {
        if (normalizePath(path).startsWith(layoutsRoot))
          await regenerateDts()
      }

      watcher.on('add', onLayoutsChange)
      watcher.on('unlink', onLayoutsChange)
    },
    resolveId(id) {
      if (id === MODULE_ID)
        return `\0${MODULE_ID}`
    },
    async load(id) {
      if (id === `\0${MODULE_ID}`) {
        const code = await createVirtualModuleCode({
          layoutDir,
          importMode,
          defaultLayout,
          fallbackLayout,
          inheritDefaultLayout,
        })
        return { code, moduleType: 'js' as const }
      }
    },
  }
}

const CLIENT_LAYOUT_KEYS = ['layoutsDirs', 'defaultLayout', 'fallbackLayout', 'inheritDefaultLayout', 'dts']

function canEnableClientLayout(options: UserOptions) {
  const keys = Object.keys(options)

  // Non isomorphic options
  if (keys.some(key => !CLIENT_LAYOUT_KEYS.includes(key)))
    return false

  // arrays and glob cannot be isomorphic either
  if (options.layoutsDirs && (Array.isArray(options.layoutsDirs) || options.layoutsDirs.includes('*')))
    return false

  return true
}

export * from './types'
