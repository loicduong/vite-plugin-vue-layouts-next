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
    Layouts(),
  ],
})

export default config
