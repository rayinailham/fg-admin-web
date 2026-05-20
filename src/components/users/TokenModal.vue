<script setup lang="ts">
import { ref } from 'vue'
import { useToast } from '@/composables/useToast'
import { usersApi } from '@/lib/api-users'
import Modal from '@/components/Modal.vue'
import type { ApiError } from '@/lib/api'

const props = defineProps<{
  open: boolean
  userId: string
  mode: 'grant' | 'deduct'
}>()

const emit = defineEmits<{ close: []; saved: [] }>()
const toast = useToast()

const amount = ref(1)
const reason = ref('')
const loading = ref(false)
const error = ref('')

async function handleSubmit() {
  error.value = ''
  loading.value = true

  try {
    if (props.mode === 'grant') {
      await usersApi.grantTokens(props.userId, amount.value, reason.value)
      toast.success(`${amount.value} tokens granted`)
    } else {
      await usersApi.deductTokens(props.userId, amount.value, reason.value)
      toast.success(`${amount.value} tokens deducted`)
    }
    amount.value = 1
    reason.value = ''
    emit('saved')
  } catch (e) {
    error.value = (e as ApiError).message || 'Operation failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Modal :open="open" :title="mode === 'grant' ? 'GRANT TOKENS' : 'DEDUCT TOKENS'" @close="emit('close')">
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div>
        <label class="block text-[11px] text-phosphor-dim mb-1 uppercase">AMOUNT</label>
        <input
          v-model.number="amount"
          type="number"
          min="1"
          max="10000"
          required
          class="w-full bg-crt-surface border border-crt-border px-2 py-2 text-base sm:text-xs text-phosphor focus:outline-none focus:border-hazard min-h-[44px] sm:min-h-0"
        />
      </div>

      <div>
        <label class="block text-[11px] text-phosphor-dim mb-1 uppercase">REASON (REQUIRED)</label>
        <textarea
          v-model="reason"
          required
          maxlength="500"
          rows="3"
          class="w-full bg-crt-surface border border-crt-border px-2 py-2 text-base sm:text-xs text-phosphor focus:outline-none focus:border-hazard resize-none"
          placeholder="Reason for token adjustment..."
        />
      </div>

      <div v-if="error" class="border border-hazard px-3 py-2 text-[11px] text-hazard">
        [ ERR ] {{ error }}
      </div>

      <div class="flex flex-col sm:flex-row gap-2">
        <button
          type="submit"
          :disabled="loading"
          class="border px-3 text-[11px] transition-colors disabled:opacity-50 min-h-[40px] w-full sm:w-auto"
          :class="[
            mode === 'deduct'
              ? 'border-hazard text-hazard hover:bg-hazard hover:text-crt'
              : 'border-phosphor-dim text-phosphor hover:bg-crt-surface'
          ]"
        >
          {{ loading ? '>>> PROCESSING...' : mode === 'grant' ? '[ GRANT ]' : '[ DEDUCT ]' }}
        </button>
        <button
          type="button"
          class="border border-crt-border px-3 text-[11px] text-phosphor-dim min-h-[40px] w-full sm:w-auto"
          @click="emit('close')"
        >
          [ CANCEL ]
        </button>
      </div>
    </form>
  </Modal>
</template>
