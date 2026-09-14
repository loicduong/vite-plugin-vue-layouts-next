import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitepress'

const packageJson = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../package.json', import.meta.url)), 'utf-8'),
) as { version: string }

const pkgVersion = packageJson.version

const ogTitle = 'vite-plugin-vue-layouts-next'
const ogDescription = 'Router based layout plugin for Vite 8, Vue 3 and Vue Router 5.'
const ogUrl = 'https://loicduong.github.io/vite-plugin-vue-layouts-next'

const repo = 'https://github.com/loicduong/vite-plugin-vue-layouts-next'

export default defineConfig({
  title: ogTitle,
  titleTemplate: ':title | vite-plugin-vue-layouts-next',
  description: ogDescription,
  base: '/vite-plugin-vue-layouts-next/',
  cleanUrls: true,
  lastUpdated: true,

  sitemap: {
    hostname: `${ogUrl}/`,
  },

  // `docs/superpowers` holds internal plans and specs, not user-facing docs.
  srcExclude: ['superpowers/**'],

  head: [
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: ogTitle }],
    ['meta', { property: 'og:url', content: ogUrl }],
    ['meta', { property: 'og:description', content: ogDescription }],
    ['meta', { name: 'twitter:card', content: 'summary' }],
    ['meta', { name: 'theme-color', content: '#42b883' }],
  ],

  themeConfig: {
    search: {
      provider: 'local',
    },

    outline: {
      level: [2, 3],
    },

    nav: [
      { text: 'Guide', link: '/guide/', activeMatch: '/guide/' },
      { text: 'Config', link: '/config/', activeMatch: '/config/' },
      {
        text: 'Resources',
        items: [
          { text: 'Examples', link: '/guide/examples' },
          { text: 'Releases', link: `${repo}/releases` },
          { text: 'Issues', link: `${repo}/issues` },
          {
            text: 'vite-plugin-vue-layouts',
            link: 'https://github.com/JohnCampionJr/vite-plugin-vue-layouts',
          },
        ],
      },
      {
        text: `v${pkgVersion}`,
        items: [
          { text: 'Changelog', link: `${repo}/blob/main/CHANGELOG.md` },
          { text: 'Migration from v2', link: '/guide/migration' },
          { text: 'Contributing', link: `${repo}/blob/main/README.md#contributing` },
        ],
      },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Getting Started', link: '/guide/' },
            { text: 'Why', link: '/guide/why' },
            { text: 'How it works', link: '/guide/how-it-works' },
          ],
        },
        {
          text: 'Guide',
          items: [
            { text: 'Common Patterns', link: '/guide/patterns' },
            { text: 'ClientSideLayout', link: '/guide/client-side-layout' },
            { text: 'Migration from v2', link: '/guide/migration' },
            { text: 'Examples', link: '/guide/examples' },
          ],
        },
        {
          text: 'Reference',
          items: [
            { text: 'Config Reference', link: '/config/' },
          ],
        },
      ],
      '/config/': [
        {
          text: 'Config',
          items: [
            { text: 'Configuring the Plugin', link: '/config/' },
            { text: 'Plugin Options', link: '/config/plugin-options' },
            { text: 'Layout Names', link: '/config/layout-names' },
            { text: 'ClientSideLayout Options', link: '/config/client-side-options' },
          ],
        },
        {
          text: 'Guide',
          items: [
            { text: 'Getting Started', link: '/guide/' },
            { text: 'How it works', link: '/guide/how-it-works' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: repo },
      { icon: 'npm', link: 'https://www.npmjs.com/package/vite-plugin-vue-layouts-next' },
    ],

    editLink: {
      pattern: `${repo}/edit/main/docs/:path`,
      text: 'Suggest changes to this page',
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-present Loic Duong',
    },
  },

  transformHead(ctx) {
    const path = ctx.page.replace(/(^|\/)index\.md$/, '$1').replace(/\.md$/, '')

    if (path !== '404') {
      const canonicalUrl = path ? `${ogUrl}/${path}` : ogUrl
      ctx.head.push(
        ['link', { rel: 'canonical', href: canonicalUrl }],
        ['meta', { property: 'og:title', content: ctx.pageData.title }],
      )
    }
  },
})
