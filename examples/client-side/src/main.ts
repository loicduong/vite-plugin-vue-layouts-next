import { createGetRoutes, setupLayouts } from 'virtual:generated-layouts'
import generatedRoutes from 'virtual:generated-pages'
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'

const routes = setupLayouts(generatedRoutes)

const router = createRouter({
  history: createWebHistory(),
  routes,
})

const getRoutes = createGetRoutes(router)
// eslint-disable-next-line no-console
console.log(getRoutes())
const app = createApp(App)

app.use(router)

app.mount('#app')
