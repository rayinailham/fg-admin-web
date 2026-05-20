<script setup lang="ts">
import { useToast } from '@/composables/useToast'

const { toasts, dismiss } = useToast()
</script>

<template>
  <div class="fixed top-4 right-4 z-[9998] flex flex-col gap-2 w-[380px]">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      class="border px-4 py-3 text-[13px] cursor-pointer shadow-sm bg-crt-raised"
      :class="[
        toast.type === 'error'
          ? 'border-hazard text-hazard'
          : 'border-crt-border text-phosphor',
      ]"
      @click="dismiss(toast.id)"
    >
      <div class="flex items-start justify-between gap-2">
        <span class="flex-1 leading-snug">
          <span class="font-semibold mr-1">{{ toast.type === 'error' ? 'Error:' : 'OK:' }}</span>
          {{ toast.message }}
        </span>
        <span v-if="toast.countdown" class="text-phosphor-dim shrink-0 font-mono text-[12px]">
          {{ toast.countdown }}s
        </span>
      </div>
    </div>
  </div>
</template>
