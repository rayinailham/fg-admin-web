<script setup lang="ts">
import { computed } from 'vue'
import type { CompareData, FxSource, LedgerResponse } from '@/lib/api-ledger'
import { formatDelta, formatIDR, formatMarginPoints, formatPercent } from '@/lib/format-delta'

interface Props {
  summary: LedgerResponse | null | undefined
  compare?: CompareData | null | undefined
  /** When true, hides metric values and shows a loading placeholder. */
  loading?: boolean
  /** Error message; rendered in danger color when present. Overrides loading. */
  error?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  compare: null,
  loading: false,
  error: null,
})

const period = computed(() => props.summary?.period ?? '—')
const fxRate = computed(() => props.summary?.exchange_rate.usd_to_idr ?? null)
const fxSource = computed<FxSource | null>(() => props.summary?.exchange_rate.source ?? null)

const revenueIdr = computed(() => props.summary?.monthly.summary.revenue_idr ?? 0)
const totalCostsIdr = computed(() => props.summary?.monthly.summary.total_costs_idr ?? 0)
const netProfitIdr = computed(() => props.summary?.monthly.summary.net_profit_idr ?? 0)
const profitMarginPercent = computed(() => props.summary?.monthly.summary.profit_margin_percent ?? 0)

const aiCostsIdr = computed(() => props.summary?.monthly.ai_costs.total_idr ?? 0)
const infraCostsIdr = computed(() => props.summary?.monthly.infra_costs.total_idr ?? 0)

// Compare-aware deltas (null when compare data not loaded)
const revenueDelta = computed(() =>
  props.compare ? formatDelta(props.compare.delta.revenue_idr) : null,
)
const aiCostsDelta = computed(() =>
  props.compare ? formatDelta(props.compare.delta.ai_costs_idr, { inverse: true }) : null,
)
const infraCostsDelta = computed(() =>
  props.compare ? formatDelta(props.compare.delta.infra_costs_idr, { inverse: true }) : null,
)
const netProfitDelta = computed(() =>
  props.compare ? formatDelta(props.compare.delta.net_profit_idr) : null,
)
const marginDelta = computed(() =>
  props.compare ? formatMarginPoints(props.compare.delta.profit_margin_points) : null,
)

const fxBadgeClass = computed(() => {
  switch (fxSource.value) {
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

const profitColorClass = computed(() =>
  netProfitIdr.value >= 0 ? 'text-terminal-green' : 'text-danger',
)
const marginColorClass = computed(() =>
  profitMarginPercent.value >= 0 ? 'text-terminal-green' : 'text-danger',
)
</script>

<template>
  <section
    class="border-2 border-crt-border p-4 mb-4"
    aria-labelledby="ledger-summary-heading"
    data-testid="ledger-summary"
  >
    <!-- HEADER: label + period + FX badge -->
    <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
      <div class="flex items-center gap-3">
        <span id="ledger-summary-heading" class="text-[11px] text-phosphor-dim uppercase">
          [ SUMMARY ]
        </span>
        <span class="text-xs text-phosphor font-mono">{{ period }}</span>
      </div>

      <div v-if="fxSource" class="flex items-center gap-2">
        <span class="text-[11px] text-phosphor-faint uppercase">USD → IDR</span>
        <span class="text-xs text-phosphor font-mono">
          {{ fxRate !== null ? fxRate.toLocaleString('id-ID') : '—' }}
        </span>
        <span
          class="border px-2 py-0.5 text-[11px] uppercase"
          :class="fxBadgeClass"
          data-testid="fx-badge"
        >
          [ {{ fxSource.toUpperCase() }} ]
        </span>
      </div>
    </div>

    <!-- ERROR / LOADING / DATA -->
    <div
      v-if="error"
      role="alert"
      aria-live="assertive"
      class="text-xs text-danger"
      data-testid="summary-error"
    >
      [ ERROR: {{ error.toUpperCase() }} ]
    </div>

    <div
      v-else-if="loading || !summary"
      role="status"
      aria-live="polite"
      class="text-xs text-phosphor-faint py-4"
      data-testid="summary-loading"
    >
      &gt;&gt;&gt; LOADING SUMMARY...
    </div>

    <div v-else class="grid grid-cols-2 gap-2 sm:gap-3">
      <!-- REVENUE -->
      <div class="border border-crt-border p-2 sm:p-3" data-testid="metric-revenue">
        <div class="text-[10px] sm:text-[11px] text-phosphor-faint uppercase">REVENUE</div>
        <div class="text-sm sm:text-lg text-phosphor font-mono break-all">{{ formatIDR(revenueIdr) }}</div>
        <div
          v-if="revenueDelta"
          class="text-[10px] sm:text-[11px] mt-1"
          :class="revenueDelta.colorClass"
          data-testid="revenue-delta"
        >
          {{ revenueDelta.text }}
        </div>
      </div>

      <!-- TOTAL COSTS (sum) -->
      <div class="border border-crt-border p-2 sm:p-3" data-testid="metric-total-costs">
        <div class="text-[10px] sm:text-[11px] text-phosphor-faint uppercase">TOTAL COSTS</div>
        <div class="text-sm sm:text-lg text-phosphor font-mono break-all">{{ formatIDR(totalCostsIdr) }}</div>
        <div class="text-[10px] sm:text-[11px] text-phosphor-faint mt-1 break-all">
          AI {{ formatIDR(aiCostsIdr) }} · INFRA {{ formatIDR(infraCostsIdr) }}
        </div>
      </div>

      <!-- AI COSTS -->
      <div class="border border-crt-border p-2 sm:p-3" data-testid="metric-ai-costs">
        <div class="text-[10px] sm:text-[11px] text-phosphor-faint uppercase">AI COSTS</div>
        <div class="text-sm sm:text-lg text-phosphor font-mono break-all">{{ formatIDR(aiCostsIdr) }}</div>
        <div
          v-if="aiCostsDelta"
          class="text-[10px] sm:text-[11px] mt-1"
          :class="aiCostsDelta.colorClass"
          data-testid="ai-costs-delta"
        >
          {{ aiCostsDelta.text }}
        </div>
      </div>

      <!-- INFRA COSTS -->
      <div class="border border-crt-border p-2 sm:p-3" data-testid="metric-infra-costs">
        <div class="text-[10px] sm:text-[11px] text-phosphor-faint uppercase">INFRA COSTS</div>
        <div class="text-sm sm:text-lg text-phosphor font-mono break-all">{{ formatIDR(infraCostsIdr) }}</div>
        <div
          v-if="infraCostsDelta"
          class="text-[10px] sm:text-[11px] mt-1"
          :class="infraCostsDelta.colorClass"
          data-testid="infra-costs-delta"
        >
          {{ infraCostsDelta.text }}
        </div>
      </div>

      <!-- NET PROFIT (always spans both columns) -->
      <div
        class="border border-crt-border p-2 sm:p-3 col-span-2"
        data-testid="metric-net-profit"
      >
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <div class="min-w-0">
            <div class="text-[10px] sm:text-[11px] text-phosphor-faint uppercase">NET PROFIT</div>
            <div class="text-sm sm:text-lg font-mono break-all" :class="profitColorClass">
              {{ formatIDR(netProfitIdr) }}
            </div>
            <div
              v-if="netProfitDelta"
              class="text-[10px] sm:text-[11px] mt-1"
              :class="netProfitDelta.colorClass"
              data-testid="net-profit-delta"
            >
              {{ netProfitDelta.text }}
            </div>
          </div>
          <div class="text-right">
            <div class="text-[10px] sm:text-[11px] text-phosphor-faint uppercase">MARGIN</div>
            <div class="text-sm sm:text-lg font-mono" :class="marginColorClass">
              {{ formatPercent(profitMarginPercent) }}
            </div>
            <div
              v-if="marginDelta"
              class="text-[10px] sm:text-[11px] mt-1"
              :class="marginDelta.colorClass"
              data-testid="margin-delta"
            >
              {{ marginDelta.text }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
