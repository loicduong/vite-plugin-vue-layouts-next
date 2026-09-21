// eslint.config.js
import antfu from '@antfu/eslint-config'

export default antfu({
  antislop: true,
  formatters: true,
  ignores: [
    'docs/.vitepress/cache',
    'docs/.vitepress/dist',
    'docs/superpowers',
    '.superpowers',
  ],
})
