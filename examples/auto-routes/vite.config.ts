import Vue from '@vitejs/plugin-vue'
import Markdown from 'unplugin-vue-markdown/vite'
import { defineConfig } from 'vite'
import Layouts from 'vite-plugin-vue-layouts-next'
import VueRouter from 'vue-router/vite'

const config = defineConfig({
  plugins: [
    VueRouter({
      /* options */
    }),
    Vue({
      include: [/\.vue$/, /\.md$/],
    }),
    Layouts({
      defaultLayout: 'default',
      layoutsDirs: 'src/**/layouts',
      pagesDirs: [],
      inheritDefaultLayout: false,
    }),
    Markdown({}),
  ],
})

export default config
