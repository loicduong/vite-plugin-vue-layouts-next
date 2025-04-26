import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  'test/e2e/vitest.*.ts',
  'test/unit/vitest.config.mts',
])
