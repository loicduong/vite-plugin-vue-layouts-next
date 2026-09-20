// eslint.config.js
import antfu from '@antfu/eslint-config'

export default antfu({
  ignores: [
    'docs/.vitepress/cache',
    'docs/.vitepress/dist',
    // Internal plans and specs, not user-facing docs.
    'docs/superpowers',
    // Git-ignored scratch workspace for plan execution.
    '.superpowers',
  ],
})
