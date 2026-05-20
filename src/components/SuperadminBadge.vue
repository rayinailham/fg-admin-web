<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'

withDefaults(defineProps<{
  variant?: 'inline' | 'block'
  label?: string
}>(), {
  variant: 'inline',
  label: 'SUPERADMIN',
})

const auth = useAuthStore()
</script>

<template>
  <span
    v-if="auth.isSuperadmin"
    class="superadmin-badge"
    :class="variant === 'block' ? 'superadmin-badge--block' : 'superadmin-badge--inline'"
    :title="`Action restricted to superadmin role`"
    aria-label="Superadmin-only action"
  >
    {{ label }}
  </span>
</template>

<style scoped>
.superadmin-badge {
  display: inline-flex;
  align-items: center;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-hazard);
  background-color: color-mix(in srgb, var(--color-hazard) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-hazard) 35%, transparent);
  padding: 0 4px;
  height: 14px;
  line-height: 12px;
}

.superadmin-badge--inline {
  margin-left: 6px;
  vertical-align: middle;
}

.superadmin-badge--block {
  margin-left: 0;
}
</style>
