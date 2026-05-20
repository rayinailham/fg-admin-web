import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { createRouter, createMemoryHistory } from 'vue-router'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import AbTestsPage from '@/pages/AbTestsPage.vue'
import { useAuthStore } from '@/stores/auth'

const mockList = vi.fn()

vi.mock('@/lib/api-abtests', () => ({
  abTestsApi: {
    list: (...args: unknown[]) => mockList(...args),
  },
}))

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = btoa(JSON.stringify(payload))
  return `${header}.${body}.fake-signature`
}

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/app/ab-tests', name: 'ab-tests', component: { template: '<div />' } },
      { path: '/app/ab-tests/new', name: 'ab-test-new', component: { template: '<div />' } },
      { path: '/app/ab-tests/:id', name: 'ab-test-detail', component: { template: '<div />' } },
    ],
  })
}

function mountPage(role: 'admin' | 'superadmin' = 'superadmin') {
  const router = createTestRouter()
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const token = makeJwt({ sub: 'admin-1', email: 'admin@test.com', role, must_change_password: false, exp: 9999999999 })
  localStorage.setItem('token', token)

  const wrapper = mount(AbTestsPage, {
    global: {
      plugins: [
        createTestingPinia({ createSpy: vi.fn, stubActions: false }),
        router,
        [VueQueryPlugin, { queryClient }],
      ],
    },
  })

  const auth = useAuthStore()
  auth.setToken(token)

  return wrapper
}

const testData = {
  tests: [
    {
      id: 't1',
      assessment_id: 'a1',
      admin_id: 'adm1',
      admin_email: 'super@futureguide.id',
      status: 'completed',
      prompt_key: 'analysis.role',
      version_a: 2,
      version_b: 3,
      winner: 'b',
      started_at: '2026-05-15T08:00:00Z',
      completed_at: '2026-05-15T08:01:02Z',
      created_at: '2026-05-15T07:59:55Z',
    },
  ],
}

describe('AbTestsPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('shows loading state', () => {
    mockList.mockReturnValue(new Promise(() => {}))
    const wrapper = mountPage()
    expect(wrapper.text()).toContain('LOADING')
  })

  it('renders test list', async () => {
    mockList.mockResolvedValue(testData)
    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.text()).toContain('analysis.role')
    expect(wrapper.text()).toContain('COMPLETED')
    expect(wrapper.text()).toContain('B')
    expect(wrapper.text()).toContain('super')
  })

  it('shows empty state', async () => {
    mockList.mockResolvedValue({ tests: [] })
    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.text()).toContain('NO RECORDS FOUND')
  })

  it('renders NEW TEST button', async () => {
    mockList.mockResolvedValue({ tests: [] })
    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.text()).toContain('[ NEW TEST ]')
  })

  it('renders status filter', async () => {
    mockList.mockResolvedValue({ tests: [] })
    const wrapper = mountPage()
    await flushPromises()
    const options = wrapper.find('select').findAll('option')
    expect(options.map(o => o.text())).toEqual(['ALL', 'PENDING', 'RUNNING', 'COMPLETED', 'FAILED'])
  })
})
