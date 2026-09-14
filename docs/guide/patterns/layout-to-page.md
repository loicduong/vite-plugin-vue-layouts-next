# Data from layout to page

If you want to send data *down* from the layout to the page, use props:

```html
<router-view foo="bar" />
```

## Set static data at the page

If you want to set state in your page and do something with it in your layout, add additional properties to a route's
`meta` property. Doing so only works if you know the state at build-time.

With Vue Router 5 file-based routing, you can use the `<route>` block.

In `page.vue`:

```html
<template><div>Content</div></template>
<route lang="yaml">
meta:
  layout: default
  bgColor: yellow
</route>
```

Now you can read `bgColor` in `layout.vue`:

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

For run-time values, see [Data from page to layout](/guide/patterns/page-to-layout).
