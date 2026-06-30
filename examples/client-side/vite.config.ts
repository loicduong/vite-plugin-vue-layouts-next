import Vue from '@vitejs/plugin-vue'
import Markdown from 'unplugin-vue-markdown/vite'
import { defineConfig } from 'vite'
import { ClientSideLayout } from 'vite-plugin-vue-layouts-next'
import VueRouter from 'vue-router/vite'

const config = defineConfig({
  plugins: [
    VueRouter({
      /* options */
    }),
    Vue({
      include: [/\.vue$/, /\.md$/],
    }),
    ClientSideLayout(),
    Markdown({}),
  ],
})

export default config
