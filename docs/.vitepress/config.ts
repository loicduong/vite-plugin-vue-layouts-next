import { defineConfig } from 'vitepress'

const repo = 'https://github.com/loicduong/vite-plugin-vue-layouts-next'

export default defineConfig({
  title: 'vite-plugin-vue-layouts-next',
  description: 'Router based layout plugin for Vite 8, Vue 3 and Vue Router 5.',
  base: '/vite-plugin-vue-layouts-next/',
  cleanUrls: true,
  lastUpdated: true,

  // `docs/superpowers` holds internal plans and specs, not user-facing docs.
  srcExclude: ['superpowers/**'],

  head: [
    ['meta', { name: 'theme-color', content: '#42b883' }],
  ],

  themeConfig: {
    search: {
      provider: 'local',
    },

    nav: [
      { text: 'Guide', link: '/guide/getting-started', activeMatch: '/guide/' },
      { text: 'Config', link: '/config/', activeMatch: '/config/' },
      { text: 'Examples', link: '/examples' },
      {
        text: 'Changelog',
        link: `${repo}/blob/main/CHANGELOG.md`,
      },
    ],

    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'How it works', link: '/guide/how-it-works' },
          { text: 'Migration', link: '/guide/migration' },
          { text: 'ClientSideLayout', link: '/guide/client-side-layout' },
        ],
      },
      {
        text: 'Common patterns',
        items: [
          { text: 'Transitions', link: '/guide/patterns/transitions' },
          { text: 'Layout to page', link: '/guide/patterns/layout-to-page' },
          { text: 'Page to layout', link: '/guide/patterns/page-to-layout' },
        ],
      },
      {
        text: 'Config',
        items: [
          { text: 'Overview', link: '/config/' },
          { text: 'layoutsDirs', link: '/config/layouts-dirs' },
          { text: 'extensions', link: '/config/extensions' },
          { text: 'exclude', link: '/config/exclude' },
          { text: 'defaultLayout', link: '/config/default-layout' },
          { text: 'Layout names', link: '/config/layout-names' },
          { text: 'importMode', link: '/config/import-mode' },
          { text: 'inheritDefaultLayout', link: '/config/inherit-default-layout' },
        ],
      },
      {
        text: 'Reference',
        items: [
          { text: 'Examples', link: '/examples' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: repo },
      { icon: 'npm', link: 'https://www.npmjs.com/package/vite-plugin-vue-layouts-next' },
    ],

    editLink: {
      pattern: `${repo}/edit/main/docs/:path`,
      text: 'Edit this page on GitHub',
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-present Loic Duong',
    },
  },
})
