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
      // Explicit list instead of a glob (see nested-routes for `src/**/layouts`).
      layoutsDirs: ['src/layouts', 'src/module1/layouts', 'src/module2/layouts'],
      // `src/layouts/drafts/*` is scanned but dropped, so pages asking for it fall back to `default`.
      exclude: ['**/drafts/**'],
      // Keep the default layout in the main chunk, lazy-load everything else.
      importMode: name => (name === 'default' ? 'sync' : 'async'),
    }),
  ],
})

export default config
