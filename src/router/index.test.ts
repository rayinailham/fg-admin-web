import { describe, it, expect, beforeEach } from 'vitest'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = btoa(JSON.stringify(payload))
  return `${header}.${body}.fake-signature`
}

const VALID_PAYLOAD = {
  sub: 'admin-123',
  email: 'admin@futureguide.id',
  role: 'superadmin',
  must_change_password: false,
  exp: Math.floor(Date.now() / 1000) + 3600,
}

function createTestRouter(): Router {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', name: 'login', component: { template: '<div>login</div>' } },
      { path: '/change-password', name: 'change-password', component: { template: '<div>change</div>' } },
      {
        path: '/app',
        component: { template: '<router-view />' },
        meta: { requiresAuth: true },
        children: [
          { path: '', redirect: '/app/overview' },
          { path: 'overview', name: 'overview', component: { template: '<div>overview</div>' } },
          { path: 'users', name: 'users', component: { template: '<div>users</div>' } },
        ],
      },
      { path: '/:pathMatch(.*)*', redirect: '/login' },
    ],
  })

  router.beforeEach((to) => {
    const auth = useAuthStore()

    if (to.meta.requiresAuth && !auth.isAuthenticated) {
      return { name: 'login' }
    }

    if (to.meta.requiresAuth && auth.isExpired) {
      auth.logout()
      return { name: 'login' }
    }

    if (to.meta.requiresAuth && auth.mustChangePassword && to.name !== 'change-password') {
      return { name: 'change-password' }
    }

    if (to.name === 'login' && auth.isAuthenticated && !auth.isExpired) {
      return { name: 'overview' }
    }
  })

  return router
}

describe('router guards', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('redirects to login when not authenticated', async () => {
    const router = createTestRouter()
    await router.push('/app/overview')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('login')
  })

  it('allows access to /app when authenticated', async () => {
    const auth = useAuthStore()
    auth.setToken(makeJwt(VALID_PAYLOAD))

    const router = createTestRouter()
    await router.push('/app/overview')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('overview')
  })

  it('redirects to login when token is expired', async () => {
    const auth = useAuthStore()
    auth.setToken(makeJwt({ ...VALID_PAYLOAD, exp: Math.floor(Date.now() / 1000) - 100 }))

    const router = createTestRouter()
    await router.push('/app/overview')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('login')
  })

  it('redirects to change-password when must_change_password is true', async () => {
    const auth = useAuthStore()
    auth.setToken(makeJwt({ ...VALID_PAYLOAD, must_change_password: true }))

    const router = createTestRouter()
    await router.push('/app/overview')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('change-password')
  })

  it('redirects authenticated user away from login to overview', async () => {
    const auth = useAuthStore()
    auth.setToken(makeJwt(VALID_PAYLOAD))

    const router = createTestRouter()
    await router.push('/login')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('overview')
  })

  it('catches unknown routes and redirects to login', async () => {
    const router = createTestRouter()
    await router.push('/nonexistent')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('login')
  })
})
