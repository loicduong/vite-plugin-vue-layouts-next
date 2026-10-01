import type { RouteRecordRaw } from 'vue-router'
import { describe, expect, it } from 'vitest'
import { createGetRoutes, createSetupLayouts } from '../src/runtime/setupLayouts'

const Wrapper = { name: 'Wrapper', render: () => null }
const Page = { name: 'Page', render: () => null }

describe('createSetupLayouts', () => {
  it('wraps a top-level route with the wrapper and marks it isLayout', () => {
    const setupLayouts = createSetupLayouts(Wrapper, { inheritDefaultLayout: true })
    const [route] = setupLayouts([{ path: '/about', component: Page, meta: { layout: 'admin' } }])
    expect(route).toMatchObject({
      path: '/about',
      component: Wrapper,
      meta: { isLayout: true },
      children: [{ path: '', component: Page, meta: { layout: 'admin' } }],
    })
  })

  it('keeps the root path on the child for "/"', () => {
    const setupLayouts = createSetupLayouts(Wrapper, { inheritDefaultLayout: true })
    const [route] = setupLayouts([{ path: '/', component: Page }])
    expect(route.children![0]!.path).toBe('/')
  })

  it('does not wrap layout: false routes', () => {
    const setupLayouts = createSetupLayouts(Wrapper, { inheritDefaultLayout: true })
    const [route] = setupLayouts([{ path: '/raw', component: Page, meta: { layout: false } }])
    expect(route.component).toBe(Page)
    expect(route.meta).toEqual({ layout: false })
  })

  it('does not wrap { name: false } routes', () => {
    const setupLayouts = createSetupLayouts(Wrapper, { inheritDefaultLayout: true })
    const [route] = setupLayouts([{ path: '/raw', component: Page, meta: { layout: { name: false } } }])
    expect(route.component).toBe(Page)
  })

  it('wraps nested children that declare an object layout', () => {
    const setupLayouts = createSetupLayouts(Wrapper, { inheritDefaultLayout: true })
    const [parent] = setupLayouts([{
      path: '/p',
      component: Page,
      children: [
        { path: 'c', component: Page, meta: { layout: { name: 'admin', props: { a: 1 } } } },
        { path: 'd', component: Page, meta: { layout: { props: { a: 1 } } } },
        { path: 'e', component: Page, meta: { layout: { name: false } } },
      ],
    }])
    const [c, d, e] = parent.children![0]!.children!
    expect(c).toMatchObject({ component: Wrapper, meta: { isLayout: true } })
    expect(d).toMatchObject({ component: Wrapper, meta: { isLayout: true } })
    expect(e!.component).toBe(Page)
  })

  it('does not count a { name: false } child as having its own layout', () => {
    const setupLayouts = createSetupLayouts(Wrapper, { inheritDefaultLayout: false })
    const [parent] = setupLayouts([{
      path: '/p',
      component: Page,
      children: [{ path: 'c', component: Page, meta: { layout: { name: false } } }],
    }])
    expect(parent.meta?.isLayout).toBe(true)
  })

  it('wraps nested children that declare a layout', () => {
    const setupLayouts = createSetupLayouts(Wrapper, { inheritDefaultLayout: true })
    const [parent] = setupLayouts([{
      path: '/p',
      component: Page,
      children: [{ path: 'c', component: Page, meta: { layout: 'admin' } }],
    }])
    const child = parent.children![0]!.children![0]!
    expect(child).toMatchObject({ path: 'c', component: Wrapper, meta: { isLayout: true } })
  })

  it('skips the default layout for a parent when inheritDefaultLayout is false and a child has a layout', () => {
    const setupLayouts = createSetupLayouts(Wrapper, { inheritDefaultLayout: false })
    const [parent] = setupLayouts([{
      path: '/p',
      component: Page,
      children: [{ path: 'c', component: Page, meta: { layout: 'admin' } }],
    }])
    expect(parent.component).toBe(Page)
    expect(parent.meta?.isLayout).toBeUndefined()
  })

  it('uses an empty path (not "/") for a nested own-layout child at the root path', () => {
    const setupLayouts = createSetupLayouts(Wrapper, { inheritDefaultLayout: true })
    const [parent] = setupLayouts([{
      path: '/p',
      component: Page,
      children: [{ path: '/', component: Page, meta: { layout: 'admin' } }],
    }])
    const child = parent.children![0]!.children![0]!
    expect(child).toMatchObject({ component: Wrapper, meta: { isLayout: true } })
    expect(child.children![0]!.path).toBe('')
  })

  it('skips auto-routes group routes whose "" child is already a layout', () => {
    const setupLayouts = createSetupLayouts(Wrapper, { inheritDefaultLayout: true })
    const group: RouteRecordRaw = {
      path: '/g',
      children: [{ path: '', component: Wrapper, meta: { isLayout: true }, children: [] }],
    }
    const [route] = setupLayouts([group])
    expect(route).toBe(group)
  })
})

describe('createGetRoutes', () => {
  const routes = [
    { path: '/a', meta: { isLayout: true } },
    { path: '/b', meta: {} },
  ]
  const router = { getRoutes: () => routes } as any

  it('returns a getter that filters layout routes by default', () => {
    expect(createGetRoutes(router)()).toEqual([{ path: '/b', meta: {} }])
  })

  it('returns all routes when withLayout is true', () => {
    expect(createGetRoutes(router, true)).toBe(routes)
  })
})
