import type { UserOptions } from 'vite-plugin-vue-layouts-next'
import process from 'node:process'
import vue from '@vitejs/plugin-vue'
import VueRouter from 'unplugin-vue-router/vite'
import VueLayouts from 'vite-plugin-vue-layouts-next'
import { defineProject } from 'vitest/config'

export function getBasePlugins(opts: UserOptions = {}) {
  return [
    VueRouter({
      dts: false,
      /* importMode: 'sync',
    root: baseDir, */
      routesFolder: 'test/e2e/fixtures/pages',
    }),
    vue(),
    VueLayouts({
      layoutsDirs: 'test/e2e/fixtures/layouts',
      defaultLayout: 'default',
      importMode: () => 'sync',
      wrapComponent: false,
      // skipTopLevelRouteLayout: false,
      ...opts,
    }),
  ]
}

export function createConfig(name: string, opts: UserOptions = {}) {
  return defineProject({
    plugins: getBasePlugins(opts),
    root: process.cwd(),
    test: {
      name: `e2e:${name}`,
      provide: {
        runName: name,
      },
      environment: 'happy-dom',
      include: ['./**/*.test.ts'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/generated/**', '**/__snapshots__/**'],
      isolate: false,
    },
    publicDir: false,
  })
}
