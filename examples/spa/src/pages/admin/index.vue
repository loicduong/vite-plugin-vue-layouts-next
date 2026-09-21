<script setup lang="ts">
import { useLayout } from 'virtual:generated-layouts'

const layout = useLayout()
</script>

<template>
  <div>
    <p>Admin page - current layout: {{ layout }}</p>
    <p>Switch the role on the home page to see this page rendered in the default layout instead.</p>
  </div>
</template>
