<script setup lang="ts">
import { ref, watch, useId } from 'vue'

interface Props {
  open: boolean
  title: string
}

const props = defineProps<Props>()
const emit = defineEmits<{ close: [] }>()

const dialogRef = ref<HTMLDialogElement | null>(null)
const titleId = useId()

watch(() => props.open, (val) => {
  if (val) {
    dialogRef.value?.showModal()
  } else {
    dialogRef.value?.close()
  }
})

function handleBackdropClick(e: MouseEvent) {
  if (e.target === dialogRef.value) {
    emit('close')
  }
}
</script>

<template>
  <dialog
    ref="dialogRef"
    :aria-labelledby="titleId"
    aria-modal="true"
    class="bg-crt border-2 border-crt-border p-0 backdrop:bg-black/70 max-w-[calc(100vw-1rem)] sm:max-w-lg w-full m-auto fixed inset-0"
    @click="handleBackdropClick"
    @close="emit('close')"
  >
    <div class="p-5">
      <div class="flex items-center justify-between mb-4">
        <div :id="titleId" class="heading-macro text-sm text-hazard">{{ title }}</div>
        <button
          class="text-[11px] text-phosphor-dim hover:text-hazard"
          aria-label="Close dialog"
          @click="emit('close')"
        >
          [ X ]
        </button>
      </div>
      <slot />
    </div>
  </dialog>
</template>
