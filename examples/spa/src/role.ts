import { ref } from 'vue'

export type Role = 'user' | 'admin'
export const role = ref<Role>('user')
