<script setup lang="ts">
// Keyed on the path so a layout change between routes runs the transition.
// An in-place `setPageLayout` keeps the key, so it swaps without a transition.
</script>

<template>
  <router-view v-slot="{ Component, route }">
    <transition name="fade">
      <component :is="Component" :key="route.path" />
    </transition>
  </router-view>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
