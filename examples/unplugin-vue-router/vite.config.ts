import Vue from '@vitejs/plugin-vue'
import Markdown from 'unplugin-vue-markdown/vite'
import VueRouter from 'unplugin-vue-router/vite'
import { defineConfig } from 'vite'
import Pages from 'vite-plugin-pages'
import Layouts from 'vite-plugin-vue-layouts-next'

const config = defineConfig({
  plugins: [
    VueRouter({
      /* options */
    }),
    Vue({
      include: [/\.vue$/, /\.md$/],
    }),
    Pages({
      extensions: ['vue', 'md'],
      syncIndex: false,
    }),
    Layouts({
      defaultLayout: 'default',
      layoutsDirs: 'src/**/layouts',
      pagesDirs: [],
    }),
    Markdown({}),
  ],
})

export default config
