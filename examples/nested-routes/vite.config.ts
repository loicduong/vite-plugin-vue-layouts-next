import Vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import Layouts from 'vite-plugin-vue-layouts-next'
import VueRouter from 'vue-router/vite'

const config = defineConfig({
  plugins: [
    VueRouter({
      /* options */
    }),
    Vue(),
    Layouts({
      defaultLayout: 'default',
      layoutsDirs: 'src/**/layouts',
      inheritDefaultLayout: false,
    }),
  ],
})

export default config
