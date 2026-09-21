import Vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { ClientSideLayout } from 'vite-plugin-vue-layouts-next'
import VueRouter from 'vue-router/vite'

const config = defineConfig({
  plugins: [
    VueRouter({
      /* options */
    }),
    Vue(),
    ClientSideLayout({
      layoutsDirs: 'src/layouts',
      // `main.vue` is the fallback instead of `default.vue`.
      defaultLayout: 'main',
      // One mode for every layout; `sync` inlines them all in the main chunk.
      importMode: 'sync',
      // /nested has no layout of its own; its child sets one, so the parent is not wrapped in `main`.
      inheritDefaultLayout: false,
    }),
  ],
})

export default config
