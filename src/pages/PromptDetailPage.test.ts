import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { createRouter, createMemoryHistory } from 'vue-router'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { useAuthStore } from '@/stores/auth'
import PromptDetailPage from '@/pages/PromptDetailPage.vue'

const mockDetail = vi.fn()
const mockVersions = vi.fn()

vi.mock('@/lib/api-prompts', () => ({
  promptsApi: {
    detail: (...args: unknown[]) => mockDetail(...args),
    versions: (...args: unknown[]) => mockVersions(...args),
    update: vi.fn().mockResolvedValue({ message: 'ok', template_key: 'x', version: 4, cache_type: 'cached' }),
    revert: vi.fn().mockResolvedValue({ message: 'ok', template_key: 'x', version: 5, reverted_from_version: 2 }),
    toggle: vi.fn().mockResolvedValue({ message: 'ok', template_key: 'x', is_active: false }),
  },
}))

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = btoa(JSON.stringify(payload))
  return `${header}.${body}.fake-signature`
}

const promptData = {
  id: 'p1',
  template_key: 'analysis.role',
  name: 'Analysis Role Prompt',
  description: 'Defines the AI persona',
  content: 'You are a professional psychologist...',
  version: 3,
  is_active: true,
  cache_type: 'cached',
  variables: ['scores', 'references'],
  updated_by: null,
  created_at: '2026-05-01T00:00:00Z',
  updated_at: '2026-05-10T08:00:00Z',
}

const versionsData = {
  template_key: 'analysis.role',
  current_version: 3,
  versions: [
    { id: 'v1', template_id: 'p1', template_key: 'analysis.role', content: '...', variables: ['scores'], version: 2, changed_by: null, change_reason: 'Updated context', created_at: '2026-05-08T00:00:00Z' },
  ],
}

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory('/app/prompts/p1'),
    routes: [
      { path: '/app/prompts', name: 'prompts', component: { template: '<div />' } },
      { path: '/app/prompts/:id', name: 'prompt-detail', component: { template: '<div />' } },
    ],
  })
}

function mountPage(role: 'admin' | 'superadmin' = 'superadmin') {
  const router = createTestRouter()
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const token = makeJwt({ sub: 'a1', email: 'a@test.com', role, must_change_password: false, exp: 9999999999 })
  localStorage.setItem('token', token)

  const wrapper = mount(PromptDetailPage, {
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn, stubActions: false }), router, [VueQueryPlugin, { queryClient }]],
    },
  })
  const auth = useAuthStore()
  auth.setToken(token)
  return wrapper
}

describe('PromptDetailPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('shows loading state', () => {
    mockDetail.mockReturnValue(new Promise(() => {}))
    mockVersions.mockReturnValue(new Promise(() => {}))
    const wrapper = mountPage()
    expect(wrapper.text()).toContain('LOADING TEMPLATE')
  })

  it('renders prompt metadata', async () => {
    mockDetail.mockResolvedValue(promptData)
    mockVersions.mockResolvedValue(versionsData)
    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.text()).toContain('Analysis Role Prompt')
    expect(wrapper.text()).toContain('analysis.role')
    expect(wrapper.text()).toContain('CACHED')
    expect(wrapper.text()).toContain('scores, references')
    expect(wrapper.text()).toContain('ACTIVE')
  })

  it('renders prompt content', async () => {
    mockDetail.mockResolvedValue(promptData)
    mockVersions.mockResolvedValue(versionsData)
    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.text()).toContain('You are a professional psychologist')
  })

  it('renders version history', async () => {
    mockDetail.mockResolvedValue(promptData)
    mockVersions.mockResolvedValue(versionsData)
    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.text()).toContain('v2')
    expect(wrapper.text()).toContain('Updated context')
  })

  it('shows actions for superadmin', async () => {
    mockDetail.mockResolvedValue(promptData)
    mockVersions.mockResolvedValue(versionsData)
    const wrapper = mountPage('superadmin')
    await flushPromises()
    expect(wrapper.text()).toContain('EDIT CONTENT')
    expect(wrapper.text()).toContain('REVERT VERSION')
    expect(wrapper.text()).toContain('DEACTIVATE')
  })

  it('hides actions for regular admin', async () => {
    mockDetail.mockResolvedValue(promptData)
    mockVersions.mockResolvedValue(versionsData)
    const wrapper = mountPage('admin')
    await flushPromises()
    const actionsSection = wrapper.findAll('div').filter(d => d.text().includes('[ ACTIONS ]'))
    expect(actionsSection.length).toBe(0)
  })

  it('shows ACTIVATE for inactive template', async () => {
    mockDetail.mockResolvedValue({ ...promptData, is_active: false })
    mockVersions.mockResolvedValue(versionsData)
    const wrapper = mountPage('superadmin')
    await flushPromises()
    expect(wrapper.text()).toContain('ACTIVATE')
  })
})
