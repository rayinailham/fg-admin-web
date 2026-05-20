<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { useAuthStore } from '@/stores/auth'
import DataTable from '@/components/DataTable.vue'
import SuperadminBadge from '@/components/SuperadminBadge.vue'
import { useCursorPagination } from '@/composables/useCursorPagination'
import { abTestsApi, type AbTestListFilters } from '@/lib/api-abtests'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const filters = ref<AbTestListFilters>({
  status: (route.query.status as string) || '',
})

const { currentCursor, hasNext, hasPrev, goNext, goPrev, reset, setNextCursor } = useCursorPagination()

const { data, isLoading } = useQuery({
  queryKey: ['ab-tests', filters, currentCursor],
  queryFn: () => abTestsApi.list(filters.value, currentCursor.value),
})

watch(data, (val) => {
  setNextCursor(val?.next_cursor)
})

function applyFilters() {
  reset()
  const query: Record<string, string> = {}
  if (filters.value.status) query.status = filters.value.status
  router.replace({ query })
}

function clearFilters() {
  filters.value = { status: '' }
  applyFilters()
}

function handleRowClick(row: Record<string, unknown>) {
  router.push({ name: 'ab-test-detail', params: { id: row.id as string } })
}

const columns = [
  { key: 'prompt_key', label: 'PROMPT KEY' },
  { key: 'version_a', label: 'A', class: 'w-12 text-center' },
  { key: 'version_b', label: 'B', class: 'w-12 text-center' },
  {
    key: 'status', label: 'STATUS', class: 'w-24',
    format: (v: unknown) => (v as string).toUpperCase(),
    cellClass: (v: unknown) => {
      switch (v as string) {
        case 'completed': return 'text-green-700 font-medium'
        case 'failed': return 'text-red-600 font-medium'
        case 'running': return 'text-amber-600 font-medium'
        case 'pending': return 'text-amber-600 font-medium'
        default: return 'text-phosphor-faint'
      }
    },
  },
  { key: 'winner', label: 'WINNER', class: 'w-16 text-center', hideOnMobile: true, format: (v: unknown) => v ? (v as string).toUpperCase() : '\u2014' },
  { key: 'admin_email', label: 'CREATED BY', hideOnMobile: true, format: (v: unknown) => (v as string).split('@')[0] ?? '\u2014' },
  { key: 'created_at', label: 'CREATED', class: 'w-36', hideOnMobile: true, format: (v: unknown) => (v as string).slice(0, 16).replace('T', ' ') },
]
</script>

<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4 sm:mb-6">
      <div>
        <div class="heading-macro text-xl text-phosphor mb-1">A/B TESTS</div>
        <div class="text-[11px] text-phosphor-faint uppercase">/// PROMPT QUALITY COMPARISON</div>
      </div>
      <button
        v-if="auth.isSuperadmin"
        class="border border-hazard px-3 text-[11px] text-hazard hover:bg-hazard hover:text-crt transition-colors inline-flex items-center justify-center min-h-[40px] w-full sm:w-auto"
        @click="router.push({ name: 'ab-test-new' })"
      >
        [ NEW TEST ]
        <SuperadminBadge />
      </button>
    </div>

    <div class="border-2 border-crt-border p-3 sm:p-4 mb-4">
      <div class="text-[11px] text-phosphor-dim mb-3 uppercase">[ FILTERS ]</div>
      <form class="flex flex-col sm:flex-row sm:items-end gap-3 flex-wrap" @submit.prevent="applyFilters">
        <div class="flex-1 min-w-0">
          <label class="block text-[11px] text-phosphor-faint mb-1 uppercase">STATUS</label>
          <select
            v-model="filters.status"
            class="w-full sm:w-auto bg-crt-surface border border-crt-border px-2 py-2 text-base sm:text-xs text-phosphor focus:outline-none focus:border-hazard min-h-[44px] sm:min-h-0"
          >
            <option value="">ALL</option>
            <option value="pending">PENDING</option>
            <option value="running">RUNNING</option>
            <option value="completed">COMPLETED</option>
            <option value="failed">FAILED</option>
          </select>
        </div>
        <div class="flex flex-col sm:flex-row gap-2">
          <button
            type="submit"
            class="border border-hazard px-3 text-[11px] text-hazard hover:bg-hazard hover:text-crt transition-colors min-h-[40px] w-full sm:w-auto"
          >
            [ APPLY ]
          </button>
          <button
            type="button"
            class="border border-crt-border px-3 text-[11px] text-phosphor-dim hover:text-phosphor hover:border-phosphor-dim transition-colors min-h-[40px] w-full sm:w-auto"
            @click="clearFilters"
          >
            [ CLEAR ]
          </button>
        </div>
      </form>
    </div>

    <DataTable
      :columns="columns"
      :rows="(data?.tests ?? []) as unknown as Record<string, unknown>[]"
      :loading="isLoading"
      :has-next="hasNext"
      :has-prev="hasPrev"
      @next="goNext"
      @prev="goPrev"
      @row-click="handleRowClick"
    />
  </div>
</template>
