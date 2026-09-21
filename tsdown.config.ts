import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    runtime: 'src/runtime/index.ts',
  },
  format: 'esm',
  dts: true,
  clean: true,
  deps: {
    neverBundle: ['vue', 'vue-router'],
  },
})
