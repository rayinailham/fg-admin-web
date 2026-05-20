import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { createRouter, createMemoryHistory } from 'vue-router'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import UserDetailPage from '@/pages/UserDetailPage.vue'
import { useAuthStore } from '@/stores/auth'

const mockDetail = vi.fn()

vi.mock('@/lib/api-users', () => ({
  usersApi: {
    detail: (...args: unknown[]) => mockDetail(...args),
    verifyEmail: vi.fn().mockResolvedValue({ message: 'ok' }),
    suspend: vi.fn().mockResolvedValue({ message: 'ok' }),
    unsuspend: vi.fn().mockResolvedValue({ message: 'ok' }),
    revokeSessions: vi.fn().mockResolvedValue({ message: 'ok' }),
    resetPassword: vi.fn().mockResolvedValue({ message: 'ok', temporary_password: 'x' }),
    grantTokens: vi.fn().mockResolvedValue({ message: 'ok' }),
    deductTokens: vi.fn().mockResolvedValue({ message: 'ok' }),
    update: vi.fn().mockResolvedValue({ message: 'ok' }),
  },
}))

const mockUserData = {
  user: {
    id: 'u1',
    full_name: 'John Doe',
    email: 'john@test.com',
    school_id: 's1',
    school_name: 'SMA 1',
    grade: '12',
    major: 'IPA',
    birthdate: '2008-03-15',
    email_verified: false,
    suspended: false,
    provider: 'email',
    token_balance: 5,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-05-10T00:00:00Z',
  },
  stats: {
    assessments_total: 3,
    assessments_completed: 2,
    tokens_purchased_lifetime: 10,
    tokens_granted_lifetime: 2,
    chat_sessions_count: 1,
    last_active_at: '2026-05-10T08:00:00Z',
  },
  assessments: [
    { id: 'a1', status: 'completed', submitted_at: '2026-05-01T08:00:00Z', completed_at: '2026-05-01T08:02:00Z', model_used: 'gemini-2.5-flash' },
  ],
  chat_sessions: [
    { id: 'cs1', assessment_id: 'a1', title: 'Career guidance', model_used: 'google/gemini-2.5-flash', message_count: 5, last_message_at: '2026-05-01T09:00:00Z' },
  ],
  recent_transactions: [
    { id: 't1', amount: -1, transaction_type: 'assessment_debit', description: 'Assessment submission', balance_after: 4, created_at: '2026-05-01T08:00:00Z' },
  ],
}

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = btoa(JSON.stringify(payload))
  return `${header}.${body}.fake-signature`
}

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory('/app/users/u1'),
    routes: [
      { path: '/app/users', name: 'users', component: { template: '<div />' } },
      { path: '/app/users/:id', name: 'user-detail', component: UserDetailPage },
      { path: '/app/assessments/:id', name: 'assessment-detail', component: { template: '<div />' } },
    ],
  })
}

function mountPage(role: 'admin' | 'superadmin' = 'superadmin') {
  const router = createTestRouter()
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const token = makeJwt({ sub: 'admin-1', email: 'admin@test.com', role, must_change_password: false, exp: 9999999999 })
  localStorage.setItem('token', token)

  const wrapper = mount(UserDetailPage, {
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

  return { wrapper, router }
}

describe('UserDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('shows loading state initially', () => {
    mockDetail.mockReturnValue(new Promise(() => {}))
    const { wrapper } = mountPage()

    expect(wrapper.text()).toContain('LOADING')
  })

  it('renders user profile data after load', async () => {
    mockDetail.mockResolvedValue(mockUserData)
    const { wrapper } = mountPage()
    await flushPromises()

    expect(wrapper.text()).toContain('John Doe')
    expect(wrapper.text()).toContain('john@test.com')
    expect(wrapper.text()).toContain('SMA 1')
    expect(wrapper.text()).toContain('12')
    expect(wrapper.text()).toContain('IPA')
  })

  it('renders stats section', async () => {
    mockDetail.mockResolvedValue(mockUserData)
    const { wrapper } = mountPage()
    await flushPromises()

    expect(wrapper.text()).toContain('2 / 3')
    expect(wrapper.text()).toContain('10')
  })

  it('renders assessments table', async () => {
    mockDetail.mockResolvedValue(mockUserData)
    const { wrapper } = mountPage()
    await flushPromises()

    expect(wrapper.text()).toContain('completed')
    expect(wrapper.text()).toContain('gemini-2.5-flash')
  })

  it('renders chat sessions table', async () => {
    mockDetail.mockResolvedValue(mockUserData)
    const { wrapper } = mountPage()
    await flushPromises()

    expect(wrapper.text()).toContain('Career guidance')
    expect(wrapper.text()).toContain('google/gemini-2.5-flash')
  })

  it('renders recent transactions', async () => {
    mockDetail.mockResolvedValue(mockUserData)
    const { wrapper } = mountPage()
    await flushPromises()

    expect(wrapper.text()).toContain('assessment_debit')
    expect(wrapper.text()).toContain('-1')
  })

  it('shows VERIFY EMAIL button when email is not verified', async () => {
    mockDetail.mockResolvedValue(mockUserData)
    const { wrapper } = mountPage()
    await flushPromises()

    const actionsPanel = wrapper.find('.flex.flex-wrap.gap-2')
    const buttons = actionsPanel.findAll('button')
    expect(buttons.find((b) => b.text().includes('VERIFY EMAIL'))).toBeDefined()
  })

  it('hides VERIFY EMAIL button when email is already verified', async () => {
    mockDetail.mockResolvedValue({
      ...mockUserData,
      user: { ...mockUserData.user, email_verified: true },
    })
    const { wrapper } = mountPage()
    await flushPromises()

    const actionsPanel = wrapper.find('.flex.flex-wrap.gap-2')
    const buttons = actionsPanel.findAll('button')
    expect(buttons.find((b) => b.text().includes('VERIFY EMAIL'))).toBeUndefined()
  })

  it('shows superadmin-only action buttons for superadmin', async () => {
    mockDetail.mockResolvedValue(mockUserData)
    const { wrapper } = mountPage('superadmin')
    await flushPromises()

    const actionsPanel = wrapper.find('.flex.flex-wrap.gap-2')
    const buttonTexts = actionsPanel.findAll('button').map((b) => b.text())

    // Buttons include the SuperadminBadge component which appends text "SUPERADMIN".
    // Match by prefix/substring rather than exact equality.
    expect(buttonTexts.some((t) => t.startsWith('SUSPEND'))).toBe(true)
    expect(buttonTexts.some((t) => t.startsWith('REVOKE SESSIONS'))).toBe(true)
    expect(buttonTexts.some((t) => t.startsWith('RESET PASSWORD'))).toBe(true)
    expect(buttonTexts.some((t) => t.startsWith('GRANT TOKENS'))).toBe(true)
    expect(buttonTexts.some((t) => t.startsWith('DEDUCT TOKENS'))).toBe(true)
  })

  it('hides superadmin-only action buttons for regular admin', async () => {
    mockDetail.mockResolvedValue(mockUserData)
    const { wrapper } = mountPage('admin')
    await flushPromises()

    const actionsPanel = wrapper.find('.flex.flex-wrap.gap-2')
    const buttonTexts = actionsPanel.findAll('button').map((b) => b.text())

    expect(buttonTexts.some((t) => t.startsWith('SUSPEND'))).toBe(false)
    expect(buttonTexts.some((t) => t.startsWith('REVOKE SESSIONS'))).toBe(false)
    expect(buttonTexts.some((t) => t.startsWith('RESET PASSWORD'))).toBe(false)
    expect(buttonTexts.some((t) => t.startsWith('GRANT TOKENS'))).toBe(false)
    expect(buttonTexts.some((t) => t.startsWith('DEDUCT TOKENS'))).toBe(false)
  })

  it('hides RESET PASSWORD for OAuth-only users', async () => {
    mockDetail.mockResolvedValue({
      ...mockUserData,
      user: { ...mockUserData.user, provider: 'google' },
    })
    const { wrapper } = mountPage('superadmin')
    await flushPromises()

    const actionsPanel = wrapper.find('.flex.flex-wrap.gap-2')
    const buttonTexts = actionsPanel.findAll('button').map((b) => b.text())
    expect(buttonTexts.some((t) => t.startsWith('RESET PASSWORD'))).toBe(false)
  })

  it('shows SUSPENDED badge when user is suspended', async () => {
    mockDetail.mockResolvedValue({
      ...mockUserData,
      user: { ...mockUserData.user, suspended: true },
    })
    const { wrapper } = mountPage()
    await flushPromises()

    expect(wrapper.text()).toContain('[ SUSPENDED ]')
  })

  it('shows UNSUSPEND instead of SUSPEND when user is suspended', async () => {
    mockDetail.mockResolvedValue({
      ...mockUserData,
      user: { ...mockUserData.user, suspended: true },
    })
    const { wrapper } = mountPage('superadmin')
    await flushPromises()

    const actionsPanel = wrapper.find('.flex.flex-wrap.gap-2')
    const buttonTexts = actionsPanel.findAll('button').map((b) => b.text())
    expect(buttonTexts.some((t) => t.startsWith('UNSUSPEND'))).toBe(true)
    expect(buttonTexts.some((t) => t.startsWith('SUSPEND') && !t.startsWith('SUSPENDED'))).toBe(false)
  })
})
