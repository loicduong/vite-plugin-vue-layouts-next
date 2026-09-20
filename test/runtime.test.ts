// @vitest-environment happy-dom
import type { Component } from 'vue'
import type { RouteRecordRaw } from 'vue-router'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import { createLayoutWrapper, createSetupLayouts, lazyLayout, setPageLayout, useLayout } from '../src/runtime'

function layout(name: string): Component {
  return defineComponent({
    name: `${name}-layout`,
    setup: () => () => h('div', { 'data-layout': name }, [h(RouterView)]),
  })
}

const Default = layout('default')
const Admin = layout('admin')
const Second = layout('second')
const A = layout('a')
const B = layout('b')
const Lazy = layout('lazy')
// A bare functional layout component: no `props`/`displayName`/`__vccOpts`. Lazy entries
// are now marked explicitly via `lazyLayout`, so a plain function like this must be
// treated as a component, not mistaken for a `() => import()` loader.
const Fn = (_props: unknown, { slots }: { slots: any }) => h('div', { 'data-layout': 'fn' }, slots.default?.())
// Resolves on a macrotask, like a real chunk: an unresolved async component renders empty until then.
const lazyFactory = vi.fn(() => new Promise<{ default: Component }>(resolve => setTimeout(resolve, 0, { default: Lazy })))

function page(text: string): Component {
  return defineComponent({
    setup() {
      const current = useLayout()
      return () => h('p', { 'data-page': text, 'data-use-layout': String(current.value) }, text)
    },
  })
}

/** A page that has children of its own and renders them through its own `RouterView`. */
function parentPage(text: string): Component {
  return defineComponent({
    setup() {
      const current = useLayout()
      return () => h('div', { 'data-page': text, 'data-use-layout': String(current.value) }, [h(RouterView)])
    },
  })
}

interface AppOptions {
  inheritDefaultLayout?: boolean
  initialPath?: string
  beforeEach?: Parameters<ReturnType<typeof createRouter>['beforeEach']>[0]
  routes?: RouteRecordRaw[]
}

function defaultRoutes(): RouteRecordRaw[] {
  return [
    { path: '/', component: page('home') },
    { path: '/admin', component: page('admin'), meta: { layout: 'admin' } },
    { path: '/lazy', component: page('lazy'), meta: { layout: 'lazy' } },
    { path: '/missing', component: page('missing'), meta: { layout: 'nope' } },
    { path: '/raw', component: page('raw'), meta: { layout: false } },
    { path: '/dyn', component: page('dyn') },
    { path: '/fn', component: page('fn'), meta: { layout: 'fn' } },
  ]
}

// Nested trees (spec case 11); `setupLayouts` mutates its input, so build fresh each time.
function nestedRoutes(): RouteRecordRaw[] {
  return [
    { path: '/', component: page('home') },
    { path: '/news', component: parentPage('news'), children: [{ path: '', component: page('news-index'), meta: { layout: 'second' } }] },
    { path: '/ab', component: parentPage('a-page'), meta: { layout: 'a' }, children: [{ path: 'b', component: page('b-page'), meta: { layout: 'b' } }] },
    { path: '/sec', component: parentPage('sec'), meta: { layout: 'second' }, children: [{ path: 'raw', component: page('raw'), meta: { layout: false } }] },
  ]
}

// Navigates to `initialPath` BEFORE mounting so the router plugin does not
// perform its own initial navigation to "/" on install.
async function createApp(opts: AppOptions = {}) {
  const layouts = { default: Default, admin: Admin, second: Second, a: A, b: B, lazy: lazyLayout(lazyFactory), fn: Fn as Component }
  const Wrapper = createLayoutWrapper(layouts, 'default')
  const setupLayouts = createSetupLayouts(Wrapper, { inheritDefaultLayout: opts.inheritDefaultLayout ?? true })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: setupLayouts(opts.routes ?? defaultRoutes()),
  })
  if (opts.beforeEach)
    router.beforeEach(opts.beforeEach)
  await router.push(opts.initialPath ?? '/')
  const wrapper = mount(defineComponent({ setup: () => () => h(RouterView) }), {
    global: { plugins: [router] },
  })
  return { router, wrapper, layouts }
}

function layoutOf(wrapper: ReturnType<typeof mount>) {
  return wrapper.find('[data-layout]').exists() ? wrapper.find('[data-layout]').attributes('data-layout') : null
}
function useLayoutOf(wrapper: ReturnType<typeof mount>) {
  return wrapper.find('[data-page]').attributes('data-use-layout')
}
/** Waits for a macrotask (the lazy factory) and then for Vue to re-render. */
async function flushTimers() {
  await new Promise(resolve => setTimeout(resolve, 0))
  await flushPromises()
}
/** All rendered layout names, outermost first. */
function layoutsOf(wrapper: ReturnType<typeof mount>) {
  return wrapper.findAll('[data-layout]').map(el => el.attributes('data-layout'))
}

afterEach(() => {
  setPageLayout(null as any) // reset module state between tests
  vi.restoreAllMocks()
})

describe('layoutWrapper', () => {
  it('renders meta.layout and falls back to default', async () => {
    const { router, wrapper } = await createApp()
    expect(layoutOf(wrapper)).toBe('default')
    expect(useLayoutOf(wrapper)).toBe('default')

    await router.push('/admin')
    expect(layoutOf(wrapper)).toBe('admin')
    expect(useLayoutOf(wrapper)).toBe('admin')
  })

  it('picks up meta.layout assigned in a beforeEach guard', async () => {
    const { wrapper } = await createApp({
      initialPath: '/dyn',
      beforeEach: (to) => {
        if (to.path === '/dyn')
          to.meta.layout = 'admin'
      },
    })
    expect(layoutOf(wrapper)).toBe('admin')
  })

  it('resolves async layouts once per name', async () => {
    // `/lazy` is pushed before mount, so no preload guard exists yet and the
    // wrapper falls back to `defineAsyncComponent` (same path as an in-place `setPageLayout`).
    const { router, wrapper } = await createApp({ initialPath: '/lazy' })
    await flushTimers()
    expect(layoutOf(wrapper)).toBe('lazy')
    await router.push('/')
    await router.push('/lazy')
    await flushPromises()
    expect(lazyFactory).toHaveBeenCalledTimes(1)
  })

  it('warns and falls back to default for an unknown layout', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { wrapper } = await createApp({ initialPath: '/missing' })
    expect(layoutOf(wrapper)).toBe('default')
    expect(warn).toHaveBeenCalledWith('[vite-plugin-vue-layouts-next] Layout "nope" not found, falling back to "default"')
  })

  it('leaves layout: false routes unwrapped', async () => {
    const { wrapper } = await createApp({ initialPath: '/raw' })
    expect(layoutOf(wrapper)).toBeNull()
    expect(wrapper.find('[data-page="raw"]').exists()).toBe(true)
  })

  it('preloads lazy layouts before the navigation is confirmed', async () => {
    const { router, wrapper } = await createApp()
    await router.push('/lazy')
    expect(layoutOf(wrapper)).toBe('lazy')
    expect(wrapper.find('[data-page="lazy"]').exists()).toBe(true)

    await router.push('/')
    await router.push('/lazy')
    expect(layoutOf(wrapper)).toBe('lazy')
    expect(lazyFactory).toHaveBeenCalledTimes(1)
  })

  it('renders a functional layout component synchronously, not as a lazy loader', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { router, wrapper } = await createApp()
    await router.push('/fn')
    // No flushPromises: if it were mistaken for a loader, defineAsyncComponent would
    // render nothing until the next microtask/macrotask.
    expect(layoutOf(wrapper)).toBe('fn')
    expect(wrapper.find('[data-page="fn"]').exists()).toBe(true)
    expect(warn).not.toHaveBeenCalled()
  })

  it('preloads the layout of the target route, not a stale in-place override', async () => {
    const { router, wrapper } = await createApp()
    setPageLayout('admin')
    await nextTick()
    expect(layoutOf(wrapper)).toBe('admin')
    await router.push('/lazy') // override resets on path change; the lazy layout must be ready
    expect(layoutOf(wrapper)).toBe('lazy')
  })
})

describe('nested routes', () => {
  it('parent without layout + child layout renders default > second > page', async () => {
    const { wrapper } = await createApp({ routes: nestedRoutes(), initialPath: '/news' })
    expect(layoutsOf(wrapper)).toEqual(['default', 'second'])
    expect(wrapper.find('[data-layout="default"] [data-page="news"] [data-layout="second"] [data-page="news-index"]').exists()).toBe(true)
    expect(useLayoutOf(wrapper)).toBe('second')
  })

  it('parent layout a + child layout b renders a > b > page', async () => {
    const { wrapper } = await createApp({ routes: nestedRoutes(), initialPath: '/ab/b' })
    expect(layoutsOf(wrapper)).toEqual(['a', 'b'])
    expect(wrapper.find('[data-layout="a"] [data-page="a-page"] [data-layout="b"] [data-page="b-page"]').exists()).toBe(true)
  })

  it('parent layout + nested child layout: false stays inside the parent layout', async () => {
    const { wrapper } = await createApp({ routes: nestedRoutes(), initialPath: '/sec/raw' })
    expect(layoutsOf(wrapper)).toEqual(['second'])
    expect(wrapper.find('[data-layout="second"] [data-page="sec"] [data-page="raw"]').exists()).toBe(true)
  })

  it('setPageLayout changes only the innermost layout', async () => {
    const { wrapper } = await createApp({ routes: nestedRoutes(), initialPath: '/news' })
    setPageLayout('admin')
    await nextTick()
    expect(layoutsOf(wrapper)).toEqual(['default', 'admin'])
    expect(useLayoutOf(wrapper)).toBe('admin')
  })

  it('a guard assignment changes only the innermost layout', async () => {
    const { wrapper } = await createApp({
      routes: nestedRoutes(),
      initialPath: '/ab/b',
      beforeEach: (to) => {
        if (to.path === '/ab/b')
          to.meta.layout = 'admin'
      },
    })
    expect(layoutsOf(wrapper)).toEqual(['a', 'admin'])
    expect(useLayoutOf(wrapper)).toBe('admin')
  })
})

describe('useLayout', () => {
  it('reports false when inheritDefaultLayout leaves the route unwrapped', async () => {
    const { router, wrapper } = await createApp({
      inheritDefaultLayout: false,
      routes: [
        {
          path: '/p',
          component: parentPage('p'),
          children: [{ path: 'c', component: page('c'), meta: { layout: 'admin' } }],
        },
      ],
      initialPath: '/p',
    })
    expect(layoutOf(wrapper)).toBeNull()
    expect(useLayoutOf(wrapper)).toBe('false')

    await router.push('/p/c')
    expect(layoutOf(wrapper)).toBe('admin')
    expect(useLayoutOf(wrapper)).toBe('admin')
  })
})

describe('setPageLayout', () => {
  it('switches the layout in place and resets on path change', async () => {
    const { router, wrapper } = await createApp()

    setPageLayout('admin')
    await nextTick()
    expect(layoutOf(wrapper)).toBe('admin')
    expect(useLayoutOf(wrapper)).toBe('admin')

    await router.push('/?tab=2')
    expect(layoutOf(wrapper)).toBe('admin')

    await router.push('/dyn')
    expect(layoutOf(wrapper)).toBe('default')
  })

  it('supports false (no layout)', async () => {
    const { wrapper } = await createApp({ initialPath: '/admin' })
    setPageLayout(false)
    await nextTick()
    expect(layoutOf(wrapper)).toBeNull()
    expect(wrapper.find('[data-page="admin"]').exists()).toBe(true)
    expect(useLayoutOf(wrapper)).toBe('false')
  })

  it('applies when called before the initial navigation', async () => {
    setPageLayout('admin')
    const { wrapper } = await createApp({ initialPath: '/dyn' })
    expect(layoutOf(wrapper)).toBe('admin')
  })

  it('registers the reset guard once per router across wrapper remounts', async () => {
    const { router, wrapper } = await createApp()
    const afterEach = vi.spyOn(router, 'afterEach')
    await router.push('/raw') // wrapper unmounts
    await router.push('/') // wrapper mounts again
    expect(afterEach).toHaveBeenCalledTimes(0) // guard was registered before the spy, on first setup

    // override set while on an unwrapped route must still reset on the next path change
    await router.push('/raw')
    setPageLayout('admin')
    await router.push('/dyn')
    expect(layoutOf(wrapper)).toBe('default')
  })

  it('keeps the override when a navigation is aborted by a guard', async () => {
    const { router, wrapper } = await createApp({
      beforeEach: (to) => {
        if (to.path === '/dyn')
          return false
      },
    })

    setPageLayout('admin')
    await nextTick()
    expect(layoutOf(wrapper)).toBe('admin')

    const result = await router.push('/dyn')
    expect(result).toBeInstanceOf(Error) // aborted navigation, not a throw
    expect(layoutOf(wrapper)).toBe('admin')
    expect(useLayoutOf(wrapper)).toBe('admin')

    await router.push('/admin') // succeeds: real path change
    expect(layoutOf(wrapper)).toBe('admin')
    await router.push('/') // override must be gone now; '/' has no meta.layout
    expect(layoutOf(wrapper)).toBe('default')
  })
})
