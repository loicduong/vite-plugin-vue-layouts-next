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
   * Layout name/key to render when a page asks for a layout that does not exist.
   * Defaults to `defaultLayout`.
   */
  fallbackLayout?: string
  /**
   * `sync` bundles a layout into the main chunk, `async` lazy-loads it.
   * Defaults to `sync` for `default` (and for every layout under `VITE_SSG`), `async` otherwise.
   */
  importMode: (name: string) => 'sync' | 'async'
  /**
   * Whether nested routes should inherit the default layout from parent routes.
   * When false, if a child route has its own layout, the parent route won't use the default layout.
   * @default true
   */
  inheritDefaultLayout: boolean
  /**
   * Generate a `.d.ts` that types layout names.
   * `true` writes `layouts.d.ts` in the Vite root; a string is a path relative to the root.
   * @default false
   */
  dts: boolean | string
}

export interface FileContainer {
  path: string
  files: string[]
}
export type UserOptions = Partial<Options>

export interface ResolvedOptions extends Options {}

export interface clientSideOptions {
  /**
   * Relative path to the directory to search for layout components.
   * Same name as the default plugin's option, but a single directory: no array, no glob.
   * @default "src/layouts"
   */
  layoutsDirs?: string
  /**
   * @deprecated Use `layoutsDirs` instead. Ignored when `layoutsDirs` is set.
   */
  layoutDir?: string
  /**
   * normalized layout name/key to use as the default layout
   * (for example, myDefault.vue -> my-default)
   * @default "default"
   */
  defaultLayout?: string
  /**
   * Layout name/key to render when a page asks for a layout that does not exist.
   * Defaults to `defaultLayout`.
   */
  fallbackLayout?: string
  /**
   * `sync` bundles every layout into the main chunk, `async` lazy-loads them.
   * Defaults to `sync` under `VITE_SSG`, `async` otherwise.
   */
  importMode?: 'sync' | 'async'
  /**
   * Whether nested routes should inherit the default layout from parent routes.
   * When false, if a child route has its own layout, the parent route won't use the default layout.
   * @default true
   */
  inheritDefaultLayout?: boolean
  /**
   * Generate a `.d.ts` that types layout names.
   * `true` writes `layouts.d.ts` in the Vite root; a string is a path relative to the root.
   * @default false
   */
  dts?: boolean | string
}
