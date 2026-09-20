import { createGetRoutes, setupLayouts } from 'virtual:generated-layouts'
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { routes } from 'vue-router/auto-routes'
import App from './App.vue'
import { role } from './role'

const router = createRouter({
  history: createWebHistory(),
  routes: setupLayouts(routes),
})

// Role-based layout: admin pages use the admin layout only for admins.
router.beforeEach((to) => {
  if (to.path.startsWith('/admin'))
    to.meta.layout = role.value === 'admin' ? 'admin' : 'default'
})

const getRoutes = createGetRoutes(router)
// eslint-disable-next-line no-console
console.log(getRoutes())

const app = createApp(App)

app.use(router)

app.mount('#app')
