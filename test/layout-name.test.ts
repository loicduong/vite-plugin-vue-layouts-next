import type { ResolvedOptions } from '../src/types'
import { describe, expect, it } from 'vitest'
import { getImportCode } from '../src/importCode'
import { kebabCaseSegment, normalizeLayoutName } from '../src/layoutName'

function createOptions(): ResolvedOptions {
  return {
    defaultLayout: 'default',
    layoutsDirs: 'src/layouts',
    extensions: ['vue'],
    exclude: [],
    importMode: () => 'async',
    inheritDefaultLayout: true,
  }
}

describe('layout name normalization', () => {
  it.each([
    ['default', 'default'],
    ['someLayout', 'some-layout'],
    ['APIClientLayout', 'api-client-layout'],
    ['ALink', 'a-link'],
    ['LMap', 'l-map'],
    ['URLParser', 'url-parser'],
    ['DesktopDefault', 'desktop-default'],
    ['desktop-base', 'desktop-base'],
    ['layout_v2', 'layout-v2'],
  ])('normalizes segment %s to %s', (input, expected) => {
    expect(kebabCaseSegment(input)).toBe(expected)
  })

  it.each([
    ['index.vue', 'index'],
    ['default.vue', 'default'],
    ['someLayout.vue', 'some-layout'],
    ['APIClientLayout.vue', 'api-client-layout'],
    ['ALink.vue', 'a-link'],
    ['LMap.vue', 'l-map'],
    ['URLParser.vue', 'url-parser'],
    ['desktop/default.vue', 'desktop-default'],
    ['desktop/index.vue', 'desktop'],
    ['desktop/Desktop.vue', 'desktop'],
    ['desktop/DesktopDefault.vue', 'desktop-default'],
    ['desktop-base/base.vue', 'desktop-base'],
    ['desktop-base/DesktopBase.vue', 'desktop-base'],
    ['SomeOther/Thing/Index.vue', 'some-other-thing'],
    ['thing/thing/thing.vue', 'thing'],
    ['foo/foo/foo.vue', 'foo'],
    ['sub/layoutsub.vue', 'sub-layoutsub'],
  ])('normalizes layout path %s to %s', (input, expected) => {
    expect(normalizeLayoutName(input)).toBe(expected)
  })
})

describe('layout import code', () => {
  it('uses Nuxt-compatible names as layout map keys', () => {
    const code = getImportCode(
      [{
        path: '/project/src/layouts',
        files: [
          'desktop/default.vue',
          'desktop/DesktopDefault.vue',
          'desktop-base/DesktopBase.vue',
          'sub/layoutsub.vue',
        ],
      }],
      createOptions(),
    )

    expect(code).toContain('\'desktop-default\': () => import(\'/project/src/layouts/desktop/default.vue\'),')
    expect(code).toContain('\'desktop-base\': () => import(\'/project/src/layouts/desktop-base/DesktopBase.vue\'),')
    expect(code).toContain('\'sub-layoutsub\': () => import(\'/project/src/layouts/sub/layoutsub.vue\'),')
    expect(code).not.toContain('\'desktop/default\'')
    expect(code).not.toContain('\'desktop/DesktopDefault\'')
    expect(code).not.toContain('\'sub/layoutsub\'')
  })

  it('passes normalized layout names to importMode', () => {
    const importModeNames: string[] = []
    const options: ResolvedOptions = {
      ...createOptions(),
      importMode: (name) => {
        importModeNames.push(name)
        return 'async'
      },
    }

    getImportCode(
      [{
        path: '/project/src/layouts',
        files: ['desktop/default.vue'],
      }],
      options,
    )

    expect(importModeNames).toContain('desktop-default')
    expect(importModeNames).not.toContain('desktop/default')
  })
})
