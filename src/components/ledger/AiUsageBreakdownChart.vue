<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import { type TooltipItem } from 'chart.js'
import '@/lib/chart-setup'
import { formatIDR, formatUSD } from '@/lib/format-delta'
import type { AiCostBreakdownItem } from '@/lib/api-ledger'

interface Props {
  breakdown: AiCostBreakdownItem[]
}

const props = defineProps<Props>()

function paletteFor(rank: number, total: number): string {
  if (rank === 0) return '#0F766E'
  if (total <= 1) return '#0F766E'
  const remaining = total - 1
  const idx = rank - 1
  const opacity = Math.max(0.4, 1 - (idx / remaining) * 0.6)
  return `rgba(71, 85, 105, ${opacity.toFixed(2)})`
}

const sorted = computed(() =>
  [...props.breakdown].sort((a, b) => b.cost_idr - a.cost_idr),
)

const chartData = computed(() => {
  const rows = sorted.value
  return {
    labels: rows.map((r) => `${r.category} / ${r.model}`),
    datasets: [
      {
        data: rows.map((r) => r.cost_idr),
        backgroundColor: rows.map((_, i) => paletteFor(i, rows.length)),
        borderColor: rows.map((_, i) => paletteFor(i, rows.length)),
        borderWidth: 1,
        barThickness: 'flex' as const,
        maxBarThickness: 28,
      },
    ],
  }
})

const chartOptions = computed(() => ({
  indexAxis: 'y' as const,
  responsive: true,
  maintainAspectRatio: false,
  animation: false as const,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#FFFFFF',
      titleColor: '#0F172A',
      bodyColor: '#0F172A',
      borderColor: '#E2E8F0',
      borderWidth: 1,
      titleFont: { family: 'Inter, system-ui, sans-serif', size: 11 },
      bodyFont: { family: 'JetBrains Mono, ui-monospace, monospace', size: 11 },
      callbacks: {
        label: (ctx: TooltipItem<'bar'>) => {
          const row = sorted.value[ctx.dataIndex]
          if (!row) return formatIDR((ctx.parsed.x ?? 0) as number)
          return `${formatIDR(row.cost_idr)} (${formatUSD(row.cost_usd)}) · ${row.call_count} calls`
        },
      },
    },
  },
  scales: {
    x: {
      ticks: {
        color: '#64748B',
        font: { family: 'JetBrains Mono, ui-monospace, monospace', size: 11 },
        callback: (value: number | string) =>
          typeof value === 'number' ? formatIDR(value) : value,
      },
      grid: { color: '#F1F5F9' },
      border: { color: '#E2E8F0' },
      beginAtZero: true,
    },
    y: {
      ticks: {
        color: '#0F172A',
        font: { family: 'Inter, system-ui, sans-serif', size: 11 },
      },
      grid: { display: false },
      border: { color: '#E2E8F0' },
    },
  },
}))
</script>

<template>
  <div class="h-48" data-testid="ai-usage-chart">
    <div
      v-if="!sorted.length"
      class="flex items-center justify-center h-full text-xs text-phosphor-faint"
    >
      &gt;&gt;&gt; NO AI COST DATA
    </div>
    <Bar v-else :data="chartData" :options="chartOptions" />
  </div>
</template>
