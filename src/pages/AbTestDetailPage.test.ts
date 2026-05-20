import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { createRouter, createMemoryHistory } from 'vue-router'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { useAuthStore } from '@/stores/auth'
import AbTestDetailPage from '@/pages/AbTestDetailPage.vue'

const mockDetail = vi.fn()

vi.mock('@/lib/api-abtests', () => ({
  abTestsApi: {
    detail: (...args: unknown[]) => mockDetail(...args),
    verdict: vi.fn().mockResolvedValue({ message: 'Verdict recorded', winner: 'b' }),
  },
}))

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = btoa(JSON.stringify(payload))
  return `${header}.${body}.fake-signature`
}

const fullTest = {
  id: 't1',
  assessment_id: 'a1',
  admin_id: 'adm1',
  admin_email: 'super@futureguide.id',
  status: 'completed',
  prompt_key: 'analysis.role',
  version_a: 2,
  version_b: 3,
  prompt_a_content: 'Prompt version A content',
  prompt_b_content: 'Prompt version B content',
  result_a: { profile_summary: { signature_title: 'Result A' } },
  result_b: { profile_summary: { signature_title: 'Result B' } },
  usage_a: { prompt_tokens: 4500, completion_tokens: 2100, total_tokens: 6600, latency_ms: 28000, estimated_cost_usd: 0.0045 },
  usage_b: { prompt_tokens: 4200, completion_tokens: 1900, total_tokens: 6100, latency_ms: 25000, estimated_cost_usd: 0.0040 },
  winner: 'b',
  notes: 'Version B is better',
  started_at: '2026-05-15T08:00:00Z',
  completed_at: '2026-05-15T08:01:02Z',
  created_at: '2026-05-15T07:59:55Z',
}

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory('/app/ab-tests/t1'),
    routes: [
      { path: '/app/ab-tests', name: 'ab-tests', component: { template: '<div />' } },
      { path: '/app/ab-tests/:id', name: 'ab-test-detail', component: { template: '<div />' } },
      { path: '/app/assessments/:id', name: 'assessment-detail', component: { template: '<div />' } },
    ],
  })
}

function mountPage(role: 'admin' | 'superadmin' = 'superadmin') {
  const router = createTestRouter()
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const token = makeJwt({ sub: 'a1', email: 'a@test.com', role, must_change_password: false, exp: 9999999999 })
  localStorage.setItem('token', token)

  const wrapper = mount(AbTestDetailPage, {
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn, stubActions: false }), router, [VueQueryPlugin, { queryClient }]],
    },
  })
  const auth = useAuthStore()
  auth.setToken(token)
  return wrapper
}

describe('AbTestDetailPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('shows loading state', () => {
    mockDetail.mockReturnValue(new Promise(() => {}))
    const wrapper = mountPage()
    expect(wrapper.text()).toContain('LOADING A/B TEST')
  })

  it('renders test metadata', async () => {
    mockDetail.mockResolvedValue(fullTest)
    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.text()).toContain('analysis.role')
    expect(wrapper.text()).toContain('v2 vs v3')
    expect(wrapper.text()).toContain('COMPLETED')
    expect(wrapper.text()).toContain('WINNER: B')
    expect(wrapper.text()).toContain('super@futureguide.id')
  })

  it('renders prompt content side by side', async () => {
    mockDetail.mockResolvedValue(fullTest)
    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.text()).toContain('Prompt version A content')
    expect(wrapper.text()).toContain('Prompt version B content')
  })

  it('renders usage comparison', async () => {
    mockDetail.mockResolvedValue(fullTest)
    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.text()).toContain('28.0s')
    expect(wrapper.text()).toContain('25.0s')
    expect(wrapper.text()).toContain('$0.0045')
    expect(wrapper.text()).toContain('$0.0040')
  })

  it('renders results', async () => {
    mockDetail.mockResolvedValue(fullTest)
    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.text()).toContain('Result A')
    expect(wrapper.text()).toContain('Result B')
  })

  it('shows verdict button when completed without winner', async () => {
    mockDetail.mockResolvedValue({ ...fullTest, winner: undefined, notes: undefined })
    const wrapper = mountPage('superadmin')
    await flushPromises()
    expect(wrapper.text()).toContain('RECORD VERDICT')
  })

  it('hides verdict button when winner already set', async () => {
    mockDetail.mockResolvedValue(fullTest)
    const wrapper = mountPage('superadmin')
    await flushPromises()
    const actionsSection = wrapper.findAll('div').filter(d => d.text() === '[ ACTIONS ]RECORD VERDICT')
    expect(actionsSection.length).toBe(0)
  })

  it('shows notes when present', async () => {
    mockDetail.mockResolvedValue(fullTest)
    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.text()).toContain('Version B is better')
  })

  it('hides usage section when both usages are null', async () => {
    mockDetail.mockResolvedValue({ ...fullTest, usage_a: null, usage_b: null })
    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.text()).not.toContain('USAGE A')
    expect(wrapper.text()).not.toContain('USAGE B')
  })
})
