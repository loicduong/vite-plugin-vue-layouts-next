# Data dynamically from page to layout

If you need to set `bgColor` dynamically at run-time, you can use
[custom events](https://vuejs.org/guide/components/events.html).

Emit the event in `page.vue`:

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

Listen for the `setColor` custom event in `layout.vue`:

```html
<script setup lang="ts">
import { ref } from 'vue'

const bgColor = ref('yellow')
function setBg(color) {
  bgColor.value = color
}
</script>

<template>
  <main :style="`background: ${bgColor};`">
    <router-view @set-color="setBg" />
  </main>
</template>
```

For build-time values, see [Data from layout to page](/guide/patterns/layout-to-page).
