import Vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { ClientSideLayout } from 'vite-plugin-vue-layouts-next'
import VueRouter from 'vue-router/vite'

const config = defineConfig({
  plugins: [
    VueRouter(),
    Vue(),
    ClientSideLayout({
      layoutsDirs: 'src/layouts',
      // Pages without `meta.layout` use `main.vue` instead of `default.vue`.
      defaultLayout: 'main',
      // One mode for every layout; `sync` inlines them all in the main chunk.
      importMode: 'sync',
      // /nested has no layout of its own; its child sets one, so the parent is not wrapped in `main`.
      inheritDefaultLayout: false,
    }),
  ],
})

export default config
