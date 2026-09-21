<script setup lang="ts">
import { setPageLayout, useLayout } from 'virtual:generated-layouts'

// In a nested route, guards and setPageLayout target the innermost layout only.
const layout = useLayout()
</script>

<template>
  <div>
    <p>/outer/index.vue - innermost layout: {{ layout }}</p>
    <p>
      <button @click="setPageLayout('module1layout')">
        Swap inner to module1layout
      </button>
      <button @click="setPageLayout(false)">
        Drop inner layout
      </button>
      <button @click="setPageLayout('sub-layoutsub')">
        Reset inner
      </button>
    </p>
  </div>
</template>

<route>
{
  meta: {
    layout: "sub-layoutsub"
  }
}
</route>
