# vite-plugin-vue-layouts-next

[![npm version][npm-badge]][npm]
[![monthly downloads][monthly-downloads-badge]][monthly-downloads]
[![Keep a Changelog v1.1.0 badge][changelog-badge]][changelog]
[![standard-readme compliant][standard-readme-badge]][standard-readme]

Vite 8、Vue 3 および Vue Router 5 用のルーターベースのレイアウトプラグインです。

[vite-plugin-vue-layouts][vite-plugin-vue-layouts] のフォークで、いくつかの改善と修正を加え、Vite 8、Vue 3 および Vue Router 5 をサポートしています。

レイアウトはデフォルトで `/src/layouts` フォルダに保存され、テンプレートに `<router-view></router-view>` を含む標準的な Vue コンポーネントとして定義されます。

レイアウトが指定されていないページは、デフォルトで `default.vue` をレイアウトとして使用します。

ルートブロックを使用することで、各ページがレイアウトを決定できます。以下のブロックをページに追加すると、レイアウトとして `/src/layouts/users.vue` を探します。

```html
<route lang="yaml">
meta:
  layout: users
</route>
```

## 目次

- [インストール](#インストール)
- [使用方法](#使用方法)
- [マイグレーション](#マイグレーション)
- [API](#api)
- [動作の仕組み](#動作の仕組み)
- [一般的なパターン](#一般的なパターン)
- [ClientSideLayout](#clientsidelayout)
- [メンテナー](#メンテナー)
- [謝辞](#謝辞)
- [貢献](#貢献)
- [ライセンス](#ライセンス)

## インストール

```bash
# npm
npm install -D vite-plugin-vue-layouts-next

# yarn
yarn add -D vite-plugin-vue-layouts-next

# pnpm
pnpm add -D vite-plugin-vue-layouts-next
```

## 使用方法

`vite.config.ts` に追加してください：

```js
import Vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import Layouts from 'vite-plugin-vue-layouts-next'
import VueRouter from 'vue-router/vite'

export default defineConfig({
  plugins: [VueRouter(), Vue(), Layouts()],
})
```

`main.ts` では、Vue Router 5 が生成するファイルベースルートをインポートしてレイアウトを設定してください。

```js
import { setupLayouts } from 'virtual:generated-layouts'
import { createRouter } from 'vue-router'
import { routes } from 'vue-router/auto-routes'

const router = createRouter({
  // ...
  routes: setupLayouts(routes),
})
```

### クライアント型

`virtual:generated-layouts` の型定義が必要な場合は、`tsconfig` の `compilerOptions.types` に `vite-plugin-vue-layouts-next/client` を追加してください：

```json
{
  "compilerOptions": {
    "types": ["vite-plugin-vue-layouts-next/client"]
  }
}
```

## マイグレーション

古い設定から移行する場合は、Vue Router 5 のファイルベースルーティングをルートの生成元として使用し、このプラグインはレイアウトのみを扱うようにしてください。

1. 古いページルート用プラグインの依存関係と型参照を削除します：

```diff
- import Pages from 'vite-plugin-pages'
- /// <reference types="vite-plugin-pages/client" />
```

2. Vue Router 5 の Vite プラグインを Vue より前に追加します：

```diff
 import Vue from '@vitejs/plugin-vue'
+import VueRouter from 'vue-router/vite'
 import Layouts from 'vite-plugin-vue-layouts-next'

 export default defineConfig({
-  plugins: [Vue(), Pages(), Layouts()],
+  plugins: [VueRouter(), Vue(), Layouts()],
 })
```

3. 生成されたページルートの import を Vue Router 5 の auto routes に置き換えます：

```diff
 import { setupLayouts } from 'virtual:generated-layouts'
-import generatedRoutes from 'virtual:generated-pages'
-import generatedRoutes from '~pages'
+import { routes } from 'vue-router/auto-routes'

-const routes = setupLayouts(generatedRoutes)
+const layoutRoutes = setupLayouts(routes)
```

4. `Layouts()` オプションから `pagesDirs` を削除します。ページ検出とルート HMR は Vue Router 5 が担当し、このプラグインはレイアウトの監視と解決のみを担当します。

## API

```ts
interface UserOptions {
  layoutsDirs?: string | string[]
  extensions?: string[]
  exclude?: string[]
  defaultLayout?: string
  importMode?: (name: string) => 'sync' | 'async'
  inheritDefaultLayout?: boolean
}
```

### 設定の使用

カスタム設定を使用するには、プラグインを初期化する際にオプションを Layouts に渡してください：

```js
// vite.config.ts
import { defineConfig } from 'vite'
import Layouts from 'vite-plugin-vue-layouts-next'

export default defineConfig({
  plugins: [
    Layouts({
      layoutsDirs: 'src/mylayouts',
      defaultLayout: 'myDefault'
    }),
  ],
})
```

### layoutsDirs

レイアウトディレクトリへの相対パスです。グロブパターンをサポートしています。
このフォルダ内のすべての .vue ファイルは、生成されたコードに非同期でインポートされます。

レイアウトディレクトリの配列にすることもできます。

`src/**/layouts` のような設定で、`module1/layouts` や `modules2/layouts` のようなシナリオをサポートするために `**` を使用できます。

`__*__.vue` という名前のファイルは除外され、`exclude` オプションで追加の除外を指定できます。

**デフォルト:** `'src/layouts'`

### extensions

レイアウトコンポーネントの有効なファイル拡張子です。

**デフォルト:** `['vue']`

### exclude

レイアウトを解決する際に除外するパスグロブのリストです。

### defaultLayout

デフォルトレイアウトのファイル名（".vue" は不要）。

**デフォルト:** `'default'`

### importMode

レイアウトをインポートするモードです。

**デフォルト:** ssg は `'sync'`、その他は `'async'`

### inheritDefaultLayout

ネストされたルートが親ルートからデフォルトレイアウトを継承するかどうかを制御します。`false` に設定すると、子ルートに独自のレイアウトがある場合、親ルートはデフォルトレイアウトを使用しません。これにより、子ルートが独自のレイアウトを指定した場合のレイアウトの二重ラッピングを防ぎます。このオプションは、`children` 配列を持つネストされたルート構造を生成する Vue Router 5 のファイルベースルートに適用されます。このオプションは、プラグイン設定でグローバルにのみ設定できます。

**デフォルト:** `true`

## 動作の仕組み

`setupLayouts` は、元の `router` を次のように変換します：

1. すべてのページを指定されたレイアウトに置き換える
2. 元のページを `children` プロパティに追加する。

簡単に言うと、レイアウトは同じパスを持つ[ネストされたルート](https://next.router.vuejs.org/guide/essentials/nested-routes.html#nested-routes)です。

変換前：

```text
router: [ page1, page2, page3 ]
```

`setupLayouts()` 後：

```text
router: [
  layoutA: page1,
  layoutB: page2,
  layoutA: page3,
]
```

つまり、[vue-router API](https://next.router.vuejs.org/api/) の完全な柔軟性を利用できます。

## 一般的なパターン

### トランジション

レイアウトとトランジションは、各ルートで `Component` が変更される限り、[vue-router のドキュメント](https://next.router.vuejs.org/guide/advanced/transitions.html)で説明されているとおりに動作します。同じレイアウトと異なるレイアウトを持つページ間でトランジションを実現したい場合は、`<component>` の `:key` を変更する必要があります（詳細な例については、[要素間のトランジション](https://v3.vuejs.org/guide/transitions-enterleave.html#transitioning-between-elements)に関する Vue のドキュメントを参照してください）。

`App.vue`

```html
<template>
  <router-view v-slot="{ Component, route }">
    <transition name="slide">
      <component :is="Component" :key="route" />
    </transition>
  </router-view>
</template>
```

これで、ルートを変更すると常にトランジションがトリガーされます。

### レイアウトからページへのデータ送信

レイアウトからページにデータを*下に*送信したい場合は、props を使用します。

```html
<router-view foo="bar" />
```

### ページで静的データを設定

ページで状態を設定し、レイアウトでそれを使用したい場合は、ルートの `meta` プロパティに追加のプロパティを追加します。これは、ビルド時に状態がわかっている場合にのみ機能します。

Vue Router 5 のファイルベースルーティングでは、`<route>` ブロックを使用できます。

`page.vue` で：

```html
<template><div>Content</div></template>
<route lang="yaml">
meta:
  layout: default
  bgColor: yellow
</route>
```

これで、`layout.vue` で `bgColor` を読み取ることができます：

```html
<script setup lang="ts">
import { useRouter } from 'vue-router'
</script>
<template>
  <div :style="`background: ${useRouter().currentRoute.value.meta.bgColor};`">
    <router-view />
  </div>
</template>
```

### ページからレイアウトへの動的データ送信

実行時に `bgColor` を動的に設定する必要がある場合は、[カスタムイベント](https://v3.vuejs.org/guide/component-custom-events.html#custom-events)を使用します。

`page.vue` でイベントを発行：

```html
<script setup lang="ts">
import { defineEmit } from 'vue'
const emit = defineEmit(['setColor'])

if (2 + 2 === 4)
  emit('setColor', 'green')
else
  emit('setColor', 'red')
</script>
```

`layout.vue` で `setColor` カスタムイベントをリッスン：

```html
<script setup lang="ts">
import { ref } from 'vue'

const bgColor = ref('yellow')
const setBg = (color) => {
  bgColor.value = color
}
</script>

<template>
  <main :style="`background: ${bgColor};`">
    <router-view @set-color="setBg" />
  </main>
</template>
```

## ClientSideLayout

clientSideLayout は、よりシンプルな[仮想ファイル](https://vitejs.dev/guide/api-plugin.html#importing-a-virtual-file) + [グロブインポート](https://vitejs.dev/guide/features.html#glob-import)スキームを使用します。これにより、HMR がより高速で正確になりますが、機能に制限もあります。

### 使用方法

```js
// vite.config.ts
import { defineConfig } from 'vite'
import { ClientSideLayout } from 'vite-plugin-vue-layouts-next'

export default defineConfig({
  plugins: [
    ClientSideLayout({
      layoutsDir: 'src/mylayouts', // デフォルトは 'src/layouts'
      defaultLayout: 'myDefault', // デフォルトは 'default'、'.vue' は不要
      importMode: 'sync' // デフォルトは自動検出 -> ssg は sync、その他は async
    }),
  ],
})
```

## メンテナー

[Loic Duong](https://github.com/loicduong)

## 謝辞

[vite-plugin-vue-layouts][vite-plugin-vue-layouts]

## 貢献

PR を歓迎します。[issue を開く][open-an-issue]か、改善のための PR を提出してください。

## ライセンス

MIT © loicduong

[npm]: https://www.npmjs.com/package/vite-plugin-vue-layouts-next
[npm-badge]: https://img.shields.io/npm/v/vite-plugin-vue-layouts-next
[monthly-downloads]: https://npmjs.com/package/vite-plugin-vue-layouts-next?activeTab=versions
[monthly-downloads-badge]: https://img.shields.io/npm/dm/vite-plugin-vue-layouts-next
[changelog]: ./CHANGELOG.ja.md
[changelog-badge]: https://img.shields.io/badge/changelog-Keep%20a%20Changelog%20v1.1.0-%23E05735
[standard-readme]: https://github.com/RichardLitt/standard-readme
[standard-readme-badge]: https://img.shields.io/badge/readme%20style-standard-brightgreen.svg?style=flat-square
[open-an-issue]: https://github.com/loicduong/vite-plugin-vue-layouts-next/issues/new
[vite-plugin-vue-layouts]: https://github.com/JohnCampionJr/vite-plugin-vue-layouts
