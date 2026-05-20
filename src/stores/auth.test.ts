import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'

const VALID_JWT_PAYLOAD = {
  sub: 'admin-123',
  email: 'admin@futureguide.id',
  role: 'superadmin',
  must_change_password: false,
  exp: Math.floor(Date.now() / 1000) + 3600,
}

const EXPIRED_JWT_PAYLOAD = {
  ...VALID_JWT_PAYLOAD,
  exp: Math.floor(Date.now() / 1000) - 3600,
}

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = btoa(JSON.stringify(payload))
  return `${header}.${body}.fake-signature`
}

describe('auth store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('initializes as unauthenticated when no token in localStorage', () => {
    const auth = useAuthStore()
    expect(auth.isAuthenticated).toBe(false)
    expect(auth.role).toBeNull()
    expect(auth.adminId).toBeNull()
  })

  it('setToken decodes JWT and stores in localStorage', () => {
    const auth = useAuthStore()
    const token = makeJwt(VALID_JWT_PAYLOAD)

    const result = auth.setToken(token)

    expect(result).toBe(true)
    expect(auth.isAuthenticated).toBe(true)
    expect(auth.role).toBe('superadmin')
    expect(auth.isSuperadmin).toBe(true)
    expect(auth.adminId).toBe('admin-123')
    expect(auth.email).toBe('admin@futureguide.id')
    expect(auth.mustChangePassword).toBe(false)
    expect(localStorage.getItem('token')).toBe(token)
  })

  it('setToken returns false for invalid token', () => {
    const auth = useAuthStore()

    const result = auth.setToken('not-a-jwt')

    expect(result).toBe(false)
    expect(auth.isAuthenticated).toBe(false)
  })

  it('isExpired returns true when token exp is in the past', () => {
    const auth = useAuthStore()
    auth.setToken(makeJwt(EXPIRED_JWT_PAYLOAD))

    expect(auth.isExpired).toBe(true)
  })

  it('isExpired returns false when token exp is in the future', () => {
    const auth = useAuthStore()
    auth.setToken(makeJwt(VALID_JWT_PAYLOAD))

    expect(auth.isExpired).toBe(false)
  })

  it('logout clears token and localStorage', () => {
    const auth = useAuthStore()
    auth.setToken(makeJwt(VALID_JWT_PAYLOAD))

    auth.logout()

    expect(auth.isAuthenticated).toBe(false)
    expect(auth.token).toBeNull()
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('isSuperadmin is false for admin role', () => {
    const auth = useAuthStore()
    auth.setToken(makeJwt({ ...VALID_JWT_PAYLOAD, role: 'admin' }))

    expect(auth.isSuperadmin).toBe(false)
    expect(auth.role).toBe('admin')
  })

  it('mustChangePassword reflects JWT payload', () => {
    const auth = useAuthStore()
    auth.setToken(makeJwt({ ...VALID_JWT_PAYLOAD, must_change_password: true }))

    expect(auth.mustChangePassword).toBe(true)
  })

  it('clearMustChangePassword updates local state', () => {
    const auth = useAuthStore()
    auth.setToken(makeJwt({ ...VALID_JWT_PAYLOAD, must_change_password: true }))

    auth.clearMustChangePassword()

    expect(auth.mustChangePassword).toBe(false)
  })

  it('restores token from localStorage on init', () => {
    const token = makeJwt(VALID_JWT_PAYLOAD)
    localStorage.setItem('token', token)

    setActivePinia(createPinia())
    const auth = useAuthStore()

    expect(auth.isAuthenticated).toBe(true)
    expect(auth.email).toBe('admin@futureguide.id')
  })
})
