<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { gsap } from 'gsap'
import { motion, prefersReducedMotion } from '@/composables/useMotion'

interface Column {
  key: string
  label: string
  class?: string
  format?: (value: unknown, row: Record<string, unknown>) => string
  cellClass?: (value: unknown, row: Record<string, unknown>) => string
  /**
   * If true, this column is hidden below the `sm` breakpoint (640px).
   * Useful for non-essential columns to keep mobile tables readable.
   */
  hideOnMobile?: boolean
}

interface Props {
  columns: Column[]
  rows: Record<string, unknown>[]
  loading?: boolean
  hasNext?: boolean
  hasPrev?: boolean
  emptyText?: string
  clickable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  hasNext: false,
  hasPrev: false,
  emptyText: '[ NO RECORDS FOUND ]',
  clickable: true,
})

const emit = defineEmits<{
  next: []
  prev: []
  'row-click': [row: Record<string, unknown>]
}>()

function getCellValue(row: Record<string, unknown>, col: Column): string {
  const value = row[col.key]
  if (col.format) return col.format(value, row)
  if (value === null || value === undefined) return '\u2014'
  return String(value)
}

function visibilityClass(col: Column): string {
  return col.hideOnMobile ? 'hidden sm:table-cell' : ''
}

// --- Row stagger reveal -----------------------------------------------------
// Animate rows in when the rows array changes from empty/loading to populated,
// or when its identity changes (page change, filter apply). Cap stagger so
// large pages don't take forever to settle.

const tbodyRef = ref<HTMLTableSectionElement | null>(null)

watch(
  () => [props.loading, props.rows],
  async ([loading, rows]) => {
    if (loading) return
    const rowList = rows as Record<string, unknown>[]
    if (!rowList.length) return
    if (prefersReducedMotion()) return

    await nextTick()
    const els = tbodyRef.value?.querySelectorAll<HTMLTableRowElement>('tr[data-row]')
    if (!els || !els.length) return

    // Cap total stagger window so 50-row pages still finish in < 0.5s.
    const perRow = Math.min(0.025, 0.4 / els.length)

    gsap.fromTo(
      els,
      { opacity: 0, y: 4 },
      {
        opacity: 1,
        y: 0,
        duration: motion.short,
        ease: motion.ease,
        stagger: perRow,
        clearProps: 'opacity,transform',
      },
    )
  },
  { flush: 'post' },
)
</script>

<template>
  <div class="border border-crt-border bg-crt-raised">
    <div class="overflow-x-auto">
        <table class="w-full text-[14px]">
        <thead>
          <tr class="border-b border-crt-border bg-crt-surface">
            <th
              v-for="col in columns"
              :key="col.key"
              class="px-3 py-2.5 text-left text-[11px] text-phosphor-faint font-semibold tracking-wider uppercase whitespace-nowrap"
              :class="[col.class, visibilityClass(col)]"
            >
              {{ col.label }}
            </th>
          </tr>
        </thead>
        <tbody ref="tbodyRef">
          <tr v-if="loading">
            <td :colspan="columns.length" role="status" aria-live="polite" class="px-3 py-8 text-center text-xs text-phosphor-faint">
              &gt;&gt;&gt; LOADING...
            </td>
          </tr>
          <tr v-else-if="rows.length === 0">
            <td :colspan="columns.length" class="px-3 py-8 text-center text-xs text-phosphor-faint">
              {{ emptyText }}
            </td>
          </tr>
          <tr
            v-else
            v-for="(row, i) in rows"
            :key="i"
            data-row
            class="border-b border-crt-border last:border-b-0 transition-colors"
            :class="[clickable ? 'cursor-pointer hover:bg-crt-surface' : '']"
            @click="clickable && emit('row-click', row)"
          >
            <td
              v-for="col in columns"
              :key="col.key"
              class="px-3 py-3 sm:py-2.5 text-phosphor align-top sm:align-middle"
              :class="[col.class, visibilityClass(col), col.cellClass ? col.cellClass(row[col.key], row) : '']"
            >
              {{ getCellValue(row, col) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-if="hasPrev || hasNext"
      class="flex items-center justify-between px-3 py-2 border-t border-crt-border bg-crt-surface gap-2"
    >
      <button
        :disabled="!hasPrev"
        aria-label="Previous page"
        class="text-[12px] text-phosphor-dim hover:text-phosphor disabled:opacity-30 disabled:cursor-not-allowed min-h-[36px] min-w-[88px] inline-flex items-center justify-center px-3"
        @click="emit('prev')"
      >
        [ ← PREV ]
      </button>
      <button
        :disabled="!hasNext"
        aria-label="Next page"
        class="text-[12px] text-phosphor-dim hover:text-phosphor disabled:opacity-30 disabled:cursor-not-allowed min-h-[36px] min-w-[88px] inline-flex items-center justify-center px-3"
        @click="emit('next')"
      >
        [ NEXT → ]
      </button>
    </div>
  </div>
</template>
