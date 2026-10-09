import type { LayoutKey, LayoutName } from 'vite-plugin-vue-layouts-next/runtime'
import type { RouteMeta } from 'vue-router'
import { setPageLayout } from 'vite-plugin-vue-layouts-next/runtime'
import { expectTypeOf } from 'vitest'

expectTypeOf<LayoutName>().toEqualTypeOf<'admin' | 'default' | false>()
expectTypeOf<LayoutKey>().toEqualTypeOf<'admin' | 'default'>()

setPageLayout('admin')
setPageLayout(false)
// @ts-expect-error unknown layout name
setPageLayout('typo')

export const valid: RouteMeta[] = [
  { layout: 'admin' },
  { layout: false },
  { layout: { name: 'default', props: { title: 'x' } } },
]

// @ts-expect-error unknown layout name
export const invalidString: RouteMeta = { layout: 'typo' }

// @ts-expect-error unknown layout name
export const invalidObject: RouteMeta = { layout: { name: 'typo' } }
