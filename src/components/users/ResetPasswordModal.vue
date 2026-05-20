<script setup lang="ts">
import { ref } from 'vue'
import { useToast } from '@/composables/useToast'
import { usersApi } from '@/lib/api-users'
import Modal from '@/components/Modal.vue'
import type { ApiError } from '@/lib/api'

const props = defineProps<{
  open: boolean
  userId: string
}>()

const emit = defineEmits<{ close: [] }>()
const toast = useToast()

const password = ref('')
const loading = ref(false)
const error = ref('')
const result = ref<{ temporary_password: string } | null>(null)

async function handleSubmit() {
  error.value = ''
  loading.value = true
  result.value = null

  try {
    const res = await usersApi.resetPassword(props.userId, password.value || undefined)
    result.value = { temporary_password: res.temporary_password }
    toast.success('Password reset successful')
  } catch (e) {
    error.value = (e as ApiError).message || 'Failed to reset password'
  } finally {
    loading.value = false
  }
}

function copyPassword() {
  if (result.value) {
    navigator.clipboard.writeText(result.value.temporary_password)
    toast.success('Password copied to clipboard')
  }
}

function handleClose() {
  password.value = ''
  result.value = null
  error.value = ''
  emit('close')
}
</script>

<template>
  <Modal :open="open" title="RESET USER PASSWORD" @close="handleClose">
    <div v-if="!result">
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div class="text-xs text-phosphor-dim mb-2">
          Leave empty for auto-generated password. All sessions will be revoked.
        </div>

        <div>
          <label class="block text-[11px] text-phosphor-dim mb-1 uppercase">NEW PASSWORD (OPTIONAL)</label>
          <input
            v-model="password"
            type="text"
            autocomplete="off"
            class="w-full bg-crt-surface border border-crt-border px-2 py-2 text-base sm:text-xs text-phosphor focus:outline-none focus:border-hazard min-h-[44px] sm:min-h-0"
            placeholder="8-72 chars, upper+lower+digit+special"
          />
        </div>

        <div v-if="error" class="border border-hazard px-3 py-2 text-[11px] text-hazard">
          [ ERR ] {{ error }}
        </div>

        <div class="flex flex-col sm:flex-row gap-2">
          <button
            type="submit"
            :disabled="loading"
            class="border border-hazard px-3 text-[11px] text-hazard hover:bg-hazard hover:text-crt transition-colors disabled:opacity-50 min-h-[40px] w-full sm:w-auto"
          >
            {{ loading ? '>>> RESETTING...' : '[ RESET ]' }}
          </button>
          <button
            type="button"
            class="border border-crt-border px-3 text-[11px] text-phosphor-dim min-h-[40px] w-full sm:w-auto"
            @click="handleClose"
          >
            [ CANCEL ]
          </button>
        </div>
      </form>
    </div>

    <div v-else class="space-y-4">
      <div class="text-xs text-phosphor mb-2">Password has been reset. Copy it now — it won't be shown again.</div>

      <div class="border-2 border-hazard p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <code class="text-sm text-hazard break-all">{{ result.temporary_password }}</code>
        <button
          class="shrink-0 border border-crt-border px-3 text-[11px] text-phosphor-dim hover:text-phosphor min-h-[36px] w-full sm:w-auto"
          @click="copyPassword"
        >
          COPY
        </button>
      </div>

      <button
        class="border border-crt-border px-3 text-[11px] text-phosphor-dim hover:text-phosphor min-h-[40px] w-full sm:w-auto"
        @click="handleClose"
      >
        [ DONE ]
      </button>
    </div>
  </Modal>
</template>
