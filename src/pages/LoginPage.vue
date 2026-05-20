<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { authApi, type ApiError } from '@/lib/api'

const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleLogin() {
  error.value = ''
  loading.value = true

  try {
    const { token } = await authApi.login(email.value, password.value)
    const success = auth.setToken(token)
    if (!success) {
      error.value = 'Token tidak valid'
      return
    }
    if (auth.mustChangePassword) {
      router.push({ name: 'change-password' })
    } else {
      router.push({ name: 'overview' })
    }
  } catch (e) {
    error.value = (e as ApiError).message || 'Login gagal'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="w-full max-w-sm mx-auto border border-crt-border bg-crt-raised p-6 sm:p-8 shadow-sm">
    <div class="heading-macro text-2xl text-hazard mb-1">Access</div>
    <div class="text-[12px] text-phosphor-faint mb-6 sm:mb-8">Admin authentication required</div>

    <form @submit.prevent="handleLogin" class="space-y-5">
      <div>
        <label class="block text-[12px] text-phosphor-dim mb-1.5 font-medium">Email</label>
        <input
          v-model="email"
          type="email"
          required
          autocomplete="email"
          class="w-full bg-crt border border-crt-border px-3 py-2.5 text-base sm:text-[14px] text-phosphor placeholder:text-phosphor-faint focus:outline-none focus:border-hazard min-h-[44px]"
          placeholder="admin@futureguide.id"
        />
      </div>

      <div>
        <label class="block text-[12px] text-phosphor-dim mb-1.5 font-medium">Password</label>
        <input
          v-model="password"
          type="password"
          required
          autocomplete="current-password"
          class="w-full bg-crt border border-crt-border px-3 py-2.5 text-base sm:text-[14px] text-phosphor placeholder:text-phosphor-faint focus:outline-none focus:border-hazard min-h-[44px]"
          placeholder="••••••••"
        />
      </div>

      <div v-if="error" class="border border-hazard bg-crt-raised px-3 py-2 text-[13px] text-hazard">
        {{ error }}
      </div>

      <button
        type="submit"
        :disabled="loading"
        class="w-full border border-hazard bg-hazard px-4 py-2.5 text-[14px] text-crt-raised font-semibold hover:bg-hazard-dim hover:border-hazard-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
      >
        {{ loading ? 'Authenticating…' : 'Sign In' }}
      </button>
    </form>
  </div>
</template>
