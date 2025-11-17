import Vue from '@vitejs/plugin-vue'
import Markdown from 'unplugin-vue-markdown/vite'
import { defineConfig } from 'vite'
import Pages from 'vite-plugin-pages'
import { ClientSideLayout } from 'vite-plugin-vue-layouts-next'

const config = defineConfig({
  plugins: [
    Vue({
      include: [/\.vue$/, /\.md$/],
    }),
    Pages({
      extensions: ['vue', 'md'],
    }),
    ClientSideLayout(),
    Markdown({}),
  ],
})

export default config
