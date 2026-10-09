import type { LayoutKey, LayoutName } from 'vite-plugin-vue-layouts-next/runtime'
import type { RouteMeta } from 'vue-router'
import { setPageLayout } from 'vite-plugin-vue-layouts-next/runtime'
import { expectTypeOf } from 'vitest'

expectTypeOf<LayoutName>().toEqualTypeOf<string | false>()
expectTypeOf<LayoutKey>().toEqualTypeOf<string>()

setPageLayout('anything')

export const meta: RouteMeta = { layout: 'anything' }
