<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { useCursorPagination } from '@/composables/useCursorPagination'
import { usersApi } from '@/lib/api-users'
import DataTable from '@/components/DataTable.vue'
import Modal from '@/components/Modal.vue'
import SuperadminBadge from '@/components/SuperadminBadge.vue'
import UserEditModal from '@/components/users/UserEditModal.vue'
import TokenModal from '@/components/users/TokenModal.vue'
import ResetPasswordModal from '@/components/users/ResetPasswordModal.vue'
import type { ApiError } from '@/lib/api'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useToast()
const queryClient = useQueryClient()

const userId = computed(() => route.params.id as string)

const { data, isLoading } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => usersApi.detail(userId.value),
})

const user = computed(() => data.value?.user)
const stats = computed(() => data.value?.stats)

const activeModal = ref<string | null>(null)
const actionLoading = ref(false)

function openModal(name: string) {
  activeModal.value = name
}

function closeModal() {
  activeModal.value = null
}

function invalidateUserQueries() {
  queryClient.invalidateQueries({ queryKey: ['user', userId.value] })
  queryClient.invalidateQueries({ queryKey: ['user-transactions', userId.value] })
  queryClient.invalidateQueries({ queryKey: ['users'] })
}

async function handleAction(action: () => Promise<{ message: string }>, successMsg?: string) {
  actionLoading.value = true
  try {
    const res = await action()
    toast.success(successMsg || res.message)
    invalidateUserQueries()
    closeModal()
  } catch (e) {
    toast.error((e as ApiError).message || 'Terjadi kesalahan')
  } finally {
    actionLoading.value = false
  }
}

async function verifyEmail() {
  await handleAction(() => usersApi.verifyEmail(userId.value))
}

async function suspend() {
  await handleAction(() => usersApi.suspend(userId.value))
}

async function unsuspend() {
  await handleAction(() => usersApi.unsuspend(userId.value))
}

async function revokeSessions() {
  await handleAction(() => usersApi.revokeSessions(userId.value))
}

const assessmentColumns = [
  {
    key: 'status', label: 'STATUS', class: 'w-24',
    cellClass: (v: unknown) => {
      switch (v as string) {
        case 'completed': return 'text-green-700 font-medium'
        case 'failed': return 'text-red-600 font-medium'
        case 'processing':
        case 'queued':
        case 'pending': return 'text-amber-600 font-medium'
        default: return ''
      }
    },
  },
  { key: 'submitted_at', label: 'SUBMITTED', format: (v: unknown) => (v as string).slice(0, 16).replace('T', ' ') },
  { key: 'completed_at', label: 'COMPLETED', hideOnMobile: true, format: (v: unknown) => v ? (v as string).slice(0, 16).replace('T', ' ') : '\u2014' },
  { key: 'model_used', label: 'MODEL', hideOnMobile: true, format: (v: unknown) => (v as string) || '\u2014' },
]

const chatColumns = [
  { key: 'title', label: 'TITLE', format: (v: unknown) => (v as string) || '\u2014' },
  { key: 'model_used', label: 'MODEL', hideOnMobile: true },
  { key: 'message_count', label: 'MSGS', class: 'w-16 text-right' },
  { key: 'last_message_at', label: 'LAST MSG', hideOnMobile: true, format: (v: unknown) => v ? (v as string).slice(0, 16).replace('T', ' ') : '\u2014' },
]

const txColumns = [
  { key: 'transaction_type', label: 'TYPE', class: 'w-32' },
  {
    key: 'amount', label: 'AMT', class: 'w-16 text-right font-medium',
    format: (v: unknown) => (v as number) > 0 ? `+${v}` : String(v),
    cellClass: (v: unknown) => (v as number) > 0 ? 'text-green-700' : (v as number) < 0 ? 'text-red-600' : 'text-phosphor-faint',
  },
  {
    key: 'balance_after', label: 'BAL', class: 'w-16 text-right', hideOnMobile: true,
    cellClass: (v: unknown) => (v as number) > 0 ? 'text-amber-600' : 'text-phosphor-faint',
  },
  { key: 'description', label: 'DESCRIPTION', hideOnMobile: true },
  { key: 'created_at', label: 'DATE', class: 'w-36', hideOnMobile: true, format: (v: unknown) => (v as string).slice(0, 16).replace('T', ' ') },
]

function goToAssessment(row: Record<string, unknown>) {
  router.push({ name: 'assessment-detail', params: { id: row.id as string } })
}

function goToChat(row: Record<string, unknown>) {
  router.push({ name: 'assessment-chat', params: { id: row.assessment_id as string } })
}

// Full transaction history
const showAllTransactions = ref(false)
const txFilterType = ref<string | undefined>(undefined)
const txPagination = useCursorPagination()

const { data: txData, isLoading: txLoading } = useQuery({
  queryKey: computed(() => ['user-transactions', userId.value, txPagination.currentCursor.value, txFilterType.value]),
  queryFn: () => usersApi.transactions(userId.value, txPagination.currentCursor.value, txFilterType.value),
  enabled: showAllTransactions,
})

watch(() => txData.value, (val) => {
  if (val) txPagination.setNextCursor(val.next_cursor)
})

function openAllTransactions() {
  showAllTransactions.value = true
  txPagination.reset()
}

function changeTxFilter(type: string | undefined) {
  txFilterType.value = type
  txPagination.reset()
}
</script>

<template>
  <div v-if="isLoading" class="text-phosphor-faint text-xs py-8 text-center">>>> LOADING USER DATA...</div>

  <div v-else-if="!user" class="text-hazard text-xs py-8 text-center">[ USER NOT FOUND ]</div>

  <div v-else>
    <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
      <div class="min-w-0">
        <button class="text-[11px] text-phosphor-dim hover:text-phosphor mb-2 uppercase min-h-[32px] inline-flex items-center" @click="router.push({ name: 'users' })">
          &lt;&lt;&lt; BACK TO USERS
        </button>
        <div class="heading-macro text-xl text-phosphor break-words">{{ user.full_name }}</div>
        <div class="text-[11px] text-phosphor-faint mt-1 break-all">/// {{ user.email }} / {{ user.provider }}</div>
      </div>

      <div v-if="user.suspended" class="border-2 border-hazard px-3 py-1 text-[11px] text-hazard self-start">
        [ SUSPENDED ]
      </div>
    </div>

    <!-- ACTIONS PANEL -->
    <div class="border-2 border-crt-border p-3 sm:p-4 mb-4">
      <div class="text-[11px] text-phosphor-dim mb-3 uppercase">[ ACTIONS ]</div>
      <div class="flex flex-wrap gap-2">
        <button
          class="border border-crt-border px-3 text-[11px] text-phosphor-dim hover:text-phosphor hover:border-phosphor-dim transition-colors inline-flex items-center min-h-[36px]"
          @click="openModal('edit')"
        >
          EDIT PROFILE
        </button>
        <button
          v-if="!user.email_verified"
          class="border border-crt-border px-3 text-[11px] text-phosphor-dim hover:text-phosphor hover:border-phosphor-dim transition-colors min-h-[36px]"
          @click="openModal('verify')"
        >
          VERIFY EMAIL
        </button>
        <template v-if="auth.isSuperadmin">
          <button
            v-if="!user.suspended"
            class="border border-hazard px-3 text-[11px] text-hazard hover:bg-hazard hover:text-crt transition-colors inline-flex items-center min-h-[36px]"
            @click="openModal('suspend')"
          >
            SUSPEND
            <SuperadminBadge />
          </button>
          <button
            v-else
            class="border border-crt-border px-3 text-[11px] text-phosphor-dim hover:text-phosphor hover:border-phosphor-dim transition-colors inline-flex items-center min-h-[36px]"
            @click="openModal('unsuspend')"
          >
            UNSUSPEND
            <SuperadminBadge />
          </button>
          <button
            class="border border-crt-border px-3 text-[11px] text-phosphor-dim hover:text-phosphor hover:border-phosphor-dim transition-colors inline-flex items-center min-h-[36px]"
            @click="openModal('revoke')"
          >
            REVOKE SESSIONS
            <SuperadminBadge />
          </button>
          <button
            v-if="user.provider === 'email'"
            class="border border-crt-border px-3 text-[11px] text-phosphor-dim hover:text-phosphor hover:border-phosphor-dim transition-colors inline-flex items-center min-h-[36px]"
            @click="openModal('reset-password')"
          >
            RESET PASSWORD
            <SuperadminBadge />
          </button>
          <button
            class="border border-crt-border px-3 text-[11px] text-phosphor-dim hover:text-phosphor hover:border-phosphor-dim transition-colors inline-flex items-center min-h-[36px]"
            @click="openModal('grant')"
          >
            GRANT TOKENS
            <SuperadminBadge />
          </button>
          <button
            class="border border-hazard-dim px-3 text-[11px] text-hazard hover:bg-hazard hover:text-crt transition-colors inline-flex items-center min-h-[36px]"
            @click="openModal('deduct')"
          >
            DEDUCT TOKENS
            <SuperadminBadge />
          </button>
        </template>
      </div>
    </div>

    <!-- PROFILE + STATS -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
      <div class="border-2 border-crt-border p-3 sm:p-4">
        <div class="text-[11px] text-phosphor-dim mb-3 uppercase">[ PROFILE ]</div>
        <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
          <dt class="text-phosphor-faint">SCHOOL</dt>
          <dd class="break-words">{{ user.school_name || '\u2014' }}</dd>
          <dt class="text-phosphor-faint">GRADE</dt>
          <dd>{{ user.grade || '\u2014' }}</dd>
          <dt class="text-phosphor-faint">MAJOR</dt>
          <dd>{{ user.major || '\u2014' }}</dd>
          <dt class="text-phosphor-faint">BIRTHDATE</dt>
          <dd>{{ user.birthdate || '\u2014' }}</dd>
          <dt class="text-phosphor-faint">TOKENS</dt>
          <dd class="font-medium" :class="user.token_balance > 0 ? 'text-amber-600' : 'text-phosphor-faint'">{{ user.token_balance }}</dd>
          <dt class="text-phosphor-faint">REGISTERED</dt>
          <dd>{{ user.created_at.slice(0, 10) }}</dd>
        </dl>
      </div>

      <div class="border-2 border-crt-border p-3 sm:p-4">
        <div class="text-[11px] text-phosphor-dim mb-3 uppercase">[ STATS ]</div>
        <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs" v-if="stats">
          <dt class="text-phosphor-faint">ASSESSMENTS</dt>
          <dd>{{ stats.assessments_completed }} / {{ stats.assessments_total }}</dd>
          <dt class="text-phosphor-faint">TOKENS PURCHASED</dt>
          <dd>{{ stats.tokens_purchased_lifetime }}</dd>
          <dt class="text-phosphor-faint">TOKENS GRANTED</dt>
          <dd>{{ stats.tokens_granted_lifetime }}</dd>
          <dt class="text-phosphor-faint">CHAT SESSIONS</dt>
          <dd>{{ stats.chat_sessions_count }}</dd>
          <dt class="text-phosphor-faint">LAST ACTIVE</dt>
          <dd>{{ stats.last_active_at ? stats.last_active_at.slice(0, 16).replace('T', ' ') : '\u2014' }}</dd>
        </dl>
      </div>
    </div>

    <!-- ASSESSMENTS -->
    <div class="mb-4">
      <div class="text-[11px] text-phosphor-dim mb-2 uppercase">[ ASSESSMENTS ]</div>
      <DataTable
        :columns="assessmentColumns"
        :rows="(data?.assessments as Record<string, unknown>[]) ?? []"
        :empty-text="'[ NO ASSESSMENTS ]'"
        @row-click="goToAssessment"
      />
    </div>

    <!-- CHAT SESSIONS -->
    <div class="mb-4">
      <div class="text-[11px] text-phosphor-dim mb-2 uppercase">[ CHAT SESSIONS ]</div>
      <DataTable
        :columns="chatColumns"
        :rows="(data?.chat_sessions as Record<string, unknown>[]) ?? []"
        :empty-text="'[ NO CHAT SESSIONS ]'"
        @row-click="goToChat"
      />
    </div>

    <!-- RECENT TRANSACTIONS -->
    <div class="mb-4">
      <div class="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <div class="text-[11px] text-phosphor-dim uppercase">[ RECENT TRANSACTIONS ]</div>
        <button
          v-if="!showAllTransactions"
          class="text-[11px] text-phosphor-dim hover:text-phosphor uppercase min-h-[32px] inline-flex items-center"
          @click="openAllTransactions"
        >
          VIEW ALL >>>
        </button>
      </div>
      <DataTable
        v-if="!showAllTransactions"
        :columns="txColumns"
        :rows="(data?.recent_transactions as Record<string, unknown>[]) ?? []"
        :empty-text="'[ NO TRANSACTIONS ]'"
        :clickable="false"
      />
    </div>

    <!-- FULL TRANSACTION HISTORY -->
    <div v-if="showAllTransactions" class="mb-4">
      <div class="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <div class="text-[11px] text-phosphor-dim uppercase">[ ALL TRANSACTIONS ]</div>
        <button
          class="text-[11px] text-phosphor-dim hover:text-phosphor uppercase min-h-[32px] inline-flex items-center"
          @click="showAllTransactions = false"
        >
          &lt;&lt;&lt; COLLAPSE
        </button>
      </div>
      <div class="flex flex-wrap gap-2 mb-2">
        <button
          v-for="opt in [{ label: 'ALL', value: undefined }, { label: 'PURCHASE', value: 'purchase' }, { label: 'GRANT', value: 'grant' }, { label: 'DEBIT', value: 'assessment_debit' }, { label: 'REFUND', value: 'refund' }, { label: 'ADMIN DEBIT', value: 'admin_debit' }]"
          :key="opt.label"
          class="border px-2 text-[11px] transition-colors min-h-[32px] inline-flex items-center"
          :class="txFilterType === opt.value ? 'border-hazard text-hazard' : 'border-crt-border text-phosphor-faint hover:text-phosphor hover:border-phosphor-dim'"
          @click="changeTxFilter(opt.value)"
        >
          {{ opt.label }}
        </button>
      </div>
      <div v-if="txLoading" class="text-phosphor-faint text-xs py-4 text-center">>>> LOADING...</div>
      <template v-else>
        <DataTable
          :columns="txColumns"
          :rows="(txData?.transactions as Record<string, unknown>[]) ?? []"
          :empty-text="'[ NO TRANSACTIONS ]'"
          :clickable="false"
        />
        <div class="flex items-center justify-between mt-2 gap-2">
          <button
            class="border border-crt-border px-3 text-[11px] text-phosphor-faint hover:text-phosphor hover:border-phosphor-dim transition-colors disabled:opacity-30 disabled:cursor-not-allowed min-h-[36px]"
            :disabled="!txPagination.hasPrev.value"
            @click="txPagination.goPrev()"
          >
            &lt;&lt; PREV
          </button>
          <button
            class="border border-crt-border px-3 text-[11px] text-phosphor-faint hover:text-phosphor hover:border-phosphor-dim transition-colors disabled:opacity-30 disabled:cursor-not-allowed min-h-[36px]"
            :disabled="!txPagination.hasNext.value"
            @click="txPagination.goNext()"
          >
            NEXT >>
          </button>
        </div>
      </template>
    </div>

    <!-- MODALS -->
    <Modal :open="activeModal === 'verify'" title="VERIFY EMAIL" @close="closeModal">
      <p class="text-xs text-phosphor mb-4">Force-verify email for {{ user.email }}?</p>
      <div class="flex flex-col sm:flex-row gap-2">
        <button
          class="border border-hazard px-3 text-[11px] text-hazard hover:bg-hazard hover:text-crt transition-colors min-h-[40px] w-full sm:w-auto"
          :disabled="actionLoading"
          @click="verifyEmail"
        >
          [ CONFIRM ]
        </button>
        <button class="border border-crt-border px-3 text-[11px] text-phosphor-dim min-h-[40px] w-full sm:w-auto" @click="closeModal">
          [ CANCEL ]
        </button>
      </div>
    </Modal>

    <Modal :open="activeModal === 'suspend'" title="SUSPEND USER" @close="closeModal">
      <p class="text-xs text-hazard mb-4">Suspend {{ user.full_name }}? All sessions will be revoked.</p>
      <div class="flex flex-col sm:flex-row gap-2">
        <button
          class="border border-hazard px-3 text-[11px] text-hazard hover:bg-hazard hover:text-crt transition-colors min-h-[40px] w-full sm:w-auto"
          :disabled="actionLoading"
          @click="suspend"
        >
          [ SUSPEND ]
        </button>
        <button class="border border-crt-border px-3 text-[11px] text-phosphor-dim min-h-[40px] w-full sm:w-auto" @click="closeModal">
          [ CANCEL ]
        </button>
      </div>
    </Modal>

    <Modal :open="activeModal === 'unsuspend'" title="UNSUSPEND USER" @close="closeModal">
      <p class="text-xs text-phosphor mb-4">Unsuspend {{ user.full_name }}?</p>
      <div class="flex flex-col sm:flex-row gap-2">
        <button
          class="border border-crt-border px-3 text-[11px] text-phosphor hover:bg-crt-surface transition-colors min-h-[40px] w-full sm:w-auto"
          :disabled="actionLoading"
          @click="unsuspend"
        >
          [ CONFIRM ]
        </button>
        <button class="border border-crt-border px-3 text-[11px] text-phosphor-dim min-h-[40px] w-full sm:w-auto" @click="closeModal">
          [ CANCEL ]
        </button>
      </div>
    </Modal>

    <Modal :open="activeModal === 'revoke'" title="REVOKE ALL SESSIONS" @close="closeModal">
      <p class="text-xs text-phosphor mb-4">Force-logout {{ user.full_name }}? User can log back in.</p>
      <div class="flex flex-col sm:flex-row gap-2">
        <button
          class="border border-hazard px-3 text-[11px] text-hazard hover:bg-hazard hover:text-crt transition-colors min-h-[40px] w-full sm:w-auto"
          :disabled="actionLoading"
          @click="revokeSessions"
        >
          [ REVOKE ]
        </button>
        <button class="border border-crt-border px-3 text-[11px] text-phosphor-dim min-h-[40px] w-full sm:w-auto" @click="closeModal">
          [ CANCEL ]
        </button>
      </div>
    </Modal>

    <UserEditModal
      v-if="data"
      :open="activeModal === 'edit'"
      :user="user"
      @close="closeModal"
      @saved="invalidateUserQueries(); closeModal()"
    />

    <TokenModal
      :open="activeModal === 'grant'"
      :user-id="userId"
      mode="grant"
      @close="closeModal"
      @saved="invalidateUserQueries(); closeModal()"
    />

    <TokenModal
      :open="activeModal === 'deduct'"
      :user-id="userId"
      mode="deduct"
      @close="closeModal"
      @saved="invalidateUserQueries(); closeModal()"
    />

    <ResetPasswordModal
      :open="activeModal === 'reset-password'"
      :user-id="userId"
      @close="closeModal"
    />
  </div>
</template>
