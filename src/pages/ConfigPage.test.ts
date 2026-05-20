import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { createRouter, createMemoryHistory } from 'vue-router'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { useAuthStore } from '@/stores/auth'
import ConfigPage from '@/pages/ConfigPage.vue'

const mockList = vi.fn()
const mockAudit = vi.fn()

vi.mock('@/lib/api-config', () => ({
  configApi: {
    list: (...args: unknown[]) => mockList(...args),
    audit: (...args: unknown[]) => mockAudit(...args),
    update: vi.fn().mockResolvedValue({ key: 'x', value: 'y' }),
    reload: vi.fn().mockResolvedValue({ message: 'ok' }),
  },
}))

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = btoa(JSON.stringify(payload))
  return `${header}.${body}.fake-signature`
}

const configData = {
  config: {
    analysis: [
      { key: 'analysis.gemini_model', value: 'gemini-2.5-flash', description: 'Gemini model', value_type: 'string', updated_at: '2026-05-10T08:00:00Z', updated_by: 'admin-1' },
    ],
    chat: [
      { key: 'chat.model', value: 'google/gemini-2.5-flash', description: 'Chat model', value_type: 'string', updated_at: '2026-05-10T08:00:00Z', updated_by: '' },
    ],
  },
}

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/app/config', name: 'config', component: { template: '<div />' } }],
  })
}

function mountPage(role: 'admin' | 'superadmin' = 'superadmin') {
  const router = createTestRouter()
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const token = makeJwt({ sub: 'a1', email: 'a@test.com', role, must_change_password: false, exp: 9999999999 })
  localStorage.setItem('token', token)
  const wrapper = mount(ConfigPage, {
    global: { plugins: [createTestingPinia({ createSpy: vi.fn, stubActions: false }), router, [VueQueryPlugin, { queryClient }]] },
  })
  const auth = useAuthStore()
  auth.setToken(token)
  return wrapper
}

describe('ConfigPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('shows loading state', () => {
    mockList.mockReturnValue(new Promise(() => {}))
    const wrapper = mountPage()
    expect(wrapper.text()).toContain('LOADING CONFIG')
  })

  it('renders config entries grouped by category', async () => {
    mockList.mockResolvedValue(configData)
    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.text()).toContain('analysis')
    expect(wrapper.text()).toContain('chat')
    expect(wrapper.text()).toContain('analysis.gemini_model')
    expect(wrapper.text()).toContain('gemini-2.5-flash')
  })

  it('shows EDIT button for superadmin', async () => {
    mockList.mockResolvedValue(configData)
    const wrapper = mountPage('superadmin')
    await flushPromises()
    expect(wrapper.text()).toContain('EDIT')
    expect(wrapper.text()).toContain('RELOAD CONFIG')
  })

  it('hides EDIT button for regular admin', async () => {
    mockList.mockResolvedValue(configData)
    const wrapper = mountPage('admin')
    await flushPromises()
    const editButtons = wrapper.findAll('button').filter(b => b.text() === 'EDIT')
    expect(editButtons.length).toBe(0)
  })

  it('shows em dash for empty updated_by', async () => {
    mockList.mockResolvedValue(configData)
    const wrapper = mountPage()
    await flushPromises()
    // Switch to 'chat' tab which has empty updated_by
    const chatTab = wrapper.findAll('button').find(b => b.text() === 'chat')
    await chatTab!.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('\u2014')
  })

  it('shows AUDIT button for all admins', async () => {
    mockList.mockResolvedValue(configData)
    const wrapper = mountPage('admin')
    await flushPromises()
    // Only active tab entries are visible; analysis tab has 1 entry = 1 AUDIT button
    const auditButtons = wrapper.findAll('button').filter(b => b.text() === 'AUDIT')
    expect(auditButtons.length).toBe(1)
  })
})
