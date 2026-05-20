<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import DataTable from '@/components/DataTable.vue'
import { useCursorPagination } from '@/composables/useCursorPagination'
import { assessmentsApi, type AssessmentListFilters } from '@/lib/api-assessments'

const router = useRouter()
const route = useRoute()

const filters = ref<AssessmentListFilters>({
  user_name: (route.query.user_name as string) || '',
  user_email: (route.query.user_email as string) || '',
  status: (route.query.status as string) || '',
  model: (route.query.model as string) || '',
  date_from: (route.query.date_from as string) || '',
  date_to: (route.query.date_to as string) || '',
})

const { currentCursor, hasNext, hasPrev, goNext, goPrev, reset, setNextCursor } = useCursorPagination()

const { data, isLoading } = useQuery({
  queryKey: ['assessments', filters, currentCursor],
  queryFn: () => assessmentsApi.list(filters.value, currentCursor.value),
})

watch(data, (val) => {
  setNextCursor(val?.next_cursor)
})

function applyFilters() {
  reset()
  const query: Record<string, string> = {}
  if (filters.value.user_name) query.user_name = filters.value.user_name
  if (filters.value.user_email) query.user_email = filters.value.user_email
  if (filters.value.status) query.status = filters.value.status
  if (filters.value.model) query.model = filters.value.model
  if (filters.value.date_from) query.date_from = filters.value.date_from
  if (filters.value.date_to) query.date_to = filters.value.date_to
  router.replace({ query })
}

function clearFilters() {
  filters.value = { user_name: '', user_email: '', status: '', model: '', date_from: '', date_to: '' }
  applyFilters()
}

function handleRowClick(row: Record<string, unknown>) {
  router.push({ name: 'assessment-detail', params: { id: row.id as string } })
}

const columns = [
  { key: 'user_name', label: 'USER' },
  { key: 'school_name', label: 'SCHOOL', hideOnMobile: true, format: (v: unknown) => (v as string) || '\u2014' },
  {
    key: 'status', label: 'STATUS', class: 'w-28',
    format: (v: unknown) => (v as string).toUpperCase(),
    cellClass: (v: unknown) => {
      switch (v as string) {
        case 'completed': return 'text-green-700 font-medium'
        case 'failed': return 'text-red-600 font-medium'
        case 'processing': return 'text-amber-600 font-medium'
        case 'queued':
        case 'pending': return 'text-amber-600 font-medium'
        default: return ''
      }
    },
  },
  { key: 'model_used', label: 'MODEL', hideOnMobile: true, format: (v: unknown) => (v as string) || '\u2014' },
  { key: 'submitted_at', label: 'SUBMITTED', class: 'w-36', hideOnMobile: true, format: (v: unknown) => (v as string).slice(0, 16).replace('T', ' ') },
]
</script>

<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
      <div>
        <div class="heading-macro text-xl text-phosphor mb-1">ASSESSMENTS</div>
        <div class="text-[11px] text-phosphor-faint uppercase">/// ASSESSMENT QA & INSPECTION</div>
      </div>
      <button
        class="border border-crt-border px-3 text-[11px] text-phosphor-dim hover:text-phosphor hover:border-phosphor-dim transition-colors uppercase min-h-[36px] w-full sm:w-auto"
        @click="router.push({ name: 'assessment-compare' })"
      >
        [ COMPARE ]
      </button>
    </div>

    <div class="border border-crt-border p-2 sm:p-3 mb-4">
      <div class="text-[10px] sm:text-[11px] text-phosphor-dim mb-2 uppercase">[ FILTERS ]</div>
      <form class="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4" @submit.prevent="applyFilters">
        <div>
          <label class="block text-[10px] sm:text-[11px] text-phosphor-faint mb-1 uppercase">USER NAME</label>
          <input
            v-model="filters.user_name"
            class="w-full bg-crt-surface border border-crt-border px-2 py-1.5 text-[13px] sm:text-xs text-phosphor focus:outline-none focus:border-hazard"
            placeholder="SEARCH..."
          />
        </div>
        <div>
          <label class="block text-[10px] sm:text-[11px] text-phosphor-faint mb-1 uppercase">USER EMAIL</label>
          <input
            v-model="filters.user_email"
            class="w-full bg-crt-surface border border-crt-border px-2 py-1.5 text-[13px] sm:text-xs text-phosphor focus:outline-none focus:border-hazard"
            placeholder="SEARCH..."
          />
        </div>
        <div>
          <label class="block text-[10px] sm:text-[11px] text-phosphor-faint mb-1 uppercase">STATUS</label>
          <select
            v-model="filters.status"
            class="w-full bg-crt-surface border border-crt-border px-2 py-1.5 text-[13px] sm:text-xs text-phosphor focus:outline-none focus:border-hazard"
          >
            <option value="">ALL</option>
            <option value="pending">PENDING</option>
            <option value="processing">PROCESSING</option>
            <option value="completed">COMPLETED</option>
            <option value="failed">FAILED</option>
          </select>
        </div>
        <div>
          <label class="block text-[10px] sm:text-[11px] text-phosphor-faint mb-1 uppercase">MODEL</label>
          <input
            v-model="filters.model"
            class="w-full bg-crt-surface border border-crt-border px-2 py-1.5 text-[13px] sm:text-xs text-phosphor focus:outline-none focus:border-hazard"
            placeholder="e.g. gemini-2.5-flash"
          />
        </div>
        <div>
          <label class="block text-[10px] sm:text-[11px] text-phosphor-faint mb-1 uppercase">DATE FROM</label>
          <input
            v-model="filters.date_from"
            type="date"
            class="w-full bg-crt-surface border border-crt-border px-2 py-1.5 text-[13px] sm:text-xs text-phosphor focus:outline-none focus:border-hazard"
          />
        </div>
        <div>
          <label class="block text-[10px] sm:text-[11px] text-phosphor-faint mb-1 uppercase">DATE TO</label>
          <input
            v-model="filters.date_to"
            type="date"
            class="w-full bg-crt-surface border border-crt-border px-2 py-1.5 text-[13px] sm:text-xs text-phosphor focus:outline-none focus:border-hazard"
          />
        </div>
        <div class="col-span-2 flex gap-2 mt-1 lg:mt-0 lg:items-end">
          <button
            type="submit"
            class="flex-1 sm:flex-initial border border-hazard px-3 py-1.5 text-[11px] text-hazard hover:bg-hazard hover:text-crt transition-colors"
          >
            [ APPLY ]
          </button>
          <button
            type="button"
            class="flex-1 sm:flex-initial border border-crt-border px-3 py-1.5 text-[11px] text-phosphor-dim hover:text-phosphor hover:border-phosphor-dim transition-colors"
            @click="clearFilters"
          >
            [ CLEAR ]
          </button>
        </div>
      </form>
    </div>

    <DataTable
      :columns="columns"
      :rows="(data?.assessments ?? []) as unknown as Record<string, unknown>[]"
      :loading="isLoading"
      :has-next="hasNext"
      :has-prev="hasPrev"
      @next="goNext"
      @prev="goPrev"
      @row-click="handleRowClick"
    />
  </div>
</template>
