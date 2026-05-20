<script setup lang="ts">
import { ref, computed, defineAsyncComponent } from 'vue'
import {
  useLedgerSummary,
  useLedgerMonths,
  useLedgerCompare,
} from '@/composables/useLedger'
import { formatIDR, formatUSD, formatPercent } from '@/lib/format-delta'
import SummaryCard from '@/components/ledger/SummaryCard.vue'
import InfraCostsSection from '@/components/ledger/InfraCostsSection.vue'
import ExchangeRateSection from '@/components/ledger/ExchangeRateSection.vue'
import RevenueDetailSection from '@/components/ledger/RevenueDetailSection.vue'
import AiUsageDetailSection from '@/components/ledger/AiUsageDetailSection.vue'
import type { ApiError } from '@/lib/api'

// Charts are lazy-loaded so Chart.js (~70KB gzip) is not in the initial bundle.
const RevenueBreakdownChart = defineAsyncComponent(
  () => import('@/components/ledger/RevenueBreakdownChart.vue'),
)
const AiUsageBreakdownChart = defineAsyncComponent(
  () => import('@/components/ledger/AiUsageBreakdownChart.vue'),
)

const selectedMonth = ref('')
const compareEnabled = ref(true)
const compareAgainst = ref('prev')

const { data: monthsData } = useLedgerMonths()
const { data, isLoading, isError, error } = useLedgerSummary(selectedMonth)

const compareReady = computed(() => compareEnabled.value && !!data.value)
const { data: compareData, isError: compareIsError } = useLedgerCompare(
  selectedMonth,
  compareAgainst,
  compareReady,
)

const months = computed(() => monthsData.value?.months ?? [])

const errorMessage = computed(() => {
  if (!isError.value) return null
  const e = error.value as ApiError | Error | null
  if (!e) return 'failed to load ledger'
  if ('message' in e && e.message) return e.message
  return 'failed to load ledger'
})

// Compare data may legitimately be missing (e.g., first month with no prior).
// Treat compare errors as a soft fallback: surface no delta rather than blocking
// the whole summary render.
const compareForCard = computed(() => {
  if (!compareEnabled.value) return null
  if (compareIsError.value) return null
  return compareData.value ?? null
})
</script>

<template>
  <div>
    <div class="flex items-start justify-between mb-6 gap-4 flex-wrap">
      <div>
        <div class="heading-macro text-xl text-phosphor mb-1">LEDGER</div>
        <div class="text-[11px] text-phosphor-faint uppercase">/// PROFIT &amp; LOSS TRACKING</div>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <button
          class="border px-3 py-1.5 text-[11px] uppercase transition-colors"
          :class="compareEnabled
            ? 'border-hazard text-hazard'
            : 'border-crt-border text-phosphor-dim hover:text-phosphor hover:border-phosphor-dim'"
          :aria-pressed="compareEnabled"
          data-testid="compare-toggle"
          @click="compareEnabled = !compareEnabled"
        >
          [ COMPARE: {{ compareEnabled ? 'ON' : 'OFF' }} ]
        </button>
        <template v-if="months.length">
          <label for="month-select" class="sr-only">Select reporting month</label>
          <select
            id="month-select"
            v-model="selectedMonth"
            class="bg-crt-surface border border-crt-border px-2 py-1.5 text-[11px] text-phosphor focus:outline-none focus:border-hazard"
            data-testid="month-select"
          >
            <option value="">CURRENT MONTH</option>
            <option v-for="m in months" :key="m.month" :value="m.month">{{ m.month }}</option>
          </select>
        </template>
      </div>
    </div>

    <!-- SUMMARY CARD -->
    <SummaryCard
      :summary="data ?? null"
      :compare="compareForCard"
      :loading="isLoading"
      :error="errorMessage"
    />

    <!-- EXCHANGE RATE -->
    <ExchangeRateSection />

    <template v-if="data">
      <!-- LIFETIME -->
      <div class="border-2 border-crt-border p-3 sm:p-4 mb-4">
        <div class="text-[11px] text-phosphor-dim mb-3 uppercase">[ LIFETIME ]</div>
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <div class="border border-crt-border p-2 sm:p-0 sm:border-0">
            <div class="text-[10px] sm:text-[11px] text-phosphor-faint uppercase">REVENUE</div>
            <div class="text-xs sm:text-sm text-terminal-green font-mono break-all">{{ formatIDR(data.lifetime.revenue_idr) }}</div>
          </div>
          <div class="border border-crt-border p-2 sm:p-0 sm:border-0">
            <div class="text-[10px] sm:text-[11px] text-phosphor-faint uppercase">AI COSTS (USD)</div>
            <div class="text-xs sm:text-sm text-danger font-mono break-all">{{ formatUSD(data.lifetime.ai_costs_usd) }}</div>
          </div>
          <div class="border border-crt-border p-2 sm:p-0 sm:border-0">
            <div class="text-[10px] sm:text-[11px] text-phosphor-faint uppercase">AI COSTS (IDR)</div>
            <div class="text-xs sm:text-sm text-danger font-mono break-all">{{ formatIDR(data.lifetime.ai_costs_idr) }}</div>
          </div>
          <div class="border border-crt-border p-2 sm:p-0 sm:border-0">
            <div class="text-[10px] sm:text-[11px] text-phosphor-faint uppercase">
              INFRA COSTS<span v-if="data.lifetime.infra_costs_from_month" class="text-phosphor-faint"> · since {{ data.lifetime.infra_costs_from_month }}</span>
            </div>
            <div class="text-xs sm:text-sm text-danger font-mono break-all">{{ formatIDR(data.lifetime.infra_costs_idr) }}</div>
          </div>
          <div class="border border-crt-border p-2 sm:p-0 sm:border-0 col-span-2 md:col-span-1">
            <div class="text-[10px] sm:text-[11px] text-phosphor-faint uppercase">NET PROFIT</div>
            <div
              class="text-xs sm:text-sm font-mono break-all"
              :class="data.lifetime.net_profit_idr >= 0 ? 'text-terminal-green' : 'text-danger'"
            >
              {{ formatIDR(data.lifetime.net_profit_idr) }}
            </div>
          </div>
        </div>
      </div>

      <!-- REVENUE BREAKDOWN -->
      <div class="border-2 border-crt-border p-4 mb-4">
        <div class="text-[11px] text-phosphor-dim mb-3 uppercase">
          [ REVENUE — {{ formatIDR(data.monthly.revenue.total_idr) }} / {{ data.monthly.revenue.order_count }} orders ]
        </div>
        <div v-if="!data.monthly.revenue.breakdown.length" class="text-xs text-phosphor-faint">[ NO REVENUE DATA ]</div>
        <template v-else>
          <Suspense>
            <RevenueBreakdownChart :breakdown="data.monthly.revenue.breakdown" />
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
          <div class="mt-3 space-y-1" data-testid="revenue-list">
            <div
              v-for="item in data.monthly.revenue.breakdown"
              :key="item.package_id"
              class="flex items-center justify-between text-xs"
            >
              <span class="text-phosphor">{{ item.label }}</span>
              <span class="text-phosphor-faint font-mono">{{ item.count }}x / {{ formatIDR(item.total_idr) }}</span>
            </div>
          </div>
        </template>
      </div>

      <!-- REVENUE DETAIL DRILL-DOWN -->
      <RevenueDetailSection
        :month="selectedMonth"
        :packages="data.monthly.revenue.breakdown"
      />

      <!-- AI COSTS BREAKDOWN -->
      <div class="border-2 border-crt-border p-4 mb-4">
        <div class="text-[11px] text-phosphor-dim mb-3 uppercase">
          [ AI COSTS — {{ formatUSD(data.monthly.ai_costs.total_usd) }} / {{ formatIDR(data.monthly.ai_costs.total_idr) }} ]
        </div>
        <div v-if="!data.monthly.ai_costs.breakdown.length" class="text-xs text-phosphor-faint">[ NO AI COST DATA ]</div>
        <template v-else>
          <Suspense>
            <AiUsageBreakdownChart :breakdown="data.monthly.ai_costs.breakdown" />
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
          <div class="mt-3 space-y-1" data-testid="ai-costs-list">
            <div
              v-for="item in data.monthly.ai_costs.breakdown"
              :key="`${item.category}/${item.model}`"
              class="flex items-center justify-between text-xs"
            >
              <span class="text-phosphor">{{ item.category }} / {{ item.model }}</span>
              <span class="text-phosphor-faint font-mono">{{ item.call_count }} calls / {{ formatUSD(item.cost_usd) }}</span>
            </div>
          </div>
        </template>
      </div>

      <!-- AI USAGE DETAIL DRILL-DOWN -->
      <AiUsageDetailSection
        :month="selectedMonth"
        :breakdown="data.monthly.ai_costs.breakdown"
      />

      <!-- INFRA COSTS BREAKDOWN (with edit + history) -->
      <InfraCostsSection :month="selectedMonth" />

      <!-- OPPORTUNITY COST -->
      <div class="border-2 border-crt-border p-4">
        <div class="text-[11px] text-phosphor-dim mb-3 uppercase">[ OPPORTUNITY COST ]</div>
        <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
          <dt class="text-phosphor-faint">TOKENS GRANTED</dt>
          <dd class="font-mono">{{ data.monthly.opportunity_cost.tokens_granted }}</dd>
          <dt class="text-phosphor-faint">EQUIVALENT</dt>
          <dd class="font-mono">{{ formatIDR(data.monthly.opportunity_cost.equivalent_idr) }}</dd>
        </dl>
      </div>
    </template>

    <!-- Profit margin shown in summary too; keep secondary readout for parity with v1 tests -->
    <div v-if="data" class="sr-only" aria-hidden="false">
      MARGIN: {{ formatPercent(data.monthly.summary.profit_margin_percent) }}
    </div>
  </div>
</template>
