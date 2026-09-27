<script setup lang="ts">
import { ref, watch } from 'vue'

// Static data from the page: layout props (set with `layout: { name, props }` in the page's <route> block).
const props = defineProps<{ bgColor?: string }>()

// Dynamic data from the page: listen for an event on <router-view>.
const bgColor = ref<string>(props.bgColor ?? 'transparent')
watch(() => props.bgColor, color => bgColor.value = color ?? 'transparent')
function setBg(color: string) {
  bgColor.value = color
}
</script>

<template>
  <main class="px-4 py-10 text-center text-gray-700 dark:text-gray-200" :style="{ background: bgColor }">
    <div class="w-1/4 m-auto text-center text-gray-300 bg-teal-800">
      Second Layout (background: {{ bgColor }})
    </div>
    <!-- Data from the layout to the page goes through props on <router-view>. -->
    <router-view greeting="hello from the second layout" @set-color="setBg" />
  </main>
</template>
