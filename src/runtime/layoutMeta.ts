import type { RouteMeta } from 'vue-router'

export type LayoutName = string | false

export type LayoutProps = Record<string, unknown>

/** Object form of `meta.layout`: a layout name plus props for that layout component. */
export interface LayoutOptions {
  /** Layout name, `false` for no layout, or omitted for the default layout. */
  name?: LayoutName
  props?: LayoutProps
}

export type LayoutMeta = LayoutName | LayoutOptions

/** `meta.layout` normalized: `name` is `undefined` when the page falls back to the default layout. */
export interface ResolvedLayoutMeta {
  name: LayoutName | undefined
  props: LayoutProps | undefined
}

/**
 * Reads the layout of one meta object, accepting `'name'`, `false`, and `{ name, props }`.
 * Object props win over a flat `meta.layoutProps` next to it.
 */
export function readLayoutMeta(meta: Pick<RouteMeta, 'layout' | 'layoutProps'> | undefined): ResolvedLayoutMeta {
  const layout = meta?.layout
  if (layout !== null && typeof layout === 'object')
    return { name: layout.name, props: layout.props ?? meta?.layoutProps }
  return { name: layout, props: meta?.layoutProps }
}

/** Whether `meta` asks for its own layout: a name, or the object form without `name: false`. */
export function declaresLayout(meta: Pick<RouteMeta, 'layout' | 'layoutProps'> | undefined): boolean {
  const layout = meta?.layout
  if (layout !== null && typeof layout === 'object')
    return layout.name !== false
  return !!layout
}
