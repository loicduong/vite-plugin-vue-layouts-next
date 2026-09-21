<!--
  Both this parent route and its child (news/index.vue) set layout "second",
  so /news renders two nested Second Layouts. Each level with its own
  `meta.layout` gets its own wrapper; nothing dedupes a repeated name.
  Compare with /nested, where only the child sets a layout.
-->
<template>
  <router-view />
</template>

<route>
{
  meta: {
    layout: "second"
  }
}
</route>
