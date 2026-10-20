import { setupLayouts } from 'virtual:generated-layouts'
import { createApp } from 'vue'
import { createRouter, createWebHistory, RouterView } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: setupLayouts([{ path: '/', component: () => import('./pages/index.vue') }]),
})

createApp(RouterView).use(router).mount('#app')
