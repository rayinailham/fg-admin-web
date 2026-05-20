import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

interface JwtPayload {
  sub: string
  email: string
  role: 'admin' | 'superadmin'
  must_change_password: boolean
  exp: number
}

function decodeJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(atob(parts[1]!.replace(/-/g, '+').replace(/_/g, '/')))
    return payload as JwtPayload
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'))
  const payload = ref<JwtPayload | null>(token.value ? decodeJwt(token.value) : null)

  const isAuthenticated = computed(() => !!token.value && !!payload.value)
  const isExpired = computed(() => {
    if (!payload.value) return true
    return Date.now() >= payload.value.exp * 1000
  })
  const role = computed(() => payload.value?.role ?? null)
  const isSuperadmin = computed(() => payload.value?.role === 'superadmin')
  const mustChangePassword = computed(() => payload.value?.must_change_password ?? false)
  const adminId = computed(() => payload.value?.sub ?? null)
  const email = computed(() => payload.value?.email ?? null)

  function setToken(newToken: string) {
    const decoded = decodeJwt(newToken)
    if (!decoded) return false
    token.value = newToken
    payload.value = decoded
    localStorage.setItem('token', newToken)
    return true
  }

  function logout() {
    token.value = null
    payload.value = null
    localStorage.removeItem('token')
  }

  function clearMustChangePassword() {
    if (payload.value) {
      payload.value = { ...payload.value, must_change_password: false }
    }
  }

  return {
    token,
    isAuthenticated,
    isExpired,
    role,
    isSuperadmin,
    mustChangePassword,
    adminId,
    email,
    setToken,
    logout,
    clearMustChangePassword,
  }
})
