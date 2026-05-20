<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import DataTable from '@/components/DataTable.vue'
import { useCursorPagination } from '@/composables/useCursorPagination'
import { usersApi, type UserListFilters } from '@/lib/api-users'

const router = useRouter()
const route = useRoute()

const filters = ref<UserListFilters>({
  name: (route.query.name as string) || '',
  email: (route.query.email as string) || '',
  verified: (route.query.verified as string) || '',
  suspended: (route.query.suspended as string) || '',
  provider: (route.query.provider as string) || '',
})

const { currentCursor, hasNext, hasPrev, goNext, goPrev, reset, setNextCursor } = useCursorPagination()

const { data, isLoading } = useQuery({
  queryKey: ['users', filters, currentCursor],
  queryFn: () => usersApi.list(filters.value, currentCursor.value),
})

watch(data, (val) => {
  setNextCursor(val?.next_cursor)
})

function applyFilters() {
  reset()
  const query: Record<string, string> = {}
  if (filters.value.name) query.name = filters.value.name
  if (filters.value.email) query.email = filters.value.email
  if (filters.value.verified) query.verified = filters.value.verified
  if (filters.value.suspended) query.suspended = filters.value.suspended
  if (filters.value.provider) query.provider = filters.value.provider
  router.replace({ query })
}

function clearFilters() {
  filters.value = { name: '', email: '', verified: '', suspended: '', provider: '' }
  applyFilters()
}

function handleRowClick(row: Record<string, unknown>) {
  router.push({ name: 'user-detail', params: { id: row.id as string } })
}

const columns = [
  { key: 'full_name', label: 'NAME' },
  { key: 'email', label: 'EMAIL', hideOnMobile: true },
  { key: 'school_name', label: 'SCHOOL', hideOnMobile: true, format: (v: unknown) => (v as string) || '\u2014' },
  {
    key: 'token_balance', label: 'TOKENS', class: 'w-20 text-right',
    cellClass: (v: unknown) => {
      const n = v as number
      if (n > 0) return 'text-amber-600 font-medium'
      if (n === 0) return 'text-phosphor-faint'
      return 'text-red-600'
    },
  },
  {
    key: 'assessment_count', label: 'ASSESSMENTS', class: 'w-24 text-right', hideOnMobile: true,
    cellClass: (v: unknown) => ((v as number) > 0 ? 'text-phosphor font-medium' : 'text-phosphor-faint'),
  },
  {
    key: 'email_verified', label: 'VERIFIED', class: 'w-20', hideOnMobile: true,
    format: (v: unknown) => v ? 'YES' : 'NO',
    cellClass: (v: unknown) => v ? 'text-green-700' : 'text-phosphor-faint',
  },
  {
    key: 'suspended', label: 'STATUS', class: 'w-24',
    format: (v: unknown) => v ? 'SUSPENDED' : 'ACTIVE',
    cellClass: (v: unknown) => v ? 'text-red-600 font-medium' : 'text-green-700 font-medium',
  },
  { key: 'registered_at', label: 'REGISTERED', class: 'w-28', hideOnMobile: true, format: (v: unknown) => (v as string).slice(0, 10) },
]
</script>

<template>
  <div>
    <div class="heading-macro text-xl text-phosphor mb-1">USERS</div>
    <div class="text-[11px] text-phosphor-faint mb-4 sm:mb-6 uppercase">/// USER MANAGEMENT & INSPECTION</div>

    <div class="border border-crt-border p-2 sm:p-3 mb-4">
      <div class="text-[10px] sm:text-[11px] text-phosphor-dim mb-2 uppercase">[ FILTERS ]</div>
      <form class="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4" @submit.prevent="applyFilters">
        <div>
          <label class="block text-[10px] sm:text-[11px] text-phosphor-faint mb-1 uppercase">NAME</label>
          <input
            v-model="filters.name"
            class="w-full bg-crt-surface border border-crt-border px-2 py-1.5 text-[13px] sm:text-xs text-phosphor focus:outline-none focus:border-hazard"
            placeholder="SEARCH..."
          />
        </div>
        <div>
          <label class="block text-[10px] sm:text-[11px] text-phosphor-faint mb-1 uppercase">EMAIL</label>
          <input
            v-model="filters.email"
            class="w-full bg-crt-surface border border-crt-border px-2 py-1.5 text-[13px] sm:text-xs text-phosphor focus:outline-none focus:border-hazard"
            placeholder="SEARCH..."
          />
        </div>
        <div>
          <label class="block text-[10px] sm:text-[11px] text-phosphor-faint mb-1 uppercase">VERIFIED</label>
          <select
            v-model="filters.verified"
            class="w-full bg-crt-surface border border-crt-border px-2 py-1.5 text-[13px] sm:text-xs text-phosphor focus:outline-none focus:border-hazard"
          >
            <option value="">ALL</option>
            <option value="true">YES</option>
            <option value="false">NO</option>
          </select>
        </div>
        <div>
          <label class="block text-[10px] sm:text-[11px] text-phosphor-faint mb-1 uppercase">STATUS</label>
          <select
            v-model="filters.suspended"
            class="w-full bg-crt-surface border border-crt-border px-2 py-1.5 text-[13px] sm:text-xs text-phosphor focus:outline-none focus:border-hazard"
          >
            <option value="">ALL</option>
            <option value="true">SUSPENDED</option>
            <option value="false">ACTIVE</option>
          </select>
        </div>
        <div class="col-span-2 lg:col-span-1">
          <label class="block text-[10px] sm:text-[11px] text-phosphor-faint mb-1 uppercase">PROVIDER</label>
          <select
            v-model="filters.provider"
            class="w-full bg-crt-surface border border-crt-border px-2 py-1.5 text-[13px] sm:text-xs text-phosphor focus:outline-none focus:border-hazard"
          >
            <option value="">ALL</option>
            <option value="email">EMAIL</option>
            <option value="google">GOOGLE</option>
          </select>
        </div>
        <div class="col-span-2 lg:col-span-3 flex gap-2 mt-1 lg:mt-0 lg:items-end">
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
      :rows="(data?.users ?? []) as unknown as Record<string, unknown>[]"
      :loading="isLoading"
      :has-next="hasNext"
      :has-prev="hasPrev"
      @next="goNext"
      @prev="goPrev"
      @row-click="handleRowClick"
    />
  </div>
</template>
