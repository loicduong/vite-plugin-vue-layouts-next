/**
 * Plugin options.
 */
interface Options {
  /**
   * Relative path to the directory to search for layout components.
   * @default 'src/layouts'
   */
  layoutsDirs: string | string[]
  /**
   * Valid file extensions for layout components.
   * @default ['vue']
   */
  extensions: string[]
  /**
   * List of path globs to exclude when resolving layouts.
   */
  exclude: string[]
  /**
   * Normalized layout name/key to use as the default layout
   * (for example, myDefault.vue -> my-default)
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
   * normalized layout name/key to use as the default layout
   * (for example, myDefault.vue -> my-default)
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
