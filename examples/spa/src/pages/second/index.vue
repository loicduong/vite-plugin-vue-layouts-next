<script setup lang="ts">
// `greeting` is passed down by src/layouts/second.vue through <router-view>.
defineProps<{ greeting?: string }>()

// Sent up to the layout; it listens with @set-color on <router-view>.
const emit = defineEmits<{ setColor: [color: string] }>()
</script>

<template>
  <div>
    <p>Second level layout.</p>
    <p>Prop from layout: {{ greeting }}</p>
    <p>
      <button @click="emit('setColor', 'lightgreen')">
        Tell the layout to go green
      </button>
      <button @click="emit('setColor', 'lightyellow')">
        Back to the meta color
      </button>
    </p>
    <router-view />
  </div>
</template>

<route>
{
  meta: {
    layout: "second",
    bgColor: "lightyellow"
  }
}
</route>
