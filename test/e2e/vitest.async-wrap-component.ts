import { createConfig } from './vitest-shared-config.js'

// Base configuration that's common across all test runs
export default createConfig('async-wrap-component', {
  importMode: () => 'async',
  wrapComponent: true,
})
