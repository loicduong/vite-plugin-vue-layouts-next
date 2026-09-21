<script setup lang="ts">
import { setPageLayout, useLayout } from 'virtual:generated-layouts'
import { role } from '../role'

const layout = useLayout()

function toggleRole() {
  role.value = role.value === 'admin' ? 'user' : 'admin'
}
</script>

<template>
  <main class="px-4 py-10 text-center text-gray-700 dark:text-gray-200">
    <div class="w-1/4 m-auto text-center text-gray-300 bg-teal-800">
      Default Layout (useLayout: {{ layout }})
    </div>
    <p>
      Role: {{ role }}
      <button @click="toggleRole">
        Toggle role
      </button>
      <router-link to="/admin">
        Go to admin
      </router-link>
    </p>
    <p>
      In place:
      <button @click="setPageLayout('admin')">
        Preview admin layout here
      </button>
      <button @click="setPageLayout(false)">
        Drop the layout
      </button>
    </p>
    <router-view />
  </main>
</template>
