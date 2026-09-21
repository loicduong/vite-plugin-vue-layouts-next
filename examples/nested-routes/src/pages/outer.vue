<template>
  <div>
    <p>/outer.vue - static layout "second", never touched by the child's setPageLayout</p>
    <router-view />
  </div>
</template>

<route>
{
  meta: {
    layout: "second"
  }
}
</route>
