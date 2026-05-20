<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { usersApi } from '@/lib/api-users'
import Modal from '@/components/Modal.vue'
import type { ApiError } from '@/lib/api'

interface UserData {
  id: string
  full_name: string
  email: string
  school_id: string | null
  grade: string | null
  major: string | null
  birthdate: string | null
}

const props = defineProps<{
  open: boolean
  user: UserData
}>()

const emit = defineEmits<{ close: []; saved: [] }>()

const auth = useAuthStore()
const toast = useToast()

const form = ref({
  full_name: props.user.full_name,
  email: props.user.email,
  grade: props.user.grade || '',
  major: props.user.major || '',
  birthdate: props.user.birthdate || '',
})

const loading = ref(false)
const error = ref('')

async function handleSubmit() {
  error.value = ''
  loading.value = true

  const body: Record<string, string> = {}
  if (form.value.full_name !== props.user.full_name) body.full_name = form.value.full_name
  if (form.value.email !== props.user.email) body.email = form.value.email
  if (form.value.grade !== (props.user.grade || '')) body.grade = form.value.grade
  if (form.value.major !== (props.user.major || '')) body.major = form.value.major
  if (form.value.birthdate !== (props.user.birthdate || '')) body.birthdate = form.value.birthdate

  if (Object.keys(body).length === 0) {
    error.value = 'No changes detected'
    loading.value = false
    return
  }

  try {
    await usersApi.update(props.user.id, body)
    toast.success('User updated')
    emit('saved')
  } catch (e) {
    error.value = (e as ApiError).message || 'Failed to update'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Modal :open="open" title="EDIT USER PROFILE" @close="emit('close')">
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div>
        <label class="block text-[11px] text-phosphor-dim mb-1 uppercase">FULL NAME</label>
        <input
          v-model="form.full_name"
          class="w-full bg-crt-surface border border-crt-border px-2 py-2 text-base sm:text-xs text-phosphor focus:outline-none focus:border-hazard min-h-[44px] sm:min-h-0"
        />
      </div>

      <div v-if="auth.isSuperadmin">
        <label class="block text-[11px] text-phosphor-dim mb-1 uppercase">EMAIL (SUPERADMIN ONLY)</label>
        <input
          v-model="form.email"
          type="email"
          class="w-full bg-crt-surface border border-crt-border px-2 py-2 text-base sm:text-xs text-phosphor focus:outline-none focus:border-hazard min-h-[44px] sm:min-h-0"
        />
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="block text-[11px] text-phosphor-dim mb-1 uppercase">GRADE</label>
          <input
            v-model="form.grade"
            class="w-full bg-crt-surface border border-crt-border px-2 py-2 text-base sm:text-xs text-phosphor focus:outline-none focus:border-hazard min-h-[44px] sm:min-h-0"
            placeholder="10, 11, 12"
          />
        </div>
        <div>
          <label class="block text-[11px] text-phosphor-dim mb-1 uppercase">MAJOR</label>
          <input
            v-model="form.major"
            class="w-full bg-crt-surface border border-crt-border px-2 py-2 text-base sm:text-xs text-phosphor focus:outline-none focus:border-hazard min-h-[44px] sm:min-h-0"
            placeholder="IPA, IPS"
          />
        </div>
      </div>

      <div>
        <label class="block text-[11px] text-phosphor-dim mb-1 uppercase">BIRTHDATE</label>
        <input
          v-model="form.birthdate"
          type="date"
          class="w-full bg-crt-surface border border-crt-border px-2 py-2 text-base sm:text-xs text-phosphor focus:outline-none focus:border-hazard min-h-[44px] sm:min-h-0"
        />
      </div>

      <div v-if="error" class="border border-hazard px-3 py-2 text-[11px] text-hazard">
        [ ERR ] {{ error }}
      </div>

      <div class="flex flex-col sm:flex-row gap-2">
        <button
          type="submit"
          :disabled="loading"
          class="border border-hazard px-3 text-[11px] text-hazard hover:bg-hazard hover:text-crt transition-colors disabled:opacity-50 min-h-[40px] w-full sm:w-auto"
        >
          {{ loading ? '>>> SAVING...' : '[ SAVE ]' }}
        </button>
        <button
          type="button"
          class="border border-crt-border px-3 text-[11px] text-phosphor-dim min-h-[40px] w-full sm:w-auto"
          @click="emit('close')"
        >
          [ CANCEL ]
        </button>
      </div>
    </form>
  </Modal>
</template>
