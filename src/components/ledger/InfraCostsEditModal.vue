<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Modal from '@/components/Modal.vue'
import { useToast } from '@/composables/useToast'
import { useUpdateInfraCosts } from '@/composables/useLedger'
import type { InfraCategory, InfraCostsUpdateRequest } from '@/lib/api-ledger'
import type { ApiError } from '@/lib/api'

interface Props {
  open: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{ close: []; saved: [] }>()

const toast = useToast()
const updateMutation = useUpdateInfraCosts()

const CATEGORIES: InfraCategory[] = ['database', 'redis', 'server', 'domain', 'other']

interface Row {
  category: InfraCategory
  included: boolean
  cost_idr: number
}

function defaultEffectiveFrom(): string {
  // Default: first of next month (matches the typical "schedule next period" use case).
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth() + 1 // 0-based → next month
  const year = m > 11 ? y + 1 : y
  const month = ((m % 12) + 1).toString().padStart(2, '0')
  return `${year}-${month}-01`
}

const maxEffectiveDateFrom = computed(() => {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth() + 1
  const year = m > 11 ? y + 1 : y
  const month = ((m % 12) + 1).toString().padStart(2, '0')
  return `${year}-${month}-01`
})

function makeRows(): Row[] {
  return CATEGORIES.map((c) => ({ category: c, included: false, cost_idr: 0 }))
}

const effectiveFrom = ref(defaultEffectiveFrom())
const note = ref('')
const rows = ref<Row[]>(makeRows())
const submitError = ref('')

// Reset state whenever the modal is reopened so partial entries don't linger.
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      effectiveFrom.value = defaultEffectiveFrom()
      note.value = ''
      rows.value = makeRows()
      submitError.value = ''
    }
  },
)

const includedCount = computed(() => rows.value.filter((r) => r.included).length)

const dateError = computed(() => {
  const v = effectiveFrom.value
  if (!v) return 'effective date is required'
  // Strict YYYY-MM-DD shape
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return 'invalid date format'
  const [y, m, d] = v.split('-').map(Number)
  if (!y || !m || !d) return 'invalid date format'
  if (d !== 1) return 'must be day 1 of a month'
  if (m < 1 || m > 12) return 'invalid month'
  // Compare against max allowed (first of next month)
  const max = maxEffectiveDateFrom.value
  if (v > max) return `max allowed is ${max}`
  return ''
})

const noteError = computed(() => (note.value.length > 500 ? 'note must be ≤ 500 chars' : ''))

const itemsError = computed(() => {
  if (includedCount.value === 0) return 'select at least one category'
  if (includedCount.value > 5) return 'max 5 items per batch'
  for (const row of rows.value) {
    if (!row.included) continue
    if (!Number.isFinite(row.cost_idr) || row.cost_idr < 0) {
      return `${row.category}: cost must be ≥ 0`
    }
    if (row.cost_idr > 1_000_000_000) {
      return `${row.category}: cost must be ≤ 1,000,000,000`
    }
  }
  return ''
})

const formError = computed(
  () => dateError.value || noteError.value || itemsError.value || '',
)

const canSubmit = computed(() => !formError.value && !updateMutation.isPending.value)

async function handleSubmit() {
  submitError.value = ''
  if (formError.value) {
    submitError.value = formError.value
    return
  }

  const payload: InfraCostsUpdateRequest = {
    effective_from: effectiveFrom.value,
    items: rows.value
      .filter((r) => r.included)
      .map((r) => ({ category: r.category, cost_idr: Math.trunc(r.cost_idr) })),
  }
  if (note.value.trim()) payload.note = note.value.trim()

  try {
    await updateMutation.mutateAsync(payload)
    toast.success('Infra costs updated')
    emit('saved')
    emit('close')
  } catch (e) {
    const err = e as ApiError
    if (err.status === 409) {
      const msg =
        err.message ||
        'cost period already exists for that category and effective date — delete it from history first'
      submitError.value = msg
      toast.error(msg)
      return
    }
    submitError.value = err.message || 'Failed to update infra costs'
  }
}

function handleClose() {
  emit('close')
}
</script>

<template>
  <Modal :open="open" title="EDIT INFRA COSTS" @close="handleClose">
    <form @submit.prevent="handleSubmit" class="space-y-4" data-testid="infra-edit-form">
      <div class="text-[11px] text-phosphor-faint uppercase">
        /// BATCH UPDATE — 1–5 ITEMS PER PERIOD
      </div>

      <!-- EFFECTIVE FROM -->
      <div>
        <label for="infra-effective-from" class="block text-[11px] text-phosphor-dim mb-1 uppercase">
          EFFECTIVE FROM (DAY 1)
        </label>
        <input
          id="infra-effective-from"
          v-model="effectiveFrom"
          type="date"
          required
          :max="maxEffectiveDateFrom"
          :aria-describedby="dateError ? 'infra-date-error' : undefined"
          class="w-full bg-crt-surface border border-crt-border px-2 py-1.5 text-xs text-phosphor font-mono focus:outline-none focus:border-hazard"
          data-testid="effective-from"
        />
        <div v-if="dateError" id="infra-date-error" role="alert" class="text-[11px] text-danger mt-1" data-testid="date-error">
          [ ERR ] {{ dateError }}
        </div>
      </div>

      <!-- NOTE -->
      <div>
        <label for="infra-note" class="block text-[11px] text-phosphor-dim mb-1 uppercase">
          NOTE (OPTIONAL, MAX 500)
        </label>
        <textarea
          id="infra-note"
          v-model="note"
          rows="2"
          maxlength="500"
          :aria-describedby="noteError ? 'infra-note-error' : undefined"
          class="w-full bg-crt-surface border border-crt-border px-2 py-1.5 text-xs text-phosphor focus:outline-none focus:border-hazard resize-none"
          placeholder="e.g. Q3 server upgrade"
          data-testid="note"
        />
        <div v-if="noteError" id="infra-note-error" role="alert" class="text-[11px] text-danger mt-1">[ ERR ] {{ noteError }}</div>
      </div>

      <!-- ITEMS GRID -->
      <div>
        <div class="text-[11px] text-phosphor-dim mb-2 uppercase">
          ITEMS — {{ includedCount }} / 5 SELECTED
        </div>
        <div class="border border-crt-border" data-testid="items-grid">
          <div
            class="grid grid-cols-[24px_1fr_140px] items-center gap-2 bg-crt-surface px-3 py-1.5 text-[11px] text-phosphor-faint uppercase border-b border-crt-border"
          >
            <span></span>
            <span>CATEGORY</span>
            <span class="text-right">COST (IDR)</span>
          </div>
          <div
            v-for="row in rows"
            :key="row.category"
            class="grid grid-cols-[24px_1fr_140px] items-center gap-2 px-3 py-1.5 text-xs border-b border-crt-border last:border-b-0"
          >
            <input
              v-model="row.included"
              type="checkbox"
              :id="`check-${row.category}`"
              :data-testid="`include-${row.category}`"
              class="accent-hazard"
            />
            <label
              :for="`check-${row.category}`"
              class="text-phosphor uppercase font-mono select-none cursor-pointer"
            >
              {{ row.category }}
            </label>
            <input
              v-model.number="row.cost_idr"
              type="number"
              min="0"
              max="1000000000"
              step="1000"
              :disabled="!row.included"
              :aria-label="`${row.category} cost in IDR`"
              :data-testid="`cost-${row.category}`"
              class="w-full bg-crt-surface border border-crt-border px-2 py-1 text-xs text-phosphor font-mono text-right focus:outline-none focus:border-hazard disabled:opacity-40"
            />
          </div>
        </div>
        <div v-if="itemsError" class="text-[11px] text-danger mt-1" data-testid="items-error">
          [ ERR ] {{ itemsError }}
        </div>
      </div>

      <!-- SUBMIT-LEVEL ERROR (e.g., 409 conflict) -->
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
          {{ updateMutation.isPending.value ? '>>> SAVING...' : '[ SAVE ]' }}
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
