<script setup lang="ts">
import { computed, defineAsyncComponent, ref, toRef } from 'vue'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import {
  useLedgerInfraCosts,
  useDeleteInfraCostPeriod,
} from '@/composables/useLedger'
import { formatIDR } from '@/lib/format-delta'
import Modal from '@/components/Modal.vue'
import type { InfraCostHistoryEntry } from '@/lib/api-ledger'
import type { ApiError } from '@/lib/api'

const InfraBreakdownChart = defineAsyncComponent(
  () => import('@/components/ledger/InfraBreakdownChart.vue'),
)
const InfraCostsEditModal = defineAsyncComponent(
  () => import('@/components/ledger/InfraCostsEditModal.vue'),
)

interface Props {
  /** Empty string = current month. */
  month: string
}

const props = defineProps<Props>()

const auth = useAuthStore()
const toast = useToast()

const monthRef = toRef(props, 'month')
const { data, isLoading, isError, error } = useLedgerInfraCosts(monthRef)
const deleteMutation = useDeleteInfraCostPeriod()

const editOpen = ref(false)
const auditExpanded = ref(false)
const deleteTarget = ref<InfraCostHistoryEntry | null>(null)

const errorMessage = computed(() => {
  if (!isError.value) return null
  const e = error.value as ApiError | Error | null
  if (!e) return 'failed to load infra costs'
  if ('message' in e && e.message) return e.message
  return 'failed to load infra costs'
})

const total = computed(() => data.value?.total_idr ?? 0)
const activeRows = computed(() => data.value?.active ?? [])
const history = computed(() => data.value?.history ?? [])
const recentHistory = computed(() => history.value.slice(0, 10))
const monthLabel = computed(() => data.value?.month ?? (props.month || '—'))

function formatDate(iso: string | undefined): string {
  if (!iso) return '—'
  // Render `YYYY-MM-DD HH:MM` from RFC3339, no tz conversion to keep it predictable.
  return iso.slice(0, 16).replace('T', ' ')
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  const target = deleteTarget.value
  try {
    await deleteMutation.mutateAsync(target.id)
    toast.success(`Deleted ${target.category} period from ${formatDate(target.effective_from).slice(0, 10)}`)
    deleteTarget.value = null
  } catch (e) {
    const err = e as ApiError
    if (err.status === 404) {
      toast.error('Period not found — it may have been deleted already')
    } else {
      toast.error(err.message || 'Failed to delete cost period')
    }
  }
}
</script>

<template>
  <section
    class="border-2 border-crt-border p-4 mb-4"
    aria-labelledby="infra-costs-heading"
    data-testid="infra-costs-section"
  >
    <!-- HEADER -->
    <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
      <div class="flex items-center gap-3 flex-wrap">
        <span id="infra-costs-heading" class="text-[11px] text-phosphor-dim uppercase">
          [ INFRA COSTS — {{ formatIDR(total) }} ]
        </span>
        <span class="text-[11px] text-phosphor-faint uppercase">/// BASIS: {{ monthLabel }}</span>
      </div>
      <div class="flex items-center gap-2">
        <button
          v-if="auth.isSuperadmin"
          class="border border-hazard px-3 py-1.5 text-[11px] text-hazard hover:bg-hazard hover:text-crt transition-colors"
          data-testid="open-edit"
          @click="editOpen = true"
        >
          [ EDIT COSTS ]
        </button>
      </div>
    </div>

    <!-- LOADING / ERROR -->
    <div v-if="errorMessage" role="alert" aria-live="assertive" class="text-xs text-danger" data-testid="infra-error">
      [ ERROR: {{ errorMessage.toUpperCase() }} ]
    </div>
    <div v-else-if="isLoading" role="status" aria-live="polite" class="text-xs text-phosphor-faint" data-testid="infra-loading">
      &gt;&gt;&gt; LOADING INFRA COSTS...
    </div>

    <!-- ACTIVE BASIS TABLE -->
    <template v-else>
      <Suspense>
        <InfraBreakdownChart :breakdown="activeRows" />
        <template #fallback>
          <div
            role="status"
            aria-live="polite"
            class="h-48 flex items-center justify-center text-xs text-phosphor-faint"
          >
            &gt;&gt;&gt; LOADING CHART...
          </div>
        </template>
      </Suspense>

      <div class="border border-crt-border mt-3 overflow-x-auto" data-testid="active-basis">
        <div
          class="grid grid-cols-[1fr_140px_140px] items-center gap-2 bg-crt-surface px-3 py-1.5 text-[11px] text-phosphor-faint uppercase border-b border-crt-border min-w-[420px]"
        >
          <span>CATEGORY</span>
          <span>SINCE</span>
          <span class="text-right">COST (IDR)</span>
        </div>
        <div
          v-for="row in activeRows"
          :key="row.category"
          class="grid grid-cols-[1fr_140px_140px] items-center gap-2 px-3 py-1.5 text-xs border-b border-crt-border last:border-b-0 min-w-[420px]"
          :data-testid="`active-${row.category}`"
        >
          <span class="text-phosphor font-mono">{{ row.category.toUpperCase() }}</span>
          <span class="text-phosphor-faint font-mono">
            {{ row.effective_from ? row.effective_from.slice(0, 10) : '—' }}
          </span>
          <span class="text-phosphor font-mono text-right">{{ formatIDR(row.cost_idr) }}</span>
        </div>
      </div>

      <!-- AUDIT EXPAND -->
      <div class="mt-3">
        <button
          class="border border-crt-border px-3 py-1.5 text-[11px] text-phosphor-dim hover:text-phosphor hover:border-phosphor-dim transition-colors"
          :aria-expanded="auditExpanded"
          aria-controls="infra-audit-table"
          data-testid="audit-toggle"
          @click="auditExpanded = !auditExpanded"
        >
          [ {{ auditExpanded ? '−' : '+' }} EXPAND HISTORY ({{ history.length }}) ]
        </button>
      </div>

      <div
        v-if="auditExpanded"
        id="infra-audit-table"
        class="mt-3 border border-crt-border overflow-x-auto"
        data-testid="audit-table"
      >
        <div
          class="grid grid-cols-[110px_100px_140px_1fr_140px_120px] items-center gap-2 bg-crt-surface px-3 py-1.5 text-[11px] text-phosphor-faint uppercase border-b border-crt-border min-w-[760px]"
        >
          <span>EFFECTIVE</span>
          <span>CATEGORY</span>
          <span class="text-right">COST (IDR)</span>
          <span>NOTE</span>
          <span>UPDATED BY</span>
          <span>ACTION</span>
        </div>
        <div v-if="!recentHistory.length" class="px-3 py-3 text-xs text-phosphor-faint">
          [ NO HISTORY ]
        </div>
        <div
          v-for="entry in recentHistory"
          :key="entry.id"
          class="grid grid-cols-[110px_100px_140px_1fr_140px_120px] items-center gap-2 px-3 py-1.5 text-xs border-b border-crt-border last:border-b-0 min-w-[760px]"
          :data-testid="`audit-row-${entry.id}`"
        >
          <span class="text-phosphor font-mono">{{ entry.effective_from.slice(0, 10) }}</span>
          <span class="text-phosphor font-mono">{{ entry.category.toUpperCase() }}</span>
          <span class="text-phosphor font-mono text-right">{{ formatIDR(entry.cost_idr) }}</span>
          <span class="text-phosphor-dim truncate" :title="entry.note">{{ entry.note || '—' }}</span>
          <span class="text-phosphor-faint font-mono truncate" :title="entry.created_by">
            {{ entry.created_by || '—' }}
          </span>
          <span>
            <button
              v-if="auth.isSuperadmin"
              class="border border-danger px-2 py-0.5 text-[11px] text-danger hover:bg-danger hover:text-crt transition-colors"
              :aria-label="`Delete ${entry.category} period effective ${entry.effective_from.slice(0, 10)}`"
              :data-testid="`audit-delete-${entry.id}`"
              @click="deleteTarget = entry"
            >
              [ DELETE ]
            </button>
          </span>
        </div>
      </div>
    </template>

    <!-- EDIT MODAL -->
    <InfraCostsEditModal
      :open="editOpen"
      @close="editOpen = false"
      @saved="editOpen = false"
    />

    <!-- DELETE CONFIRM -->
    <Modal :open="!!deleteTarget" title="DELETE COST PERIOD" @close="deleteTarget = null">
      <p class="text-xs text-hazard mb-4">
        Delete
        <span class="font-mono uppercase">{{ deleteTarget?.category }}</span>
        period effective from
        <span class="font-mono">{{ deleteTarget?.effective_from?.slice(0, 10) }}</span>
        ({{ formatIDR(deleteTarget?.cost_idr ?? 0) }})?
        <br />
        Historical months that referenced this period will fall back to the prior period.
      </p>
      <div class="flex gap-2">
        <button
          class="border border-danger px-3 py-1.5 text-[11px] text-danger hover:bg-danger hover:text-crt transition-colors disabled:opacity-50"
          :disabled="deleteMutation.isPending.value"
          data-testid="confirm-delete"
          @click="confirmDelete"
        >
          {{ deleteMutation.isPending.value ? '>>> DELETING...' : '[ DELETE ]' }}
        </button>
        <button
          class="border border-crt-border px-3 py-1.5 text-[11px] text-phosphor-dim hover:text-phosphor"
          @click="deleteTarget = null"
        >
          [ CANCEL ]
        </button>
      </div>
    </Modal>
  </section>
</template>
