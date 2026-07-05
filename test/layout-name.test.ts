import { describe, expect, it } from 'vitest'
import { kebabCaseSegment, normalizeLayoutName } from '../src/layoutName'

describe('layout name normalization', () => {
  it.each([
    ['default', 'default'],
    ['someLayout', 'some-layout'],
    ['DesktopDefault', 'desktop-default'],
    ['desktop-base', 'desktop-base'],
    ['layout_v2', 'layout-v2'],
  ])('normalizes segment %s to %s', (input, expected) => {
    expect(kebabCaseSegment(input)).toBe(expected)
  })

  it.each([
    ['default.vue', 'default'],
    ['someLayout.vue', 'some-layout'],
    ['desktop/default.vue', 'desktop-default'],
    ['desktop/index.vue', 'desktop'],
    ['desktop/Desktop.vue', 'desktop'],
    ['desktop/DesktopDefault.vue', 'desktop-default'],
    ['desktop-base/base.vue', 'desktop-base'],
    ['desktop-base/DesktopBase.vue', 'desktop-base'],
    ['sub/layoutsub.vue', 'sub-layoutsub'],
  ])('normalizes layout path %s to %s', (input, expected) => {
    expect(normalizeLayoutName(input)).toBe(expected)
  })
})
