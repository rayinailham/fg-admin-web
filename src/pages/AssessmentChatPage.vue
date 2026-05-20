<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { assessmentsApi } from '@/lib/api-assessments'

const route = useRoute()
const router = useRouter()

const assessmentId = computed(() => route.params.id as string)

const { data, isLoading, isError } = useQuery({
  queryKey: ['assessment-chat', assessmentId],
  queryFn: () => assessmentsApi.chat(assessmentId.value),
})

const session = computed(() => data.value?.session)
const messages = computed(() => data.value?.messages ?? [])

function formatTime(iso: string): string {
  return iso.slice(11, 16)
}
</script>

<template>
  <div v-if="isLoading" class="text-phosphor-faint text-xs py-8 text-center">>>> LOADING CHAT DATA...</div>

  <div v-else-if="isError" class="text-hazard text-xs py-8 text-center">[ FAILED TO LOAD CHAT ]</div>

  <div v-else>
    <div class="mb-6">
      <button class="text-[11px] text-phosphor-dim hover:text-phosphor mb-2 uppercase min-h-[32px] inline-flex items-center" @click="router.push({ name: 'assessment-detail', params: { id: assessmentId } })">
        &lt;&lt;&lt; BACK TO ASSESSMENT
      </button>
      <div class="heading-macro text-xl text-phosphor">CHAT HISTORY</div>
      <div class="text-[11px] text-phosphor-faint mt-1 break-all">/// ASSESSMENT {{ assessmentId }}</div>
    </div>

    <!-- SESSION META -->
    <div class="border-2 border-crt-border p-3 sm:p-4 mb-4" v-if="session">
      <div class="text-[11px] text-phosphor-dim mb-3 uppercase">[ SESSION INFO ]</div>
      <dl class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-2 text-xs">
        <div class="flex flex-col">
          <dt class="text-phosphor-faint uppercase">SESSION ID</dt>
          <dd class="text-phosphor break-all">{{ session.id }}</dd>
        </div>
        <div class="flex flex-col">
          <dt class="text-phosphor-faint uppercase">MODEL</dt>
          <dd class="break-all">{{ session.model_used }}</dd>
        </div>
        <div class="flex flex-col">
          <dt class="text-phosphor-faint uppercase">MESSAGES</dt>
          <dd>{{ session.message_count }}</dd>
        </div>
        <div class="flex flex-col">
          <dt class="text-phosphor-faint uppercase">CREATED</dt>
          <dd>{{ session.created_at.slice(0, 16).replace('T', ' ') }}</dd>
        </div>
      </dl>
    </div>

    <!-- MESSAGES -->
    <div class="border-2 border-crt-border">
      <div class="p-3 border-b-2 border-crt-border bg-crt-surface">
        <div class="text-[11px] text-phosphor-dim uppercase">[ MESSAGES: {{ messages.length }} ]</div>
      </div>

      <div v-if="messages.length === 0" class="px-3 py-8 text-center text-phosphor-faint text-xs">
        [ NO MESSAGES ]
      </div>

      <div v-else class="divide-y divide-crt-border">
        <div
          v-for="msg in messages"
          :key="msg.id"
          class="p-3 sm:p-4"
          :class="msg.role === 'assistant' ? 'bg-crt-surface' : ''"
        >
          <div class="flex items-center justify-between mb-2 gap-2 flex-wrap">
            <div class="flex items-center gap-2">
              <span
                class="text-[11px] border px-1.5 py-0.5 uppercase"
                :class="msg.role === 'user' ? 'border-phosphor-dim text-phosphor-dim' : 'border-hazard text-hazard'"
              >
                {{ msg.role.toUpperCase() }}
              </span>
              <span class="text-[11px] text-phosphor-faint">{{ formatTime(msg.created_at) }}</span>
            </div>
            <span v-if="msg.token_count" class="text-[11px] text-phosphor-faint">
              {{ msg.token_count }} tokens
            </span>
          </div>
          <div class="text-xs sm:text-sm text-phosphor whitespace-pre-wrap leading-relaxed break-words">{{ msg.content }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
