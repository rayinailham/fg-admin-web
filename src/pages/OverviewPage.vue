<script setup lang="ts">
import { ref, computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
  Legend,
} from 'chart.js'
import { overviewApi, type TimeseriesMetric, type TimeseriesRange, type StatValue } from '@/lib/api-overview'
import { makeLineChartAnimation } from '@/lib/chart-animations'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler, Legend)

const { data: overview, isLoading } = useQuery({
  queryKey: ['overview'],
  queryFn: () => overviewApi.stats(),
})

const { data: schools } = useQuery({
  queryKey: ['overview-schools'],
  queryFn: () => overviewApi.schools(),
})

// Chart 1 (left)
const metricLeft = ref<TimeseriesMetric>('users_registered')
const rangeLeft = ref<TimeseriesRange>('7d')

const { data: tsLeft } = useQuery({
  queryKey: ['overview-ts-left', metricLeft, rangeLeft],
  queryFn: () => overviewApi.timeseries(metricLeft.value, rangeLeft.value),
})

// Chart 2 (right)
const metricRight = ref<TimeseriesMetric>('assessments_submitted')
const rangeRight = ref<TimeseriesRange>('7d')

const { data: tsRight } = useQuery({
  queryKey: ['overview-ts-right', metricRight, rangeRight],
  queryFn: () => overviewApi.timeseries(metricRight.value, rangeRight.value),
})

// Chart 3 (combined revenue + ai costs)
const rangeCombined = ref<TimeseriesRange>('7d')

const { data: tsRevenue } = useQuery({
  queryKey: ['overview-ts-revenue', rangeCombined],
  queryFn: () => overviewApi.timeseries('revenue', rangeCombined.value),
})

const { data: tsAiCosts } = useQuery({
  queryKey: ['overview-ts-aicosts', rangeCombined],
  queryFn: () => overviewApi.timeseries('ai_costs', rangeCombined.value),
})

const generalMetrics: { value: TimeseriesMetric; label: string }[] = [
  { value: 'users_registered', label: 'USERS REGISTERED' },
  { value: 'users_verified', label: 'USERS VERIFIED' },
  { value: 'tokens_purchased', label: 'TOKENS PURCHASED' },
  { value: 'orders_completed', label: 'ORDERS COMPLETED' },
  { value: 'assessments_submitted', label: 'ASSESSMENTS SUBMITTED' },
]

const ranges: { value: TimeseriesRange; label: string }[] = [
  { value: 'today', label: 'TODAY' },
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '12mo', label: '12MO' },
]

function makeChartData(data: { t: string; v: number }[] | undefined, color: string) {
  if (!data) return { labels: [], datasets: [] }
  return {
    labels: data.map(d => d.t),
    datasets: [
      {
        data: data.map(d => d.v),
        borderColor: color,
        backgroundColor: `${color}1A`,
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: color,
        fill: true,
        tension: 0,
      },
    ],
  }
}

const chartDataLeft = computed(() => makeChartData(tsLeft.value?.data, '#0F766E'))
const chartDataRight = computed(() => makeChartData(tsRight.value?.data, '#0F766E'))

const chartDataCombined = computed(() => {
  const revenueData = tsRevenue.value?.data ?? []
  const costsData = tsAiCosts.value?.data ?? []
  const labels = revenueData.length ? revenueData.map(d => d.t) : costsData.map(d => d.t)
  return {
    labels,
    datasets: [
      {
        label: 'Revenue (IDR)',
        data: revenueData.map(d => d.v),
        borderColor: '#0F172A',
        backgroundColor: 'rgba(15, 23, 42, 0.06)',
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: '#0F172A',
        fill: false,
        tension: 0,
        yAxisID: 'yRevenue',
      },
      {
        label: 'AI Costs (USD)',
        data: costsData.map(d => d.v),
        borderColor: '#0F766E',
        backgroundColor: 'rgba(15, 118, 110, 0.1)',
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: '#0F766E',
        fill: false,
        tension: 0,
        yAxisID: 'yCosts',
      },
    ],
  }
})

const singleChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: makeLineChartAnimation(),
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#FFFFFF',
      titleColor: '#0F172A',
      bodyColor: '#0F172A',
      borderColor: '#E2E8F0',
      borderWidth: 1,
    },
  },
  scales: {
    x: {
      ticks: { color: '#64748B', font: { family: 'Inter, system-ui, sans-serif', size: 11 } },
      grid: { color: '#F1F5F9' },
      border: { color: '#E2E8F0' },
    },
    y: {
      ticks: { color: '#64748B', font: { family: 'Inter, system-ui, sans-serif', size: 11 } },
      grid: { color: '#F1F5F9' },
      border: { color: '#E2E8F0' },
    },
  },
}

const combinedChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: makeLineChartAnimation(),
  plugins: {
    legend: {
      display: true,
      position: 'top' as const,
      labels: { color: '#0F172A', font: { family: 'Inter, system-ui, sans-serif', size: 11 }, boxWidth: 12 },
    },
    tooltip: {
      backgroundColor: '#FFFFFF',
      titleColor: '#0F172A',
      bodyColor: '#0F172A',
      borderColor: '#E2E8F0',
      borderWidth: 1,
    },
  },
  scales: {
    x: {
      ticks: { color: '#64748B', font: { family: 'Inter, system-ui, sans-serif', size: 11 } },
      grid: { color: '#F1F5F9' },
      border: { color: '#E2E8F0' },
    },
    yRevenue: {
      type: 'linear' as const,
      position: 'left' as const,
      ticks: { color: '#0F172A', font: { family: 'Inter, system-ui, sans-serif', size: 11 } },
      grid: { color: '#F1F5F9' },
      border: { color: '#E2E8F0' },
      title: { display: true, text: 'IDR', color: '#0F172A', font: { family: 'Inter, system-ui, sans-serif', size: 11 } },
    },
    yCosts: {
      type: 'linear' as const,
      position: 'right' as const,
      ticks: { color: '#0F766E', font: { family: 'Inter, system-ui, sans-serif', size: 11 } },
      grid: { drawOnChartArea: false },
      border: { color: '#E2E8F0' },
      title: { display: true, text: 'USD', color: '#0F766E', font: { family: 'Inter, system-ui, sans-serif', size: 11 } },
    },
  },
}

function formatDelta(stat: StatValue): string {
  const diff = stat.value - stat.yesterday
  if (diff === 0) return '='
  return diff > 0 ? `+${diff}` : String(diff)
}

function deltaClass(stat: StatValue): string {
  const diff = stat.value - stat.yesterday
  if (diff > 0) return 'text-green-700'
  if (diff < 0) return 'text-red-600'
  return 'text-phosphor-faint'
}

function formatNumber(n: number): string {
  return n.toLocaleString('id-ID')
}

function formatCurrency(n: number, currency: 'IDR' | 'USD'): string {
  if (currency === 'USD') return `$${n.toFixed(2)}`
  return `Rp ${n.toLocaleString('id-ID')}`
}
</script>

<template>
  <div>
    <div class="heading-macro text-xl text-phosphor mb-1">OVERVIEW</div>
    <div class="text-[11px] text-phosphor-faint mb-4 sm:mb-6 uppercase">/// SYSTEM STATUS & METRICS</div>

    <div v-if="isLoading" class="text-phosphor-faint text-xs py-8 text-center">>>> LOADING OVERVIEW...</div>

    <template v-else-if="overview">
      <!-- STAT CARDS -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4">
        <div class="border-2 border-crt-border p-2 sm:p-3">
          <div class="text-[10px] sm:text-[11px] text-phosphor-faint uppercase">USERS REGISTERED</div>
          <div class="text-base sm:text-lg text-phosphor">{{ overview.stats.users_registered_today.value }}</div>
          <div class="text-[10px] sm:text-[11px]" :class="deltaClass(overview.stats.users_registered_today)">
            {{ formatDelta(overview.stats.users_registered_today) }} vs yesterday
          </div>
        </div>
        <div class="border-2 border-crt-border p-2 sm:p-3">
          <div class="text-[10px] sm:text-[11px] text-phosphor-faint uppercase">USERS VERIFIED</div>
          <div class="text-base sm:text-lg text-phosphor">{{ overview.stats.users_verified_today.value }}</div>
          <div class="text-[10px] sm:text-[11px]" :class="deltaClass(overview.stats.users_verified_today)">
            {{ formatDelta(overview.stats.users_verified_today) }} vs yesterday
          </div>
        </div>
        <div class="border-2 border-crt-border p-2 sm:p-3">
          <div class="text-[10px] sm:text-[11px] text-phosphor-faint uppercase">TOKENS PURCHASED</div>
          <div class="text-base sm:text-lg text-phosphor">{{ overview.stats.tokens_purchased_today.value }}</div>
          <div class="text-[10px] sm:text-[11px]" :class="deltaClass(overview.stats.tokens_purchased_today)">
            {{ formatDelta(overview.stats.tokens_purchased_today) }} vs yesterday
          </div>
        </div>
        <div class="border-2 border-crt-border p-2 sm:p-3">
          <div class="text-[10px] sm:text-[11px] text-phosphor-faint uppercase">ORDERS COMPLETED</div>
          <div class="text-base sm:text-lg text-phosphor">{{ overview.stats.orders_completed_today.value }}</div>
          <div class="text-[10px] sm:text-[11px]" :class="deltaClass(overview.stats.orders_completed_today)">
            {{ formatDelta(overview.stats.orders_completed_today) }} vs yesterday
          </div>
        </div>
        <div class="border-2 border-crt-border p-2 sm:p-3">
          <div class="text-[10px] sm:text-[11px] text-phosphor-faint uppercase">ASSESSMENTS SUBMITTED</div>
          <div class="text-base sm:text-lg text-phosphor">{{ overview.stats.assessments_submitted_today.value }}</div>
          <div class="text-[10px] sm:text-[11px]" :class="deltaClass(overview.stats.assessments_submitted_today)">
            {{ formatDelta(overview.stats.assessments_submitted_today) }} vs yesterday
          </div>
        </div>
        <div class="border-2 border-crt-border p-2 sm:p-3">
          <div class="text-[10px] sm:text-[11px] text-phosphor-faint uppercase">TOKENS GRANTED</div>
          <div class="text-base sm:text-lg text-phosphor">{{ overview.stats.tokens_granted_today.value }}</div>
          <div class="text-[10px] sm:text-[11px]" :class="deltaClass(overview.stats.tokens_granted_today)">
            {{ formatDelta(overview.stats.tokens_granted_today) }} vs yesterday
          </div>
        </div>
        <div class="border-2 border-crt-border p-2 sm:p-3">
          <div class="text-[10px] sm:text-[11px] text-phosphor-faint uppercase">REVENUE TODAY</div>
          <div class="text-sm sm:text-lg text-phosphor break-all">{{ formatCurrency(overview.stats.revenue_today_idr.value, 'IDR') }}</div>
          <div class="text-[10px] sm:text-[11px]" :class="deltaClass(overview.stats.revenue_today_idr)">
            {{ formatDelta(overview.stats.revenue_today_idr) }} vs yesterday
          </div>
        </div>
        <div class="border-2 border-crt-border p-2 sm:p-3">
          <div class="text-[10px] sm:text-[11px] text-phosphor-faint uppercase">AI COSTS TODAY</div>
          <div class="text-base sm:text-lg text-phosphor">{{ formatCurrency(overview.stats.ai_costs_today_usd.value, 'USD') }}</div>
          <div class="text-[10px] sm:text-[11px]" :class="deltaClass(overview.stats.ai_costs_today_usd)">
            {{ formatDelta(overview.stats.ai_costs_today_usd) }} vs yesterday
          </div>
        </div>
      </div>

      <!-- INDEPENDENT STATS -->
      <div class="grid grid-cols-2 gap-2 sm:gap-3 mb-4">
        <div class="border-2 border-crt-border p-2 sm:p-3">
          <div class="text-[10px] sm:text-[11px] text-phosphor-faint uppercase">INDEPENDENT USERS (TOTAL)</div>
          <div class="text-base sm:text-lg text-phosphor">{{ formatNumber(overview.stats.independent_users_total) }}</div>
        </div>
        <div class="border-2 border-crt-border p-2 sm:p-3">
          <div class="text-[10px] sm:text-[11px] text-phosphor-faint uppercase">INDEPENDENT ASSESSMENTS (TOTAL)</div>
          <div class="text-base sm:text-lg text-phosphor">{{ formatNumber(overview.stats.independent_assessments_total) }}</div>
        </div>
      </div>

      <!-- MODEL INFO -->
      <div class="border-2 border-crt-border p-4 mb-4">
        <div class="text-[11px] text-phosphor-dim mb-3 uppercase">[ MODELS ]</div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
            <dt class="text-phosphor-faint">ANALYSIS MODEL</dt>
            <dd class="break-all">{{ overview.models.analysis_current }}</dd>
            <dt class="text-phosphor-faint">CHAT MODEL</dt>
            <dd class="break-all">{{ overview.models.chat_current }}</dd>
          </dl>
          <div v-if="overview.models.used_today.length">
            <div class="text-[11px] text-phosphor-faint mb-1 uppercase">USED TODAY</div>
            <div class="space-y-1">
              <div v-for="m in overview.models.used_today" :key="m.model" class="flex items-center justify-between gap-2 text-xs">
                <span class="text-phosphor truncate">{{ m.model }}</span>
                <span class="text-phosphor-faint shrink-0">{{ m.provider }} / {{ m.requests }} req</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- TIMESERIES CHARTS (side by side) -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <!-- Chart 1 (left) -->
        <div class="border-2 border-crt-border p-3 sm:p-4">
          <div class="text-[11px] text-phosphor-dim mb-3 uppercase">[ TIMESERIES A ]</div>
          <div class="flex flex-wrap gap-2 mb-3">
            <select
              v-model="metricLeft"
              class="bg-crt-surface border border-crt-border px-2 py-1 text-[11px] text-phosphor focus:outline-none focus:border-hazard min-h-[36px] flex-1 sm:flex-initial min-w-0"
            >
              <option v-for="m in generalMetrics" :key="m.value" :value="m.value">{{ m.label }}</option>
            </select>
            <div class="flex flex-wrap gap-1">
              <button
                v-for="r in ranges"
                :key="r.value"
                class="border px-2 text-[11px] transition-colors min-h-[36px] min-w-[44px]"
                :class="rangeLeft === r.value ? 'border-hazard text-hazard' : 'border-crt-border text-phosphor-dim hover:text-phosphor'"
                @click="rangeLeft = r.value"
              >
                {{ r.label }}
              </button>
            </div>
          </div>
          <div class="h-48 sm:h-56 lg:h-48">
            <Line v-if="chartDataLeft.labels.length" :data="chartDataLeft" :options="singleChartOptions" />
            <div v-else class="flex items-center justify-center h-full text-xs text-phosphor-faint">>>> NO DATA</div>
          </div>
        </div>

        <!-- Chart 2 (right) -->
        <div class="border-2 border-crt-border p-3 sm:p-4">
          <div class="text-[11px] text-phosphor-dim mb-3 uppercase">[ TIMESERIES B ]</div>
          <div class="flex flex-wrap gap-2 mb-3">
            <select
              v-model="metricRight"
              class="bg-crt-surface border border-crt-border px-2 py-1 text-[11px] text-phosphor focus:outline-none focus:border-hazard min-h-[36px] flex-1 sm:flex-initial min-w-0"
            >
              <option v-for="m in generalMetrics" :key="m.value" :value="m.value">{{ m.label }}</option>
            </select>
            <div class="flex flex-wrap gap-1">
              <button
                v-for="r in ranges"
                :key="r.value"
                class="border px-2 text-[11px] transition-colors min-h-[36px] min-w-[44px]"
                :class="rangeRight === r.value ? 'border-hazard text-hazard' : 'border-crt-border text-phosphor-dim hover:text-phosphor'"
                @click="rangeRight = r.value"
              >
                {{ r.label }}
              </button>
            </div>
          </div>
          <div class="h-48 sm:h-56 lg:h-48">
            <Line v-if="chartDataRight.labels.length" :data="chartDataRight" :options="singleChartOptions" />
            <div v-else class="flex items-center justify-center h-full text-xs text-phosphor-faint">>>> NO DATA</div>
          </div>
        </div>
      </div>

      <!-- COMBINED REVENUE + AI COSTS CHART -->
      <div class="border-2 border-crt-border p-3 sm:p-4 mb-4">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
          <div class="text-[11px] text-phosphor-dim uppercase">[ REVENUE vs AI COSTS ]</div>
          <div class="flex flex-wrap gap-1">
            <button
              v-for="r in ranges"
              :key="r.value"
              class="border px-2 text-[11px] transition-colors min-h-[36px] min-w-[44px]"
              :class="rangeCombined === r.value ? 'border-hazard text-hazard' : 'border-crt-border text-phosphor-dim hover:text-phosphor'"
              @click="rangeCombined = r.value"
            >
              {{ r.label }}
            </button>
          </div>
        </div>
        <div class="h-56 sm:h-64 lg:h-56">
          <Line v-if="chartDataCombined.labels.length" :data="chartDataCombined" :options="combinedChartOptions" />
          <div v-else class="flex items-center justify-center h-full text-xs text-phosphor-faint">>>> NO DATA</div>
        </div>
      </div>

      <!-- SCHOOL RANKINGS -->
      <div class="border-2 border-crt-border p-3 sm:p-4" v-if="schools">
        <div class="text-[11px] text-phosphor-dim mb-3 uppercase">[ TOP SCHOOLS ]</div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <div class="text-[11px] text-phosphor-faint mb-2 uppercase">BY ASSESSMENTS</div>
            <div v-if="schools.by_assessments.length === 0" class="text-xs text-phosphor-faint">[ NO DATA ]</div>
            <div v-else class="space-y-1">
              <div v-for="(s, i) in schools.by_assessments" :key="s.school_id" class="flex items-center justify-between gap-2 text-xs">
                <span class="text-phosphor truncate min-w-0"><span class="text-phosphor-faint mr-2">{{ String(i + 1).padStart(2, '0') }}.</span>{{ s.school_name }}</span>
                <span class="text-phosphor-dim shrink-0">{{ s.count }}</span>
              </div>
            </div>
          </div>
          <div>
            <div class="text-[11px] text-phosphor-faint mb-2 uppercase">BY USERS</div>
            <div v-if="schools.by_users.length === 0" class="text-xs text-phosphor-faint">[ NO DATA ]</div>
            <div v-else class="space-y-1">
              <div v-for="(s, i) in schools.by_users" :key="s.school_id" class="flex items-center justify-between gap-2 text-xs">
                <span class="text-phosphor truncate min-w-0"><span class="text-phosphor-faint mr-2">{{ String(i + 1).padStart(2, '0') }}.</span>{{ s.school_name }}</span>
                <span class="text-phosphor-dim shrink-0">{{ s.count }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
