# Common Patterns

Because layouts compile down to ordinary nested routes, these are all plain Vue patterns rather than plugin features.

## Transitions

Layouts and transitions work as explained in the
[vue-router docs](https://router.vuejs.org/guide/advanced/transitions.html) only as long as `Component` changes on each
route. So if you want a transition between pages with the same layout _and_ a different layout, you have to mutate
`:key` on `<component>` (for a detailed example, see the Vue docs about
[transitions between elements](https://vuejs.org/guide/built-ins/transition.html#transition-between-elements)).

```vue [src/App.vue]
<template>
  <router-view v-slot="{ Component, route }">
    <transition name="slide">
      <component :is="Component" :key="route" />
    </transition>
  </router-view>
</template>
```

Now Vue will always trigger a transition if you change the route.

Note that `setPageLayout` changes the layout without changing the route, so a key derived from the route will not
trigger a transition in that case.

## Data From Layout to Page

To send data _down_ from the layout to the page, use props on the `<router-view>`:

```vue [src/layouts/default.vue]
<template>
  <router-view foo="bar" />
</template>
```

## Static Data From Page to Layout

To set state in your page and read it in your layout, add properties to a route's `meta`. This only works if you know
the state at build time.

With Vue Router 5 file-based routing, use the `<route>` block:

```vue [src/pages/index.vue]
<template>
  <div>Content</div>
</template>

<route lang="yaml">
meta:
  layout: default
  bgColor: yellow
</route>
```

Now read `bgColor` in the layout:

```vue [src/layouts/default.vue]
<script setup lang="ts">
import { useRouter } from 'vue-router'
</script>

<template>
  <div :style="`background: ${useRouter().currentRoute.value.meta.bgColor};`">
    <router-view />
  </div>
</template>
```

## Dynamic Data From Page to Layout

If `bgColor` has to be set at run time instead, use [custom events](https://vuejs.org/guide/components/events.html).

Emit the event in the page:

```vue [src/pages/index.vue]
<script setup lang="ts">
import { defineEmit } from 'vue'

const emit = defineEmit(['setColor'])

if (2 + 2 === 4)
  emit('setColor', 'green')
else
  emit('setColor', 'red')
</script>
```

Listen for it in the layout:

```vue [src/layouts/default.vue]
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
