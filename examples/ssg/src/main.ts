import { setupLayouts } from 'virtual:generated-layouts'
import { ViteSSG } from 'vite-ssg'
import { routes } from 'vue-router/auto-routes'
import App from './App.vue'

export const createApp = ViteSSG(
  App,
  { routes: setupLayouts(routes) },
  ({ router }) => {
    // Per-navigation layout from a guard. Safe under SSG, unlike setPageLayout,
    // since it derives from the route rather than module-level state.
    router.beforeEach((to) => {
      if (to.path === '/guarded')
        to.meta.layout = 'second'
    })
  },
)
