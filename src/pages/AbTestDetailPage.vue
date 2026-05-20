<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { abTestsApi } from '@/lib/api-abtests'
import Modal from '@/components/Modal.vue'
import SuperadminBadge from '@/components/SuperadminBadge.vue'
import type { ApiError } from '@/lib/api'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useToast()
const queryClient = useQueryClient()

const testId = computed(() => route.params.id as string)

const { data, isLoading } = useQuery({
  queryKey: ['ab-test', testId],
  queryFn: () => abTestsApi.detail(testId.value),
})

const activeModal = ref<string | null>(null)
const actionLoading = ref(false)
const verdictWinner = ref<'a' | 'b' | 'tie'>('a')
const verdictNotes = ref('')

function openModal(name: string) {
  activeModal.value = name
}
function closeModal() {
  activeModal.value = null
  verdictNotes.value = ''
}

async function submitVerdict() {
  actionLoading.value = true
  try {
    const res = await abTestsApi.verdict(testId.value, verdictWinner.value, verdictNotes.value || undefined)
    toast.success(res.message)
    queryClient.invalidateQueries({ queryKey: ['ab-test', testId.value] })
    closeModal()
  } catch (e) {
    toast.error((e as ApiError).message || 'Terjadi kesalahan')
  } finally {
    actionLoading.value = false
  }
}

function statusClass(status: string): string {
  switch (status) {
    case 'completed': return 'text-green-700'
    case 'failed': return 'text-red-600'
    case 'running': return 'text-amber-600'
    case 'pending': return 'text-amber-600'
    default: return 'text-phosphor-faint'
  }
}

function formatCost(usd: number): string {
  return `$${usd.toFixed(4)}`
}

function formatLatency(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}
</script>

<template>
  <div v-if="isLoading" class="text-phosphor-faint text-xs py-8 text-center">>>> LOADING A/B TEST...</div>

  <div v-else-if="!data" class="text-hazard text-xs py-8 text-center">[ A/B TEST NOT FOUND ]</div>

  <div v-else>
    <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
      <div class="min-w-0">
        <button class="text-[11px] text-phosphor-dim hover:text-phosphor mb-2 uppercase min-h-[32px] inline-flex items-center" @click="router.push({ name: 'ab-tests' })">
          &lt;&lt;&lt; BACK TO A/B TESTS
        </button>
        <div class="heading-macro text-xl text-phosphor">A/B TEST</div>
        <div class="text-[11px] text-phosphor-faint mt-1 break-all">/// {{ data.prompt_key }} — v{{ data.version_a }} vs v{{ data.version_b }}</div>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <span class="border px-2 py-0.5 text-[11px] uppercase" :class="[statusClass(data.status), data.status === 'failed' ? 'border-hazard' : 'border-crt-border']">
          [ {{ data.status.toUpperCase() }} ]
        </span>
        <span v-if="data.winner" class="border border-phosphor-dim px-2 py-0.5 text-[11px] text-phosphor uppercase">
          WINNER: {{ data.winner.toUpperCase() }}
        </span>
      </div>
    </div>

    <!-- VERDICT ACTION -->
    <div v-if="auth.isSuperadmin && data.status === 'completed' && !data.winner" class="border-2 border-crt-border p-3 sm:p-4 mb-4">
      <div class="text-[11px] text-phosphor-dim mb-3 uppercase flex items-center">
        [ ACTIONS ]
        <SuperadminBadge />
      </div>
      <button
        class="border border-hazard px-3 text-[11px] text-hazard hover:bg-hazard hover:text-crt transition-colors min-h-[40px] w-full sm:w-auto"
        @click="openModal('verdict')"
      >
        RECORD VERDICT
      </button>
    </div>

    <!-- META -->
    <div class="border-2 border-crt-border p-3 sm:p-4 mb-4">
      <div class="text-[11px] text-phosphor-dim mb-3 uppercase">[ TEST INFO ]</div>
      <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
        <dt class="text-phosphor-faint">ASSESSMENT</dt>
        <dd class="break-all">
          <button class="text-phosphor hover:text-hazard underline text-left" @click="router.push({ name: 'assessment-detail', params: { id: data.assessment_id } })">
            {{ data.assessment_id }}
          </button>
        </dd>
        <dt class="text-phosphor-faint">PROMPT KEY</dt>
        <dd class="break-all">{{ data.prompt_key }}</dd>
        <dt class="text-phosphor-faint">VERSIONS</dt>
        <dd>A = v{{ data.version_a }} / B = v{{ data.version_b }}</dd>
        <dt class="text-phosphor-faint">CREATED BY</dt>
        <dd class="break-all">{{ data.admin_email }}</dd>
        <dt class="text-phosphor-faint">CREATED</dt>
        <dd>{{ data.created_at.slice(0, 16).replace('T', ' ') }}</dd>
        <dt class="text-phosphor-faint">STARTED</dt>
        <dd>{{ data.started_at ? data.started_at.slice(0, 16).replace('T', ' ') : '\u2014' }}</dd>
        <dt class="text-phosphor-faint">COMPLETED</dt>
        <dd>{{ data.completed_at ? data.completed_at.slice(0, 16).replace('T', ' ') : '\u2014' }}</dd>
        <dt v-if="data.notes" class="text-phosphor-faint">NOTES</dt>
        <dd v-if="data.notes" class="break-words">{{ data.notes }}</dd>
      </dl>
    </div>

    <!-- USAGE COMPARISON -->
    <div v-if="data.usage_a || data.usage_b" class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
      <div class="border-2 border-crt-border p-3 sm:p-4">
        <div class="text-[11px] text-phosphor-dim mb-3 uppercase">[ USAGE A — v{{ data.version_a }} ]</div>
        <dl v-if="data.usage_a" class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
          <dt class="text-phosphor-faint">PROMPT TOKENS</dt>
          <dd>{{ data.usage_a.prompt_tokens.toLocaleString() }}</dd>
          <dt class="text-phosphor-faint">COMPLETION TOKENS</dt>
          <dd>{{ data.usage_a.completion_tokens.toLocaleString() }}</dd>
          <dt class="text-phosphor-faint">TOTAL TOKENS</dt>
          <dd>{{ data.usage_a.total_tokens.toLocaleString() }}</dd>
          <dt class="text-phosphor-faint">LATENCY</dt>
          <dd>{{ formatLatency(data.usage_a.latency_ms) }}</dd>
          <dt class="text-phosphor-faint">COST</dt>
          <dd>{{ formatCost(data.usage_a.estimated_cost_usd) }}</dd>
        </dl>
        <div v-else class="text-xs text-phosphor-faint">/// PENDING</div>
      </div>
      <div class="border-2 border-crt-border p-3 sm:p-4">
        <div class="text-[11px] text-phosphor-dim mb-3 uppercase">[ USAGE B — v{{ data.version_b }} ]</div>
        <dl v-if="data.usage_b" class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
          <dt class="text-phosphor-faint">PROMPT TOKENS</dt>
          <dd>{{ data.usage_b.prompt_tokens.toLocaleString() }}</dd>
          <dt class="text-phosphor-faint">COMPLETION TOKENS</dt>
          <dd>{{ data.usage_b.completion_tokens.toLocaleString() }}</dd>
          <dt class="text-phosphor-faint">TOTAL TOKENS</dt>
          <dd>{{ data.usage_b.total_tokens.toLocaleString() }}</dd>
          <dt class="text-phosphor-faint">LATENCY</dt>
          <dd>{{ formatLatency(data.usage_b.latency_ms) }}</dd>
          <dt class="text-phosphor-faint">COST</dt>
          <dd>{{ formatCost(data.usage_b.estimated_cost_usd) }}</dd>
        </dl>
        <div v-else class="text-xs text-phosphor-faint">/// PENDING</div>
      </div>
    </div>

    <!-- PROMPT CONTENT COMPARISON -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
      <div class="border-2 border-crt-border p-3 sm:p-4">
        <div class="text-[11px] text-phosphor-dim mb-3 uppercase">[ PROMPT A — v{{ data.version_a }} ]</div>
        <pre class="text-xs text-phosphor whitespace-pre-wrap leading-relaxed bg-crt-surface p-3 border border-crt-border overflow-x-auto max-h-64 break-words">{{ data.prompt_a_content }}</pre>
      </div>
      <div class="border-2 border-crt-border p-3 sm:p-4">
        <div class="text-[11px] text-phosphor-dim mb-3 uppercase">[ PROMPT B — v{{ data.version_b }} ]</div>
        <pre class="text-xs text-phosphor whitespace-pre-wrap leading-relaxed bg-crt-surface p-3 border border-crt-border overflow-x-auto max-h-64 break-words">{{ data.prompt_b_content }}</pre>
      </div>
    </div>

    <!-- RESULT COMPARISON -->
    <div v-if="data.result_a || data.result_b" class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
      <div class="border-2 border-crt-border p-3 sm:p-4">
        <div class="text-[11px] text-phosphor-dim mb-3 uppercase">[ RESULT A ]</div>
        <pre v-if="data.result_a" class="text-xs text-phosphor whitespace-pre-wrap leading-relaxed bg-crt-surface p-3 border border-crt-border overflow-x-auto max-h-64 break-words">{{ JSON.stringify(data.result_a, null, 2) }}</pre>
        <div v-else class="text-xs text-phosphor-faint">/// PENDING</div>
      </div>
      <div class="border-2 border-crt-border p-3 sm:p-4">
        <div class="text-[11px] text-phosphor-dim mb-3 uppercase">[ RESULT B ]</div>
        <pre v-if="data.result_b" class="text-xs text-phosphor whitespace-pre-wrap leading-relaxed bg-crt-surface p-3 border border-crt-border overflow-x-auto max-h-64 break-words">{{ JSON.stringify(data.result_b, null, 2) }}</pre>
        <div v-else class="text-xs text-phosphor-faint">/// PENDING</div>
      </div>
    </div>

    <!-- VERDICT MODAL -->
    <Modal :open="activeModal === 'verdict'" title="RECORD VERDICT" @close="closeModal">
      <div class="space-y-3">
        <div>
          <label class="block text-[11px] text-phosphor-faint mb-1 uppercase">WINNER</label>
          <select
            v-model="verdictWinner"
            class="w-full bg-crt-surface border border-crt-border px-2 py-2 text-base sm:text-xs text-phosphor focus:outline-none focus:border-hazard min-h-[44px] sm:min-h-0"
          >
            <option value="a">A (v{{ data.version_a }})</option>
            <option value="b">B (v{{ data.version_b }})</option>
            <option value="tie">TIE</option>
          </select>
        </div>
        <div>
          <label class="block text-[11px] text-phosphor-faint mb-1 uppercase">NOTES (optional)</label>
          <textarea
            v-model="verdictNotes"
            rows="3"
            class="w-full bg-crt-surface border border-crt-border px-2 py-2 text-base sm:text-xs text-phosphor focus:outline-none focus:border-hazard resize-y"
            placeholder="Reasoning for this verdict..."
          ></textarea>
        </div>
        <div class="flex flex-col sm:flex-row gap-2">
          <button
            class="border border-hazard px-3 text-[11px] text-hazard hover:bg-hazard hover:text-crt transition-colors min-h-[40px] w-full sm:w-auto"
            :disabled="actionLoading"
            @click="submitVerdict"
          >
            [ SUBMIT ]
          </button>
          <button class="border border-crt-border px-3 text-[11px] text-phosphor-dim min-h-[40px] w-full sm:w-auto" @click="closeModal">
            [ CANCEL ]
          </button>
        </div>
      </div>
    </Modal>
  </div>
</template>
