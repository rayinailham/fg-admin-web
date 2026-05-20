<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { promptsApi } from '@/lib/api-prompts'

const router = useRouter()

const { data, isLoading } = useQuery({
  queryKey: ['prompts'],
  queryFn: () => promptsApi.list(),
})

function goToDetail(id: string) {
  router.push({ name: 'prompt-detail', params: { id } })
}
</script>

<template>
  <div>
    <div class="heading-macro text-xl text-phosphor mb-1">PROMPTS</div>
    <div class="text-[11px] text-phosphor-faint mb-4 sm:mb-6 uppercase">/// PROMPT TEMPLATE MANAGEMENT</div>

    <div v-if="isLoading" class="text-phosphor-faint text-xs py-8 text-center">>>> LOADING TEMPLATES...</div>

    <div v-else-if="!data?.templates.length" class="border-2 border-crt-border p-6 text-center text-phosphor-faint text-xs">
      [ NO TEMPLATES FOUND ]
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="t in data.templates"
        :key="t.id"
        class="border-2 border-crt-border p-3 sm:p-4 cursor-pointer hover:bg-crt-surface transition-colors"
        @click="goToDetail(t.id)"
      >
        <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
          <div class="min-w-0">
            <div class="text-xs text-phosphor font-bold break-words">{{ t.name }}</div>
            <div class="text-[11px] text-phosphor-faint mt-0.5 break-all">{{ t.template_key }}</div>
          </div>
          <div class="flex items-center gap-2 flex-wrap shrink-0">
            <span
              class="border px-2 py-0.5 text-[11px] uppercase"
              :class="t.is_active ? 'border-phosphor-dim text-phosphor-dim' : 'border-hazard text-hazard'"
            >
              {{ t.is_active ? 'ACTIVE' : 'INACTIVE' }}
            </span>
            <span class="border border-crt-border px-2 py-0.5 text-[11px] text-phosphor-faint">
              v{{ t.version }}
            </span>
          </div>
        </div>
        <div class="text-xs text-phosphor-dim mb-2 hidden sm:block">{{ t.description }}</div>
        <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-phosphor-faint uppercase">
          <span>CACHE: {{ t.cache_type.toUpperCase() }}</span>
          <span class="break-all">VARS: {{ t.variables.length ? t.variables.join(', ') : '\u2014' }}</span>
          <span>UPDATED: {{ t.updated_at.slice(0, 10) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
