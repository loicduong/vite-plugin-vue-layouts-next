# Transitions

Layouts and transitions work as expected and explained in the
[vue-router docs](https://next.router.vuejs.org/guide/advanced/transitions.html) only as long as `Component` changes on
each route. So if you want a transition between pages with the same layout *and* a different layout, you have to mutate
`:key` on `<component>` (for a detailed example, see the Vue docs about
[transitions between elements](https://vuejs.org/guide/built-ins/transition.html#transition-between-elements)).

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

Now Vue will always trigger a transition if you change the route.
