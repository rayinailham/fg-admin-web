import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { createRouter, createMemoryHistory } from 'vue-router'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import AssessmentChatPage from '@/pages/AssessmentChatPage.vue'

const mockChat = vi.fn()

vi.mock('@/lib/api-assessments', () => ({
  assessmentsApi: {
    chat: (...args: unknown[]) => mockChat(...args),
  },
}))

const chatData = {
  session: {
    id: 's1',
    model_used: 'google/gemini-2.5-flash',
    message_count: 3,
    created_at: '2026-05-15T08:35:00Z',
  },
  messages: [
    { id: 'm1', role: 'user', content: 'What careers match my profile?', token_count: 15, created_at: '2026-05-15T08:35:30Z' },
    { id: 'm2', role: 'assistant', content: 'Based on your RIASEC profile, you would excel in...', token_count: 250, created_at: '2026-05-15T08:35:45Z' },
    { id: 'm3', role: 'user', content: 'Tell me more about engineering', created_at: '2026-05-15T08:36:00Z' },
  ],
}

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory('/app/assessments/a1/chat'),
    routes: [
      { path: '/app/assessments/:id', name: 'assessment-detail', component: { template: '<div />' } },
      { path: '/app/assessments/:id/chat', name: 'assessment-chat', component: { template: '<div />' } },
    ],
  })
}

function mountPage() {
  const router = createTestRouter()
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return mount(AssessmentChatPage, {
    global: {
      plugins: [
        createTestingPinia({ createSpy: vi.fn }),
        router,
        [VueQueryPlugin, { queryClient }],
      ],
    },
  })
}

describe('AssessmentChatPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading state', () => {
    mockChat.mockReturnValue(new Promise(() => {}))
    const wrapper = mountPage()
    expect(wrapper.text()).toContain('LOADING CHAT DATA')
  })

  it('renders session info', async () => {
    mockChat.mockResolvedValue(chatData)
    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.text()).toContain('s1')
    expect(wrapper.text()).toContain('google/gemini-2.5-flash')
    expect(wrapper.text()).toContain('3')
  })

  it('renders all messages', async () => {
    mockChat.mockResolvedValue(chatData)
    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.text()).toContain('What careers match my profile?')
    expect(wrapper.text()).toContain('Based on your RIASEC profile')
    expect(wrapper.text()).toContain('Tell me more about engineering')
  })

  it('displays role badges', async () => {
    mockChat.mockResolvedValue(chatData)
    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.text()).toContain('USER')
    expect(wrapper.text()).toContain('ASSISTANT')
  })

  it('shows token count when present', async () => {
    mockChat.mockResolvedValue(chatData)
    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.text()).toContain('15 tokens')
    expect(wrapper.text()).toContain('250 tokens')
  })

  it('shows empty state when no messages', async () => {
    mockChat.mockResolvedValue({ session: chatData.session, messages: [] })
    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.text()).toContain('[ NO MESSAGES ]')
  })

  it('shows error state on failure', async () => {
    mockChat.mockRejectedValue(new Error('Not found'))
    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.text()).toContain('FAILED TO LOAD CHAT')
  })
})
