<script setup lang="ts">
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

withDefaults(defineProps<Props>(), {
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
        <tbody>
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
