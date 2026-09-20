// @vitest-environment happy-dom
import type { Component } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import { createLayoutWrapper, createSetupLayouts, setPageLayout, useLayout } from '../src/runtime'

function layout(name: string): Component {
  return defineComponent({
    name: `${name}-layout`,
    setup: () => () => h('div', { 'data-layout': name }, [h(RouterView)]),
  })
}

const Default = layout('default')
const Admin = layout('admin')
const Lazy = layout('lazy')
const lazyFactory = vi.fn(() => Promise.resolve({ default: Lazy }))

function page(text: string): Component {
  return defineComponent({
    setup() {
      const current = useLayout()
      return () => h('p', { 'data-page': text, 'data-use-layout': String(current.value) }, text)
    },
  })
}

interface AppOptions {
  inheritDefaultLayout?: boolean
  initialPath?: string
  beforeEach?: Parameters<ReturnType<typeof createRouter>['beforeEach']>[0]
}

// Navigates to `initialPath` BEFORE mounting so the router plugin does not
// perform its own initial navigation to "/" on install.
async function createApp(opts: AppOptions = {}) {
  const layouts = { default: Default, admin: Admin, lazy: lazyFactory }
  const Wrapper = createLayoutWrapper(layouts, 'default')
  const setupLayouts = createSetupLayouts(Wrapper, { inheritDefaultLayout: opts.inheritDefaultLayout ?? true })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: setupLayouts([
      { path: '/', component: page('home') },
      { path: '/admin', component: page('admin'), meta: { layout: 'admin' } },
      { path: '/lazy', component: page('lazy'), meta: { layout: 'lazy' } },
      { path: '/missing', component: page('missing'), meta: { layout: 'nope' } },
      { path: '/raw', component: page('raw'), meta: { layout: false } },
      { path: '/dyn', component: page('dyn') },
    ]),
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
    const { router, wrapper } = await createApp({ initialPath: '/lazy' })
    await flushPromises()
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
})
