<script setup lang="ts">
import { ref, computed } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { useRateLimit } from '@/composables/useRateLimit'
import { monitoringApi } from '@/lib/api-monitoring'
import Modal from '@/components/Modal.vue'
import SuperadminBadge from '@/components/SuperadminBadge.vue'
import type { ApiError } from '@/lib/api'

const auth = useAuthStore()
const toast = useToast()
const queryClient = useQueryClient()
const { remaining: rateLimitRemaining, limit: rateLimitTotal } = useRateLimit()

const { data, isLoading, dataUpdatedAt } = useQuery({
  queryKey: ['monitoring'],
  queryFn: () => monitoringApi.status(),
  refetchInterval: 30000,
})

const lastRefresh = computed(() => {
  if (!dataUpdatedAt.value) return '\u2014'
  return new Date(dataUpdatedAt.value).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
})

const refreshCooldown = ref(false)
function manualRefresh() {
  if (refreshCooldown.value) return
  queryClient.invalidateQueries({ queryKey: ['monitoring'] })
  refreshCooldown.value = true
  setTimeout(() => { refreshCooldown.value = false }, 5000)
}

const activeModal = ref<string | null>(null)
const actionLoading = ref(false)
const maintenanceReason = ref('')

function openModal(name: string) {
  activeModal.value = name
}
function closeModal() {
  activeModal.value = null
  maintenanceReason.value = ''
}

async function toggleMaintenance() {
  if (!data.value) return
  actionLoading.value = true
  try {
    const newState = !data.value.maintenance_mode
    const res = await monitoringApi.toggleMaintenance(newState, maintenanceReason.value || 'Admin toggle')
    toast.success(res.message)
    queryClient.invalidateQueries({ queryKey: ['monitoring'] })
    closeModal()
  } catch (e) {
    toast.error((e as ApiError).message || 'Terjadi kesalahan')
  } finally {
    actionLoading.value = false
  }
}

const workerCooldown = ref(false)
async function restartWorker() {
  if (workerCooldown.value) return
  actionLoading.value = true
  try {
    const res = await monitoringApi.restartWorker()
    toast.success(res.message)
    workerCooldown.value = true
    setTimeout(() => { workerCooldown.value = false }, 60000)
    closeModal()
  } catch (e) {
    toast.error((e as ApiError).message || 'Terjadi kesalahan')
  } finally {
    actionLoading.value = false
  }
}

function statusIndicator(status: string): string {
  switch (status) {
    case 'healthy': return 'text-green-700'
    case 'unhealthy': return 'text-red-600'
    case 'timeout': return 'text-red-600'
    default: return 'text-phosphor-faint'
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  if (days > 0) return `${days}d ${hours}h`
  const mins = Math.floor((seconds % 3600) / 60)
  return `${hours}h ${mins}m`
}
</script>

<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
      <div>
        <div class="heading-macro text-xl text-phosphor mb-1">MONITORING</div>
        <div class="text-[11px] text-phosphor-faint uppercase">/// INFRASTRUCTURE HEALTH & STATUS</div>
      </div>
      <div class="flex items-center gap-3 flex-wrap">
        <span v-if="rateLimitRemaining !== null" class="text-[11px] uppercase" :class="rateLimitRemaining < 10 ? 'text-hazard' : 'text-phosphor-faint'">
          RATE: {{ rateLimitRemaining }}{{ rateLimitTotal ? `/${rateLimitTotal}` : '' }}
        </span>
        <span class="text-[11px] text-phosphor-faint uppercase">LAST: {{ lastRefresh }}</span>
        <button
          class="border border-crt-border px-3 text-[11px] text-phosphor-dim hover:text-phosphor hover:border-phosphor-dim transition-colors disabled:opacity-30 disabled:cursor-not-allowed min-h-[36px]"
          :disabled="refreshCooldown"
          @click="manualRefresh"
        >
          [ REFRESH ]
        </button>
      </div>
    </div>

    <div v-if="isLoading" class="text-phosphor-faint text-xs py-8 text-center">>>> LOADING MONITORING DATA...</div>

    <template v-else-if="data">
      <!-- MAINTENANCE BANNER -->
      <div v-if="data.maintenance_mode" class="border-2 border-hazard p-3 mb-4 text-center">
        <span class="text-[11px] text-hazard">[ MAINTENANCE MODE ACTIVE ]</span>
      </div>

      <!-- ACTIONS (superadmin) -->
      <div v-if="auth.isSuperadmin" class="border-2 border-crt-border p-3 sm:p-4 mb-4">
        <div class="text-[11px] text-phosphor-dim mb-3 uppercase flex items-center">
          [ ACTIONS ]
          <SuperadminBadge />
        </div>
        <div class="flex flex-col sm:flex-row flex-wrap gap-2">
          <button
            class="border px-3 text-[11px] transition-colors min-h-[40px] w-full sm:w-auto"
            :class="data.maintenance_mode ? 'border-crt-border text-phosphor-dim hover:text-phosphor hover:border-phosphor-dim' : 'border-hazard text-hazard hover:bg-hazard hover:text-crt'"
            @click="openModal('maintenance')"
          >
            {{ data.maintenance_mode ? 'DISABLE MAINTENANCE' : 'ENABLE MAINTENANCE' }}
          </button>
          <button
            class="border border-crt-border px-3 text-[11px] text-phosphor-dim hover:text-phosphor hover:border-phosphor-dim transition-colors disabled:opacity-30 disabled:cursor-not-allowed min-h-[40px] w-full sm:w-auto"
            :disabled="workerCooldown"
            @click="openModal('restart-worker')"
          >
            RESTART WORKER{{ workerCooldown ? ' (COOLDOWN)' : '' }}
          </button>
        </div>
      </div>

      <!-- POSTGRES + REDIS -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div class="border-2 border-crt-border p-3 sm:p-4">
          <div class="flex items-center justify-between mb-3 gap-2 flex-wrap">
            <div class="text-[11px] text-phosphor-dim uppercase">[ POSTGRES ]</div>
            <span class="text-[11px] uppercase" :class="statusIndicator(data.postgres.status)">{{ data.postgres.status.toUpperCase() }}</span>
          </div>
          <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
            <dt class="text-phosphor-faint">CONNECTIONS</dt>
            <dd>{{ data.postgres.active_connections }} / {{ data.postgres.max_connections }}</dd>
            <dt class="text-phosphor-faint">POOL</dt>
            <dd>{{ data.postgres.pool_in_use }} in use / {{ data.postgres.pool_idle }} idle / {{ data.postgres.pool_total }} total</dd>
            <dt class="text-phosphor-faint">DB SIZE</dt>
            <dd>{{ formatBytes(data.postgres.db_size_bytes) }}</dd>
            <dt class="text-phosphor-faint">OUTBOX UNPUBLISHED</dt>
            <dd :class="data.postgres.outbox_unpublished > 0 ? 'text-hazard' : ''">{{ data.postgres.outbox_unpublished }}</dd>
            <dt class="text-phosphor-faint">OUTBOX STUCK</dt>
            <dd :class="data.postgres.outbox_stuck > 0 ? 'text-hazard' : ''">{{ data.postgres.outbox_stuck }}</dd>
          </dl>
        </div>

        <div class="border-2 border-crt-border p-3 sm:p-4">
          <div class="flex items-center justify-between mb-3 gap-2 flex-wrap">
            <div class="text-[11px] text-phosphor-dim uppercase">[ REDIS ]</div>
            <span class="text-[11px] uppercase" :class="statusIndicator(data.redis.status)">{{ data.redis.status.toUpperCase() }}</span>
          </div>
          <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
            <dt class="text-phosphor-faint">MEMORY</dt>
            <dd>{{ data.redis.used_memory_mb.toFixed(1) }} MB</dd>
            <dt class="text-phosphor-faint">CLIENTS</dt>
            <dd>{{ data.redis.connected_clients }}</dd>
            <dt class="text-phosphor-faint">PUBSUB CHANNELS</dt>
            <dd>{{ data.redis.pubsub_channels }}</dd>
            <dt class="text-phosphor-faint">UPTIME</dt>
            <dd>{{ formatUptime(data.redis.uptime_seconds) }}</dd>
          </dl>
        </div>
      </div>

      <!-- QUEUE -->
      <div class="border-2 border-crt-border p-3 sm:p-4 mb-4">
        <div class="text-[11px] text-phosphor-dim mb-3 uppercase">[ QUEUE ]</div>
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <div class="text-phosphor-faint text-[11px] uppercase">PENDING</div>
            <div class="text-lg text-phosphor">{{ data.queue.pending }}</div>
          </div>
          <div>
            <div class="text-phosphor-faint text-[11px] uppercase">ACTIVE</div>
            <div class="text-lg text-phosphor">{{ data.queue.active }}</div>
          </div>
          <div>
            <div class="text-phosphor-faint text-[11px] uppercase">DLQ</div>
            <div class="text-lg" :class="data.queue.dlq > 0 ? 'text-hazard' : 'text-phosphor'">{{ data.queue.dlq }}</div>
          </div>
          <div>
            <div class="text-phosphor-faint text-[11px] uppercase">STALE CLAIMS</div>
            <div class="text-lg" :class="data.queue.stale_claims > 0 ? 'text-hazard' : 'text-phosphor'">{{ data.queue.stale_claims }}</div>
          </div>
        </div>
      </div>

      <!-- SERVICES + TUNNEL -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div class="border-2 border-crt-border p-3 sm:p-4">
          <div class="text-[11px] text-phosphor-dim mb-3 uppercase">[ SERVICES ]</div>
          <div v-if="Object.keys(data.services).length === 0" class="text-xs text-phosphor-faint">[ NO SERVICES ]</div>
          <div v-else class="space-y-2">
            <div v-for="(check, name) in data.services" :key="name" class="flex items-center justify-between gap-2 text-xs">
              <span class="text-phosphor truncate min-w-0">{{ String(name).toUpperCase() }}</span>
              <div class="flex items-center gap-2 shrink-0">
                <span v-if="check.latency" class="text-phosphor-faint text-[11px]">{{ check.latency }}</span>
                <span :class="statusIndicator(check.status)" class="text-[11px] uppercase">{{ check.status.toUpperCase() }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="border-2 border-crt-border p-3 sm:p-4">
          <div class="text-[11px] text-phosphor-dim mb-3 uppercase">[ TUNNELS ]</div>
          <div v-if="Object.keys(data.tunnel).length === 0" class="text-xs text-phosphor-faint">[ NO TUNNELS ]</div>
          <div v-else class="space-y-2">
            <div v-for="(check, name) in data.tunnel" :key="name" class="flex items-center justify-between gap-2 text-xs flex-wrap">
              <span class="text-phosphor truncate min-w-0">{{ String(name).toUpperCase() }}</span>
              <div class="flex items-center gap-2 flex-wrap justify-end">
                <span v-if="check.latency" class="text-phosphor-faint text-[11px]">{{ check.latency }}</span>
                <span v-if="check.error" class="text-hazard text-[11px]">{{ check.error }}</span>
                <span :class="statusIndicator(check.status)" class="text-[11px] uppercase">{{ check.status.toUpperCase() }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- WORKERS -->
      <div class="border-2 border-crt-border p-3 sm:p-4 mb-4">
        <div class="text-[11px] text-phosphor-dim mb-3 uppercase">[ WORKERS ]</div>
        <div v-if="data.workers.length === 0" class="text-xs text-phosphor-faint text-center py-2">[ NO ACTIVE WORKERS ]</div>
        <div v-else class="space-y-1">
          <div v-for="w in data.workers" :key="w.worker_id" class="flex items-center justify-between gap-2 text-xs">
            <span class="text-phosphor truncate min-w-0">{{ w.worker_id }}</span>
            <span class="text-phosphor-faint shrink-0">TTL: {{ w.ttl_seconds }}s</span>
          </div>
        </div>
      </div>

      <!-- TIMESTAMP -->
      <div class="text-[11px] text-phosphor-faint text-right uppercase">
        SNAPSHOT: {{ data.timestamp.slice(0, 19).replace('T', ' ') }} UTC
      </div>
    </template>

    <!-- MODALS -->
    <Modal :open="activeModal === 'maintenance'" title="TOGGLE MAINTENANCE MODE" @close="closeModal">
      <p class="text-xs text-phosphor mb-3">
        {{ data?.maintenance_mode ? 'Disable maintenance mode? User-facing services will resume.' : 'Enable maintenance mode? User-facing services will be blocked.' }}
      </p>
      <div class="mb-4">
        <label class="block text-[11px] text-phosphor-faint mb-1 uppercase">REASON</label>
        <input
          v-model="maintenanceReason"
          class="w-full bg-crt-surface border border-crt-border px-2 py-2 text-base sm:text-xs text-phosphor focus:outline-none focus:border-hazard min-h-[44px] sm:min-h-0"
          placeholder="Optional reason..."
        />
      </div>
      <div class="flex flex-col sm:flex-row gap-2">
        <button
          class="border border-hazard px-3 text-[11px] text-hazard hover:bg-hazard hover:text-crt transition-colors min-h-[40px] w-full sm:w-auto"
          :disabled="actionLoading"
          @click="toggleMaintenance"
        >
          [ CONFIRM ]
        </button>
        <button class="border border-crt-border px-3 text-[11px] text-phosphor-dim min-h-[40px] w-full sm:w-auto" @click="closeModal">
          [ CANCEL ]
        </button>
      </div>
    </Modal>

    <Modal :open="activeModal === 'restart-worker'" title="RESTART WORKER" @close="closeModal">
      <p class="text-xs text-phosphor mb-4">Send restart signal to analysis worker? 60s cooldown applies.</p>
      <div class="flex flex-col sm:flex-row gap-2">
        <button
          class="border border-hazard px-3 text-[11px] text-hazard hover:bg-hazard hover:text-crt transition-colors min-h-[40px] w-full sm:w-auto"
          :disabled="actionLoading"
          @click="restartWorker"
        >
          [ RESTART ]
        </button>
        <button class="border border-crt-border px-3 text-[11px] text-phosphor-dim min-h-[40px] w-full sm:w-auto" @click="closeModal">
          [ CANCEL ]
        </button>
      </div>
    </Modal>
  </div>
</template>
