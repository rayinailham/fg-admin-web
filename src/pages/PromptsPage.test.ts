import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { createRouter, createMemoryHistory } from 'vue-router'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import PromptsPage from '@/pages/PromptsPage.vue'

const mockList = vi.fn()

vi.mock('@/lib/api-prompts', () => ({
  promptsApi: {
    list: (...args: unknown[]) => mockList(...args),
  },
}))

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/app/prompts', name: 'prompts', component: { template: '<div />' } },
      { path: '/app/prompts/:id', name: 'prompt-detail', component: { template: '<div />' } },
    ],
  })
}

function mountPage() {
  const router = createTestRouter()
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return mount(PromptsPage, {
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn }), router, [VueQueryPlugin, { queryClient }]],
    },
  })
}

const templateData = {
  templates: [
    {
      id: 'p1',
      template_key: 'analysis.role',
      name: 'Analysis Role Prompt',
      description: 'Defines the AI persona',
      version: 3,
      is_active: true,
      cache_type: 'cached',
      variables: ['scores', 'references'],
      updated_by: null,
      created_at: '2026-05-01T00:00:00Z',
      updated_at: '2026-05-10T08:00:00Z',
    },
  ],
}

describe('PromptsPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('shows loading state', () => {
    mockList.mockReturnValue(new Promise(() => {}))
    const wrapper = mountPage()
    expect(wrapper.text()).toContain('LOADING TEMPLATES')
  })

  it('renders template list', async () => {
    mockList.mockResolvedValue(templateData)
    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.text()).toContain('Analysis Role Prompt')
    expect(wrapper.text()).toContain('analysis.role')
    expect(wrapper.text()).toContain('ACTIVE')
    expect(wrapper.text()).toContain('v3')
    expect(wrapper.text()).toContain('CACHED')
    expect(wrapper.text()).toContain('scores, references')
  })

  it('shows empty state', async () => {
    mockList.mockResolvedValue({ templates: [] })
    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.text()).toContain('NO TEMPLATES FOUND')
  })

  it('shows INACTIVE badge for inactive template', async () => {
    mockList.mockResolvedValue({ templates: [{ ...templateData.templates[0], is_active: false }] })
    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.text()).toContain('INACTIVE')
  })
})
