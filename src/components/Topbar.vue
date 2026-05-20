<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()
const emit = defineEmits<{ 'open-sidebar': [] }>()

function handleLogout() {
  auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <header class="h-12 border-b border-crt-border bg-crt-raised flex items-center justify-between px-3 sm:px-6 shrink-0 gap-2 sticky top-0 z-30">
    <div class="flex items-center gap-2 min-w-0">
      <button
        type="button"
        class="lg:hidden border border-crt-border min-h-[36px] min-w-[36px] inline-flex items-center justify-center text-[14px] text-phosphor-dim hover:text-hazard hover:border-hazard transition-colors"
        aria-label="Open navigation"
        @click="emit('open-sidebar')"
      >
        [ ≡ ]
      </button>
      <div class="hidden sm:block text-[12px] text-phosphor-dim font-mono truncate">
        {{ new Date().toISOString().slice(0, 19) }}Z
      </div>
    </div>
    <button
      class="text-[12px] text-phosphor-dim hover:text-hazard border border-crt-border px-3 min-h-[36px] hover:border-hazard transition-colors uppercase"
      @click="handleLogout"
    >
      Logout
    </button>
  </header>
</template>
