<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue'
import { useCursorPagination } from '@/composables/useCursorPagination'
import { useLedgerRevenue } from '@/composables/useLedger'
import { formatIDR } from '@/lib/format-delta'
import type { RevenueBreakdownItem } from '@/lib/api-ledger'
import type { ApiError } from '@/lib/api'

interface Props {
  /** Empty string = current month. */
  month: string
  /** Aggregate breakdown from the summary endpoint — used to populate the package filter. */
  packages?: RevenueBreakdownItem[]
}

const props = withDefaults(defineProps<Props>(), {
  packages: () => [],
})

const expanded = ref(false)
const packageFilter = ref('')
const monthRef = toRef(props, 'month')
const packageRef = computed<string | undefined>(() =>
  packageFilter.value ? packageFilter.value : undefined,
)

const { currentCursor, hasNext, hasPrev, goNext, goPrev, reset, setNextCursor } =
  useCursorPagination()

// Reset cursor when month or package changes (drill-down filters don't persist
// across context changes — cleaner mental model for admins).
watch([monthRef, packageRef], () => reset())

const enabled = computed(() => expanded.value)
const cursorRef = computed(() => currentCursor.value ?? '')

const { data, isLoading, isError, error, isFetching } = useLedgerRevenue(
  monthRef,
  cursorRef,
  packageRef,
  enabled,
)

watch(data, (val) => {
  // `next_cursor` may be `""` or absent — treat both as "no more pages".
  setNextCursor(val?.next_cursor && val.next_cursor !== '' ? val.next_cursor : undefined)
})

const errorMessage = computed(() => {
  if (!isError.value) return null
  const e = error.value as ApiError | Error | null
  if (!e) return 'failed to load revenue detail'
  if ('message' in e && e.message) return e.message
  return 'failed to load revenue detail'
})

function formatTimestamp(iso: string): string {
  if (!iso) return '—'
  return iso.slice(0, 16).replace('T', ' ')
}

function toggleExpand() {
  expanded.value = !expanded.value
  if (!expanded.value) {
    reset()
    packageFilter.value = ''
  }
}

const rows = computed(() => data.value?.rows ?? [])
</script>

<template>
  <section
    class="border-2 border-crt-border p-4 mb-4"
    aria-labelledby="revenue-detail-heading"
    data-testid="revenue-detail-section"
  >
    <!-- HEADER + EXPAND TOGGLE -->
    <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
      <span id="revenue-detail-heading" class="text-[11px] text-phosphor-dim uppercase">
        [ REVENUE DETAIL ]
      </span>
      <button
        class="border border-crt-border px-3 py-1.5 text-[11px] text-phosphor-dim hover:text-phosphor hover:border-phosphor-dim transition-colors"
        :aria-expanded="expanded"
        aria-controls="revenue-detail-content"
        data-testid="revenue-detail-toggle"
        @click="toggleExpand"
      >
        [ {{ expanded ? '−' : '+' }} {{ expanded ? 'COLLAPSE' : 'EXPAND REVENUE DETAIL' }} ]
      </button>
    </div>

    <template v-if="expanded">
      <!-- FILTERS -->
      <div id="revenue-detail-content" class="flex flex-wrap items-end gap-3 mb-3">
        <div>
          <label for="revenue-package-filter" class="block text-[11px] text-phosphor-faint mb-1 uppercase">PACKAGE</label>
          <select
            id="revenue-package-filter"
            v-model="packageFilter"
            class="w-full sm:w-auto bg-crt-surface border border-crt-border px-2 py-1.5 text-[11px] text-phosphor focus:outline-none focus:border-hazard"
            data-testid="revenue-package-filter"
          >
            <option value="">ALL PACKAGES</option>
            <option v-for="p in packages" :key="p.package_id" :value="p.package_id">
              {{ p.label }}
            </option>
          </select>
        </div>
        <div v-if="isFetching && !isLoading" role="status" aria-live="polite" class="text-[11px] text-phosphor-faint uppercase">
          /// REFRESHING...
        </div>
      </div>

      <!-- ERROR / LOADING / EMPTY / TABLE -->
      <div
        v-if="errorMessage"
        role="alert"
        aria-live="assertive"
        class="border border-danger px-3 py-6 text-center text-xs text-danger"
        data-testid="revenue-detail-error"
      >
        [ ERROR: {{ errorMessage.toUpperCase() }} ]
      </div>

      <div
        v-else-if="isLoading"
        role="status"
        aria-live="polite"
        class="border border-crt-border px-3 py-6 text-center text-xs text-phosphor-faint"
        data-testid="revenue-detail-loading"
      >
        &gt;&gt;&gt; LOADING REVENUE DETAIL...
      </div>

      <div
        v-else-if="!rows.length"
        class="border border-crt-border px-3 py-6 text-center text-xs text-phosphor-faint"
        data-testid="revenue-detail-empty"
      >
        [ NO REVENUE DATA ]
      </div>

      <div v-else class="border border-crt-border overflow-x-auto" data-testid="revenue-detail-table">
        <div
          class="grid grid-cols-[140px_1fr_1fr_100px_140px] items-center gap-2 bg-crt-surface px-3 py-1.5 text-[11px] text-phosphor-faint uppercase border-b border-crt-border min-w-[760px]"
        >
          <span>WHEN</span>
          <span>USER</span>
          <span>PACKAGE</span>
          <span>METHOD</span>
          <span class="text-right">AMOUNT (IDR)</span>
        </div>
        <div
          v-for="row in rows"
          :key="row.id"
          class="grid grid-cols-[140px_1fr_1fr_100px_140px] items-center gap-2 px-3 py-1.5 text-xs border-b border-crt-border last:border-b-0 min-w-[760px]"
          :data-testid="`revenue-row-${row.id}`"
        >
          <span class="text-phosphor font-mono">{{ formatTimestamp(row.completed_at) }}</span>
          <span class="text-phosphor truncate" :title="row.user_email">{{ row.user_email }}</span>
          <span class="text-phosphor-dim truncate" :title="row.package_label">{{ row.package_label }}</span>
          <span class="text-phosphor-faint font-mono uppercase">{{ row.payment_method }}</span>
          <span class="text-phosphor font-mono text-right">{{ formatIDR(row.amount_idr) }}</span>
        </div>
      </div>

      <!-- PAGINATION -->
      <div class="flex items-center justify-between mt-3" v-if="!errorMessage && !isLoading">
        <button
          class="border border-crt-border px-3 py-1.5 text-[11px] text-phosphor-dim hover:text-phosphor hover:border-phosphor-dim transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          :disabled="!hasPrev"
          aria-label="Previous page"
          data-testid="revenue-prev"
          @click="goPrev"
        >
          [ ← PREV ]
        </button>
        <button
          class="border border-crt-border px-3 py-1.5 text-[11px] text-phosphor-dim hover:text-phosphor hover:border-phosphor-dim transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          :disabled="!hasNext"
          aria-label="Next page"
          data-testid="revenue-next"
          @click="goNext"
        >
          [ NEXT → ]
        </button>
      </div>
    </template>
  </section>
</template>
