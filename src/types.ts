/**
 * Plugin options.
 */
interface Options {
  /**
   * Relative path to the directory to search for page components.
   * @default 'src/layouts'
   */
  layoutsDirs: string | string[]
  /**
   * Relative path to the pages directory.
   * @default 'src/pages'
   */
  pagesDirs: string | string[] | null
  /**
   * Valid file extensions for page components.
   * @default ['vue']
   */
  extensions: string[]
  /**
   * List of path globs to exclude when resolving pages.
   */
  exclude: string[]
  /**
   * Filename of default layout (".vue" is not needed)
   * @default 'default'
   */
  defaultLayout: string
  /**
   * Mode for importing layouts
   */
  importMode: (name: string) => 'sync' | 'async'
  /**
   * Whether nested routes should inherit the default layout from parent routes.
   * When false, if a child route has its own layout, the parent route won't use the default layout.
   * @default true
   */
  inheritDefaultLayout: boolean
}

export interface FileContainer {
  path: string
  files: string[]
}
export type UserOptions = Partial<Options>

export interface ResolvedOptions extends Options {}

export interface clientSideOptions {
  /**
   * layouts dir
   * @default "src/layouts"
   */
  layoutDir?: string
  /**
   * default layout
   * @default "default"
   */
  defaultLayout?: string
  /**
   * default auto resolve
   */
  importMode?: 'sync' | 'async'
  /**
   * Whether nested routes should inherit the default layout from parent routes.
   * When false, if a child route has its own layout, the parent route won't use the default layout.
   * @default true
   */
  inheritDefaultLayout?: boolean
}
