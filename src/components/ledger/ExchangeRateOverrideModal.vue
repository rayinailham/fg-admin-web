<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Modal from '@/components/Modal.vue'
import { useToast } from '@/composables/useToast'
import { useUpdateExchangeRate } from '@/composables/useLedger'
import type { ApiError } from '@/lib/api'

interface Props {
  open: boolean
  /** Current rate, used to prefill the input. */
  currentRate?: number | null
}

const props = withDefaults(defineProps<Props>(), {
  currentRate: null,
})

const emit = defineEmits<{ close: []; saved: [] }>()

const toast = useToast()
const updateMutation = useUpdateExchangeRate()

// Frontend uses a tighter range (10000–20000) than the API (>1000, <100000).
// IDR realistically sits in 13k–17k; 10k–20k catches typos before the request
// while still tolerating a major shock event.
const RATE_MIN = 10_000
const RATE_MAX = 20_000

const rate = ref<number>(props.currentRate ?? 16_500)
const reason = ref('')
const submitError = ref('')

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      rate.value = props.currentRate ?? 16_500
      reason.value = ''
      submitError.value = ''
    }
  },
  { immediate: true },
)

const rateError = computed(() => {
  const v = rate.value
  if (!Number.isFinite(v) || v <= 0) return 'rate is required'
  if (v < RATE_MIN) return `rate must be ≥ ${RATE_MIN.toLocaleString('id-ID')}`
  if (v > RATE_MAX) return `rate must be ≤ ${RATE_MAX.toLocaleString('id-ID')}`
  return ''
})

const reasonError = computed(() => {
  const v = reason.value.trim()
  if (!v) return 'reason is required'
  if (v.length > 500) return 'reason must be ≤ 500 chars'
  return ''
})

const formError = computed(() => rateError.value || reasonError.value || '')
const canSubmit = computed(() => !formError.value && !updateMutation.isPending.value)

async function handleSubmit() {
  submitError.value = ''
  if (formError.value) {
    submitError.value = formError.value
    return
  }

  try {
    await updateMutation.mutateAsync({
      usd_to_idr: rate.value,
      reason: reason.value.trim(),
    })
    toast.success('Exchange rate updated')
    emit('saved')
    emit('close')
  } catch (e) {
    const err = e as ApiError
    submitError.value = err.message || 'Failed to update exchange rate'
  }
}

function handleClose() {
  emit('close')
}
</script>

<template>
  <Modal :open="open" title="OVERRIDE EXCHANGE RATE" @close="handleClose">
    <form @submit.prevent="handleSubmit" class="space-y-4" data-testid="fx-override-form">
      <div class="text-[11px] text-phosphor-faint uppercase">
        /// MANUAL OVERRIDE — PAUSES AUTO-REFRESH UNTIL EXPLICITLY CLEARED
      </div>

      <!-- RATE -->
      <div>
        <label for="fx-rate" class="block text-[11px] text-phosphor-dim mb-1 uppercase">
          USD → IDR (RANGE: {{ RATE_MIN.toLocaleString('id-ID') }}–{{ RATE_MAX.toLocaleString('id-ID') }})
        </label>
        <input
          id="fx-rate"
          v-model.number="rate"
          type="number"
          :min="RATE_MIN"
          :max="RATE_MAX"
          step="1"
          required
          :aria-describedby="rateError ? 'fx-rate-error' : undefined"
          class="w-full bg-crt-surface border border-crt-border px-2 py-1.5 text-xs text-phosphor font-mono focus:outline-none focus:border-hazard"
          data-testid="rate"
        />
        <div v-if="rateError" id="fx-rate-error" role="alert" class="text-[11px] text-danger mt-1" data-testid="rate-error">
          [ ERR ] {{ rateError }}
        </div>
      </div>

      <!-- REASON -->
      <div>
        <label for="fx-reason" class="block text-[11px] text-phosphor-dim mb-1 uppercase">
          REASON (REQUIRED, MAX 500)
        </label>
        <textarea
          id="fx-reason"
          v-model="reason"
          rows="3"
          maxlength="500"
          required
          :aria-describedby="reasonError ? 'fx-reason-error' : undefined"
          class="w-full bg-crt-surface border border-crt-border px-2 py-1.5 text-xs text-phosphor focus:outline-none focus:border-hazard resize-none"
          placeholder="e.g. Locking rate for May reporting"
          data-testid="reason"
        />
        <div v-if="reasonError" id="fx-reason-error" role="alert" class="text-[11px] text-danger mt-1" data-testid="reason-error">
          [ ERR ] {{ reasonError }}
        </div>
      </div>

      <!-- SUBMIT-LEVEL ERROR -->
      <div
        v-if="submitError"
        role="alert"
        aria-live="assertive"
        class="border border-danger px-3 py-2 text-[11px] text-danger"
        data-testid="submit-error"
      >
        [ ERR ] {{ submitError }}
      </div>

      <div class="flex gap-2">
        <button
          type="submit"
          :disabled="!canSubmit"
          class="border border-hazard px-3 py-1.5 text-[11px] text-hazard hover:bg-hazard hover:text-crt transition-colors disabled:opacity-50"
          data-testid="submit"
        >
          {{ updateMutation.isPending.value ? '>>> SAVING...' : '[ OVERRIDE ]' }}
        </button>
        <button
          type="button"
          class="border border-crt-border px-3 py-1.5 text-[11px] text-phosphor-dim hover:text-phosphor hover:border-phosphor-dim"
          @click="handleClose"
        >
          [ CANCEL ]
        </button>
      </div>
    </form>
  </Modal>
</template>
