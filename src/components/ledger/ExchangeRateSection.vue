<script setup lang="ts">
import { computed, defineAsyncComponent, ref } from 'vue'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import {
  useExchangeRate,
  useRefreshExchangeRate,
} from '@/composables/useLedger'
import { formatIDR } from '@/lib/format-delta'
import Modal from '@/components/Modal.vue'
import type { FxSource } from '@/lib/api-ledger'
import type { ApiError } from '@/lib/api'

const ExchangeRateOverrideModal = defineAsyncComponent(
  () => import('@/components/ledger/ExchangeRateOverrideModal.vue'),
)

const auth = useAuthStore()
const toast = useToast()

const { data, isLoading, isError, error } = useExchangeRate()
const refreshMutation = useRefreshExchangeRate()

const overrideOpen = ref(false)
const auditExpanded = ref(false)
const confirmRefreshOpen = ref(false)

const errorMessage = computed(() => {
  if (!isError.value) return null
  const e = error.value as ApiError | Error | null
  if (!e) return 'failed to load exchange rate'
  if ('message' in e && e.message) return e.message
  return 'failed to load exchange rate'
})

const rate = computed(() => data.value?.usd_to_idr ?? null)
const source = computed<FxSource | null>(() => data.value?.source ?? null)
const updatedAt = computed(() => data.value?.updated_at ?? '')
const audit = computed(() => data.value?.audit ?? [])
const recentAudit = computed(() => audit.value.slice(0, 10))

const badgeClass = computed(() => {
  switch (source.value) {
    case 'auto':
      return 'border-terminal-green text-terminal-green'
    case 'manual':
      return 'border-hazard text-hazard'
    case 'cached':
      return 'border-phosphor-dim text-phosphor-dim'
    case 'fallback':
      return 'border-danger text-danger'
    default:
      return 'border-crt-border text-phosphor-faint'
  }
})

const badgeIcon = computed(() => {
  switch (source.value) {
    case 'manual':
      return '🔒'
    case 'cached':
    case 'fallback':
      return '⚠'
    default:
      return ''
  }
})

const refreshLabel = computed(() => {
  switch (source.value) {
    case 'auto':
      return 'REFRESH FROM API'
    case 'manual':
      return 'UNLOCK & REFRESH'
    case 'cached':
      return 'RETRY UPSTREAM'
    case 'fallback':
      return 'FETCH RATE'
    default:
      return 'REFRESH'
  }
})

const warningText = computed(() => {
  if (source.value === 'cached') {
    return `Upstream API failed at last refresh. Using stored rate from ${formatTimestamp(updatedAt.value)}.`
  }
  if (source.value === 'fallback') {
    return 'No rate has ever been stored. Using built-in default 16,500. Refresh to fetch the live rate.'
  }
  return ''
})

function formatTimestamp(iso: string): string {
  if (!iso) return '—'
  return iso.slice(0, 16).replace('T', ' ') + ' UTC'
}

function handleRefreshClick() {
  // Only confirm when actively unlocking a manual override.
  // For auto / cached / fallback, refresh is non-destructive.
  if (source.value === 'manual') {
    confirmRefreshOpen.value = true
    return
  }
  triggerRefresh()
}

async function triggerRefresh() {
  confirmRefreshOpen.value = false
  try {
    await refreshMutation.mutateAsync()
    toast.success('Exchange rate refreshed')
  } catch (e) {
    const err = e as ApiError
    // 429 + 5xx already toast via the global handler in `api.ts` —
    // only surface non-handled cases here.
    if (err.status === 502) {
      // 502 surfaces via global toast already (>=500 path triggers a generic toast).
      // The API-specific message is more informative, so toast it explicitly.
      toast.error(err.message || 'exchange rate refresh failed')
    } else if (err.status !== 429 && err.status !== 503 && (err.status ?? 0) < 500) {
      toast.error(err.message || 'Failed to refresh exchange rate')
    }
  }
}
</script>

<template>
  <section
    class="border-2 border-crt-border p-4 mb-4"
    aria-labelledby="exchange-rate-heading"
    data-testid="exchange-rate-section"
  >
    <!-- HEADER -->
    <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
      <div class="flex items-center gap-3">
        <span id="exchange-rate-heading" class="text-[11px] text-phosphor-dim uppercase">
          [ EXCHANGE RATE ]
        </span>
        <span class="text-[11px] text-phosphor-faint uppercase">/// USD → IDR CONVERSION</span>
      </div>
      <div v-if="auth.isSuperadmin" class="flex items-center gap-2 flex-wrap">
        <button
          class="border border-hazard px-3 py-1.5 text-[11px] text-hazard hover:bg-hazard hover:text-crt transition-colors"
          data-testid="open-override"
          @click="overrideOpen = true"
        >
          [ OVERRIDE RATE ]
        </button>
        <button
          class="border border-crt-border px-3 py-1.5 text-[11px] text-phosphor-dim hover:text-phosphor hover:border-phosphor-dim transition-colors disabled:opacity-50"
          :disabled="refreshMutation.isPending.value"
          data-testid="refresh-button"
          @click="handleRefreshClick"
        >
          {{ refreshMutation.isPending.value ? '>>> REFRESHING...' : `[ ${refreshLabel} ]` }}
        </button>
      </div>
    </div>

    <!-- LOADING / ERROR -->
    <div v-if="errorMessage" role="alert" aria-live="assertive" class="text-xs text-danger" data-testid="fx-error">
      [ ERROR: {{ errorMessage.toUpperCase() }} ]
    </div>
    <div v-else-if="isLoading" role="status" aria-live="polite" class="text-xs text-phosphor-faint" data-testid="fx-loading">
      &gt;&gt;&gt; LOADING EXCHANGE RATE...
    </div>

    <!-- DATA -->
    <template v-else>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" data-testid="fx-data">
        <!-- RATE -->
        <div class="border border-crt-border p-3">
          <div class="text-[11px] text-phosphor-faint uppercase">RATE (USD → IDR)</div>
          <div class="text-lg text-phosphor font-mono">
            {{ rate !== null ? rate.toLocaleString('id-ID') : '—' }}
          </div>
          <div class="text-[11px] text-phosphor-faint mt-1">
            1 USD = {{ rate !== null ? formatIDR(rate) : '—' }}
          </div>
        </div>

        <!-- SOURCE -->
        <div class="border border-crt-border p-3" data-testid="fx-source-card">
          <div class="text-[11px] text-phosphor-faint uppercase">SOURCE</div>
          <div class="flex items-center gap-2 mt-1">
            <span
              class="border px-2 py-0.5 text-[11px] uppercase"
              :class="badgeClass"
              data-testid="fx-source-badge"
            >
              [ {{ source ? source.toUpperCase() : 'UNKNOWN' }} ]
            </span>
            <span v-if="badgeIcon" class="text-xs">{{ badgeIcon }}</span>
          </div>
          <div class="text-[11px] text-phosphor-faint mt-1 uppercase">
            <template v-if="source === 'auto'">FRESH · AUTO-REFRESHED</template>
            <template v-else-if="source === 'manual'">LOCKED · OVERRIDE ACTIVE</template>
            <template v-else-if="source === 'cached'">STALE · UPSTREAM FAILED</template>
            <template v-else-if="source === 'fallback'">DEFAULT · NEVER FETCHED</template>
            <template v-else>—</template>
          </div>
        </div>

        <!-- UPDATED -->
        <div class="border border-crt-border p-3">
          <div class="text-[11px] text-phosphor-faint uppercase">UPDATED</div>
          <div class="text-xs text-phosphor font-mono">{{ formatTimestamp(updatedAt) }}</div>
        </div>
      </div>

      <!-- WARNING (cached/fallback) -->
      <div
        v-if="warningText"
        class="mt-3 border border-danger px-3 py-2 text-[11px] text-danger"
        data-testid="fx-warning"
      >
        [ WARN ] {{ warningText }}
      </div>

      <!-- AUDIT EXPAND -->
      <div class="mt-3">
        <button
          class="border border-crt-border px-3 py-1.5 text-[11px] text-phosphor-dim hover:text-phosphor hover:border-phosphor-dim transition-colors"
          :aria-expanded="auditExpanded"
          aria-controls="fx-audit-table"
          data-testid="fx-audit-toggle"
          @click="auditExpanded = !auditExpanded"
        >
          [ {{ auditExpanded ? '−' : '+' }} EXPAND AUDIT ({{ audit.length }}) ]
        </button>
      </div>

      <div
        v-if="auditExpanded"
        id="fx-audit-table"
        class="mt-3 border border-crt-border overflow-x-auto"
        data-testid="fx-audit-table"
      >
        <div
          class="grid grid-cols-[140px_120px_120px_140px_1fr] items-center gap-2 bg-crt-surface px-3 py-1.5 text-[11px] text-phosphor-faint uppercase border-b border-crt-border min-w-[680px]"
        >
          <span>WHEN</span>
          <span class="text-right">FROM</span>
          <span class="text-right">TO</span>
          <span>BY</span>
          <span>REASON</span>
        </div>
        <div v-if="!recentAudit.length" class="px-3 py-3 text-xs text-phosphor-faint">
          [ NO AUDIT ENTRIES ]
        </div>
        <div
          v-for="entry in recentAudit"
          :key="entry.id"
          class="grid grid-cols-[140px_120px_120px_140px_1fr] items-center gap-2 px-3 py-1.5 text-xs border-b border-crt-border last:border-b-0 min-w-[680px]"
          :data-testid="`fx-audit-row-${entry.id}`"
        >
          <span class="text-phosphor font-mono">{{ formatTimestamp(entry.changed_at) }}</span>
          <span class="text-phosphor-faint font-mono text-right">{{ entry.old_value || '—' }}</span>
          <span class="text-phosphor font-mono text-right">{{ entry.new_value || '—' }}</span>
          <span class="text-phosphor-faint font-mono truncate" :title="entry.changed_by">
            {{ entry.changed_by || '—' }}
          </span>
          <span class="text-phosphor-dim truncate" :title="entry.reason">{{ entry.reason || '—' }}</span>
        </div>
      </div>
    </template>

    <!-- OVERRIDE MODAL -->
    <ExchangeRateOverrideModal
      :open="overrideOpen"
      :current-rate="rate"
      @close="overrideOpen = false"
      @saved="overrideOpen = false"
    />

    <!-- CONFIRM DIALOG (only when unlocking manual mode) -->
    <Modal
      :open="confirmRefreshOpen"
      title="UNLOCK & REFRESH"
      @close="confirmRefreshOpen = false"
    >
      <p class="text-xs text-hazard mb-4">
        Unlocking will fetch the latest rate from open.er-api.com and discard the manual override
        (current:
        <span class="font-mono">{{ rate !== null ? rate.toLocaleString('id-ID') : '—' }}</span>).
        Continue?
      </p>
      <div class="flex gap-2">
        <button
          class="border border-hazard px-3 py-1.5 text-[11px] text-hazard hover:bg-hazard hover:text-crt transition-colors disabled:opacity-50"
          :disabled="refreshMutation.isPending.value"
          data-testid="confirm-refresh"
          @click="triggerRefresh"
        >
          {{ refreshMutation.isPending.value ? '>>> REFRESHING...' : '[ UNLOCK & REFRESH ]' }}
        </button>
        <button
          class="border border-crt-border px-3 py-1.5 text-[11px] text-phosphor-dim hover:text-phosphor"
          @click="confirmRefreshOpen = false"
        >
          [ CANCEL ]
        </button>
      </div>
    </Modal>
  </section>
</template>
