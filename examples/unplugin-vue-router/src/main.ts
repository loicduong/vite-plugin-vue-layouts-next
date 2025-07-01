import { createGetRoutes, setupLayouts } from 'virtual:generated-layouts'
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { routes } from 'vue-router/auto-routes'
import App from './App.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: setupLayouts(routes),
})

const getRoutes = createGetRoutes(router)
// eslint-disable-next-line no-console
console.log(getRoutes())

const app = createApp(App)

app.use(router)

app.mount('#app')
