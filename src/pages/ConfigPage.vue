<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { configApi, type ConfigEntry } from '@/lib/api-config'
import Modal from '@/components/Modal.vue'
import SuperadminBadge from '@/components/SuperadminBadge.vue'
import type { ApiError } from '@/lib/api'

const auth = useAuthStore()
const toast = useToast()
const queryClient = useQueryClient()

const { data, isLoading } = useQuery({
  queryKey: ['config'],
  queryFn: () => configApi.list(),
})

const categories = computed(() => {
  if (!data.value) return []
  return Object.keys(data.value.config)
})

const activeTab = ref('')

const activeEntries = computed(() => {
  if (!data.value || !activeTab.value) return []
  return data.value.config[activeTab.value] ?? []
})

watch(categories, (cats) => {
  if (cats.length > 0 && !activeTab.value) {
    activeTab.value = cats[0]!
  }
}, { immediate: true })

const activeModal = ref<string | null>(null)
const actionLoading = ref(false)

// Edit state
const editKey = ref('')
const editValue = ref('')
const editReason = ref('')
const editDescription = ref('')
const editValueType = ref('')

// Audit state
const auditKey = ref('')
const auditData = ref<{ key: string; audit: { id: number; old_value: string; new_value: string; changed_by: string; changed_at: string; reason: string }[] } | null>(null)
const auditLoading = ref(false)

function openEdit(entry: ConfigEntry) {
  editKey.value = entry.key
  editValue.value = entry.value
  editReason.value = ''
  editDescription.value = entry.description
  editValueType.value = entry.value_type
  activeModal.value = 'edit'
}

async function openAudit(key: string) {
  auditKey.value = key
  auditData.value = null
  auditLoading.value = true
  activeModal.value = 'audit'
  try {
    auditData.value = await configApi.audit(key)
  } catch (e) {
    toast.error((e as ApiError).message || 'Terjadi kesalahan')
  } finally {
    auditLoading.value = false
  }
}

function closeModal() {
  activeModal.value = null
}

async function handleUpdate() {
  actionLoading.value = true
  try {
    const res = await configApi.update(editKey.value, editValue.value, editReason.value)
    toast.success(`Config updated: ${res.key}`)
    if (res.restart_warning) toast.error(res.restart_warning)
    queryClient.invalidateQueries({ queryKey: ['config'] })
    closeModal()
  } catch (e) {
    toast.error((e as ApiError).message || 'Terjadi kesalahan')
  } finally {
    actionLoading.value = false
  }
}

async function handleReload() {
  actionLoading.value = true
  try {
    const res = await configApi.reload()
    toast.success(res.message)
    queryClient.invalidateQueries({ queryKey: ['config'] })
  } catch (e) {
    toast.error((e as ApiError).message || 'Terjadi kesalahan')
  } finally {
    actionLoading.value = false
  }
}
</script>

<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4 sm:mb-6">
      <div>
        <div class="heading-macro text-xl text-phosphor mb-1">CONFIG</div>
        <div class="text-[11px] text-phosphor-faint uppercase">/// RUNTIME CONFIGURATION</div>
      </div>
      <button
        v-if="auth.isSuperadmin"
        class="border border-crt-border px-3 text-[11px] text-phosphor-dim hover:text-phosphor hover:border-phosphor-dim transition-colors inline-flex items-center justify-center min-h-[40px] w-full sm:w-auto"
        :disabled="actionLoading"
        @click="handleReload"
      >
        [ RELOAD CONFIG ]
        <SuperadminBadge />
      </button>
    </div>

    <div v-if="isLoading" class="text-phosphor-faint text-xs py-8 text-center">>>> LOADING CONFIG...</div>

    <template v-else-if="data">
      <div v-if="categories.length === 0" class="border-2 border-crt-border p-6 text-center text-phosphor-faint text-xs">
        [ NO CONFIG ENTRIES ]
      </div>

      <div v-else>
        <!-- TAB BAR -->
        <div class="flex flex-wrap border-b-2 border-crt-border mb-4 -mx-1">
          <button
            v-for="cat in categories"
            :key="cat"
            class="px-3 sm:px-4 text-[11px] uppercase transition-colors border-b-2 -mb-[2px] mx-1 min-h-[40px]"
            :class="activeTab === cat
              ? 'border-hazard text-hazard'
              : 'border-transparent text-phosphor-dim hover:text-phosphor'"
            @click="activeTab = cat"
          >
            {{ cat }}
          </button>
        </div>

        <!-- TAB CONTENT -->
        <div class="space-y-2">
          <div
            v-for="entry in activeEntries"
            :key="entry.key"
            class="border border-crt-border p-3"
          >
            <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-1">
              <div class="min-w-0">
                <div class="text-xs text-phosphor font-bold break-all">{{ entry.key }}</div>
                <div class="text-[11px] text-phosphor-faint break-words">{{ entry.description }}</div>
              </div>
              <div class="flex gap-1 flex-wrap shrink-0">
                <button
                  class="border border-crt-border px-2 text-[11px] text-phosphor-faint hover:text-phosphor hover:border-phosphor-dim transition-colors uppercase min-h-[32px]"
                  @click="openAudit(entry.key)"
                >
                  AUDIT
                </button>
                <button
                  v-if="auth.isSuperadmin"
                  class="border border-crt-border px-2 text-[11px] text-phosphor-faint hover:text-phosphor hover:border-phosphor-dim transition-colors uppercase inline-flex items-center min-h-[32px]"
                  @click="openEdit(entry)"
                >
                  EDIT
                  <SuperadminBadge />
                </button>
              </div>
            </div>
            <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 text-xs mt-2">
              <dt class="text-phosphor-faint">VALUE</dt>
              <dd class="break-all">{{ entry.value }}</dd>
              <dt class="text-phosphor-faint">TYPE</dt>
              <dd>{{ entry.value_type }}</dd>
              <dt class="text-phosphor-faint">UPDATED</dt>
              <dd>{{ entry.updated_at.slice(0, 16).replace('T', ' ') }}</dd>
              <dt class="text-phosphor-faint">BY</dt>
              <dd class="break-all">{{ entry.updated_by || '\u2014' }}</dd>
            </dl>
          </div>
        </div>
      </div>
    </template>

    <!-- EDIT MODAL -->
    <Modal :open="activeModal === 'edit'" title="EDIT CONFIG" @close="closeModal">
      <div class="space-y-3">
        <div class="text-xs text-phosphor-dim mb-2 break-all">{{ editKey }} ({{ editValueType }})</div>
        <div>
          <label class="block text-[11px] text-phosphor-faint mb-1 uppercase">VALUE</label>
          <input
            v-model="editValue"
            class="w-full bg-crt-surface border border-crt-border px-2 py-2 text-base sm:text-xs text-phosphor focus:outline-none focus:border-hazard min-h-[44px] sm:min-h-0"
          />
        </div>
        <div>
          <label class="block text-[11px] text-phosphor-faint mb-1 uppercase">REASON</label>
          <input
            v-model="editReason"
            class="w-full bg-crt-surface border border-crt-border px-2 py-2 text-base sm:text-xs text-phosphor focus:outline-none focus:border-hazard min-h-[44px] sm:min-h-0"
            placeholder="Reason for change..."
          />
        </div>
        <div class="flex flex-col sm:flex-row gap-2">
          <button
            class="border border-hazard px-3 text-[11px] text-hazard hover:bg-hazard hover:text-crt transition-colors min-h-[40px] w-full sm:w-auto"
            :disabled="actionLoading || !editValue || !editReason"
            @click="handleUpdate"
          >
            [ SAVE ]
          </button>
          <button class="border border-crt-border px-3 text-[11px] text-phosphor-dim min-h-[40px] w-full sm:w-auto" @click="closeModal">
            [ CANCEL ]
          </button>
        </div>
      </div>
    </Modal>

    <!-- AUDIT MODAL -->
    <Modal :open="activeModal === 'audit'" title="AUDIT LOG" @close="closeModal">
      <div class="text-xs text-phosphor-dim mb-3 break-all">{{ auditKey }}</div>
      <div v-if="auditLoading" class="text-xs text-phosphor-faint py-4 text-center">>>> LOADING...</div>
      <div v-else-if="!auditData?.audit.length" class="text-xs text-phosphor-faint py-4 text-center">[ NO AUDIT HISTORY ]</div>
      <div v-else class="space-y-2 max-h-64 overflow-y-auto">
        <div v-for="entry in auditData.audit" :key="entry.id" class="border border-crt-border p-2">
          <div class="flex items-center justify-between gap-2 text-[11px] text-phosphor-faint mb-1 flex-wrap">
            <span class="break-all">{{ entry.changed_by || '\u2014' }}</span>
            <span>{{ entry.changed_at.slice(0, 16).replace('T', ' ') }}</span>
          </div>
          <div class="text-xs break-all">
            <span class="text-phosphor-faint">{{ entry.old_value }}</span>
            <span class="text-phosphor-dim mx-1">&rarr;</span>
            <span class="text-phosphor">{{ entry.new_value }}</span>
          </div>
          <div v-if="entry.reason" class="text-[11px] text-phosphor-faint mt-1 break-words">/// {{ entry.reason }}</div>
        </div>
      </div>
    </Modal>
  </div>
</template>
