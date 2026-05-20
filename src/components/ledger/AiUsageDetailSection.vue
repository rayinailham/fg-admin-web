<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue'
import { useCursorPagination } from '@/composables/useCursorPagination'
import { useLedgerAiUsage, type AiUsageKeyFilters } from '@/composables/useLedger'
import { formatUSD } from '@/lib/format-delta'
import type { AiCategory, AiCostBreakdownItem, AiProvider } from '@/lib/api-ledger'
import type { ApiError } from '@/lib/api'

interface Props {
  /** Empty string = current month. */
  month: string
  /** Aggregate breakdown from the summary endpoint — used to populate model + category filters. */
  breakdown?: AiCostBreakdownItem[]
}

const props = withDefaults(defineProps<Props>(), {
  breakdown: () => [],
})

const expanded = ref(false)
const categoryFilter = ref<AiCategory | ''>('')
const modelFilter = ref('')
const providerFilter = ref<AiProvider | ''>('')

const monthRef = toRef(props, 'month')
const filtersRef = computed<AiUsageKeyFilters>(() => {
  const f: AiUsageKeyFilters = {}
  if (categoryFilter.value) f.category = categoryFilter.value
  if (modelFilter.value) f.model = modelFilter.value
  if (providerFilter.value) f.provider = providerFilter.value
  return f
})

const { currentCursor, hasNext, hasPrev, goNext, goPrev, reset, setNextCursor } =
  useCursorPagination()

watch([monthRef, filtersRef], () => reset())

const enabled = computed(() => expanded.value)
const cursorRef = computed(() => currentCursor.value ?? '')

const { data, isLoading, isError, error, isFetching } = useLedgerAiUsage(
  monthRef,
  cursorRef,
  filtersRef,
  enabled,
)

watch(data, (val) => {
  setNextCursor(val?.next_cursor && val.next_cursor !== '' ? val.next_cursor : undefined)
})

const errorMessage = computed(() => {
  if (!isError.value) return null
  const e = error.value as ApiError | Error | null
  if (!e) return 'failed to load ai usage detail'
  if ('message' in e && e.message) return e.message
  return 'failed to load ai usage detail'
})

// Derive unique categories + models from the aggregate breakdown so the filter
// dropdowns reflect what's actually present this month rather than every
// possible value across history.
const categoryOptions = computed<AiCategory[]>(() => {
  const set = new Set<AiCategory>()
  for (const item of props.breakdown) {
    set.add(item.category)
  }
  return Array.from(set)
})

const modelOptions = computed<string[]>(() => {
  const set = new Set<string>()
  for (const item of props.breakdown) {
    if (item.model) set.add(item.model)
  }
  return Array.from(set).sort()
})

function formatTimestamp(iso: string): string {
  if (!iso) return '—'
  return iso.slice(0, 16).replace('T', ' ')
}

function formatTokens(n: number): string {
  return n.toLocaleString('id-ID')
}

function toggleExpand() {
  expanded.value = !expanded.value
  if (!expanded.value) {
    reset()
    categoryFilter.value = ''
    modelFilter.value = ''
    providerFilter.value = ''
  }
}

const rows = computed(() => data.value?.rows ?? [])
</script>

<template>
  <section
    class="border-2 border-crt-border p-4 mb-4"
    aria-labelledby="ai-usage-detail-heading"
    data-testid="ai-usage-detail-section"
  >
    <!-- HEADER + EXPAND TOGGLE -->
    <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
      <span id="ai-usage-detail-heading" class="text-[11px] text-phosphor-dim uppercase">
        [ AI USAGE DETAIL ]
      </span>
      <button
        class="border border-crt-border px-3 py-1.5 text-[11px] text-phosphor-dim hover:text-phosphor hover:border-phosphor-dim transition-colors"
        :aria-expanded="expanded"
        aria-controls="ai-usage-detail-content"
        data-testid="ai-usage-detail-toggle"
        @click="toggleExpand"
      >
        [ {{ expanded ? '−' : '+' }} {{ expanded ? 'COLLAPSE' : 'EXPAND AI USAGE DETAIL' }} ]
      </button>
    </div>

    <template v-if="expanded">
      <!-- FILTERS -->
      <div id="ai-usage-detail-content" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
        <div>
          <label for="ai-category-filter" class="block text-[11px] text-phosphor-faint mb-1 uppercase">CATEGORY</label>
          <select
            id="ai-category-filter"
            v-model="categoryFilter"
            class="w-full bg-crt-surface border border-crt-border px-2 py-1.5 text-[11px] text-phosphor focus:outline-none focus:border-hazard"
            data-testid="ai-usage-category-filter"
          >
            <option value="">ALL</option>
            <option v-for="c in categoryOptions" :key="c" :value="c">{{ c.toUpperCase() }}</option>
            <option v-if="!categoryOptions.includes('analysis')" value="analysis">ANALYSIS</option>
            <option v-if="!categoryOptions.includes('chat')" value="chat">CHAT</option>
            <option v-if="!categoryOptions.includes('embedding')" value="embedding">EMBEDDING</option>
            <option v-if="!categoryOptions.includes('ab_test')" value="ab_test">AB_TEST</option>
          </select>
        </div>
        <div>
          <label for="ai-model-filter" class="block text-[11px] text-phosphor-faint mb-1 uppercase">MODEL</label>
          <select
            id="ai-model-filter"
            v-model="modelFilter"
            class="w-full bg-crt-surface border border-crt-border px-2 py-1.5 text-[11px] text-phosphor focus:outline-none focus:border-hazard"
            data-testid="ai-usage-model-filter"
          >
            <option value="">ALL</option>
            <option v-for="m in modelOptions" :key="m" :value="m">{{ m }}</option>
          </select>
        </div>
        <div>
          <label for="ai-provider-filter" class="block text-[11px] text-phosphor-faint mb-1 uppercase">PROVIDER</label>
          <select
            id="ai-provider-filter"
            v-model="providerFilter"
            class="w-full bg-crt-surface border border-crt-border px-2 py-1.5 text-[11px] text-phosphor focus:outline-none focus:border-hazard"
            data-testid="ai-usage-provider-filter"
          >
            <option value="">ALL</option>
            <option value="gemini">GEMINI</option>
            <option value="openrouter">OPENROUTER</option>
          </select>
        </div>
      </div>

      <div v-if="isFetching && !isLoading" role="status" aria-live="polite" class="text-[11px] text-phosphor-faint uppercase mb-2">
        /// REFRESHING...
      </div>

      <!-- ERROR / LOADING / EMPTY / TABLE -->
      <div
        v-if="errorMessage"
        role="alert"
        aria-live="assertive"
        class="border border-danger px-3 py-6 text-center text-xs text-danger"
        data-testid="ai-usage-detail-error"
      >
        [ ERROR: {{ errorMessage.toUpperCase() }} ]
      </div>

      <div
        v-else-if="isLoading"
        role="status"
        aria-live="polite"
        class="border border-crt-border px-3 py-6 text-center text-xs text-phosphor-faint"
        data-testid="ai-usage-detail-loading"
      >
        &gt;&gt;&gt; LOADING AI USAGE DETAIL...
      </div>

      <div
        v-else-if="!rows.length"
        class="border border-crt-border px-3 py-6 text-center text-xs text-phosphor-faint"
        data-testid="ai-usage-detail-empty"
      >
        [ NO AI USAGE DATA ]
      </div>

      <div v-else class="border border-crt-border overflow-x-auto" data-testid="ai-usage-detail-table">
        <div
          class="grid grid-cols-[140px_100px_1fr_100px_120px_120px_120px] items-center gap-2 bg-crt-surface px-3 py-1.5 text-[11px] text-phosphor-faint uppercase border-b border-crt-border min-w-[820px]"
        >
          <span>WHEN</span>
          <span>PROVIDER</span>
          <span>MODEL</span>
          <span>CATEGORY</span>
          <span class="text-right">TOKENS</span>
          <span class="text-right">LATENCY (MS)</span>
          <span class="text-right">COST (USD)</span>
        </div>
        <div
          v-for="row in rows"
          :key="row.id"
          class="grid grid-cols-[140px_100px_1fr_100px_120px_120px_120px] items-center gap-2 px-3 py-1.5 text-xs border-b border-crt-border last:border-b-0 min-w-[820px]"
          :data-testid="`ai-usage-row-${row.id}`"
        >
          <span class="text-phosphor font-mono">{{ formatTimestamp(row.created_at) }}</span>
          <span class="text-phosphor-faint font-mono uppercase">{{ row.provider }}</span>
          <span class="text-phosphor truncate" :title="row.model">{{ row.model }}</span>
          <span class="text-phosphor-dim font-mono uppercase">{{ row.category }}</span>
          <span class="text-phosphor-dim font-mono text-right">
            {{ formatTokens(row.total_tokens) }}
            <span class="text-phosphor-faint">({{ formatTokens(row.prompt_tokens) }}+{{ formatTokens(row.completion_tokens) }})</span>
          </span>
          <span class="text-phosphor-faint font-mono text-right">{{ formatTokens(row.latency_ms) }}</span>
          <span class="text-phosphor font-mono text-right">{{ formatUSD(row.estimated_cost_usd) }}</span>
        </div>
      </div>

      <!-- PAGINATION -->
      <div class="flex items-center justify-between mt-3" v-if="!errorMessage && !isLoading">
        <button
          class="border border-crt-border px-3 py-1.5 text-[11px] text-phosphor-dim hover:text-phosphor hover:border-phosphor-dim transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          :disabled="!hasPrev"
          aria-label="Previous page"
          data-testid="ai-usage-prev"
          @click="goPrev"
        >
          [ ← PREV ]
        </button>
        <button
          class="border border-crt-border px-3 py-1.5 text-[11px] text-phosphor-dim hover:text-phosphor hover:border-phosphor-dim transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          :disabled="!hasNext"
          aria-label="Next page"
          data-testid="ai-usage-next"
          @click="goNext"
        >
          [ NEXT → ]
        </button>
      </div>
    </template>
  </section>
</template>
