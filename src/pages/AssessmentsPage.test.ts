import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { createRouter, createMemoryHistory } from 'vue-router'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import AssessmentsPage from '@/pages/AssessmentsPage.vue'

const mockAssessmentsList = vi.fn()

vi.mock('@/lib/api-assessments', () => ({
  assessmentsApi: {
    list: (...args: unknown[]) => mockAssessmentsList(...args),
  },
}))

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/app/assessments', name: 'assessments', component: { template: '<div />' } },
      { path: '/app/assessments/:id', name: 'assessment-detail', component: { template: '<div />' } },
    ],
  })
}

function mountPage() {
  const router = createTestRouter()
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return mount(AssessmentsPage, {
    global: {
      plugins: [
        createTestingPinia({ createSpy: vi.fn }),
        router,
        [VueQueryPlugin, { queryClient }],
      ],
    },
  })
}

describe('AssessmentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders filter form and table', async () => {
    mockAssessmentsList.mockResolvedValue({ assessments: [] })

    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.text()).toContain('ASSESSMENTS')
    expect(wrapper.text()).toContain('FILTERS')
    expect(wrapper.text()).toContain('[ NO RECORDS FOUND ]')
  })

  it('displays assessments from API response', async () => {
    mockAssessmentsList.mockResolvedValue({
      assessments: [
        {
          id: 'a1',
          user_name: 'Jane Smith',
          school_name: 'SMA Negeri 1',
          status: 'completed',
          submitted_at: '2026-05-15T08:30:00Z',
          model_used: 'gemini-2.5-flash',
        },
      ],
    })

    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.text()).toContain('Jane Smith')
    expect(wrapper.text()).toContain('SMA Negeri 1')
    expect(wrapper.text()).toContain('COMPLETED')
    expect(wrapper.text()).toContain('gemini-2.5-flash')
  })

  it('shows loading state', () => {
    mockAssessmentsList.mockReturnValue(new Promise(() => {}))

    const wrapper = mountPage()

    expect(wrapper.text()).toContain('LOADING')
  })

  it('displays em dash for null school_name and model_used', async () => {
    mockAssessmentsList.mockResolvedValue({
      assessments: [
        {
          id: 'a2',
          user_name: 'No School User',
          school_name: null,
          status: 'pending',
          submitted_at: '2026-05-15T10:00:00Z',
          model_used: null,
        },
      ],
    })

    const wrapper = mountPage()
    await flushPromises()

    const cells = wrapper.findAll('td')
    expect(cells[1]!.text()).toBe('\u2014')
    expect(cells[3]!.text()).toBe('\u2014')
  })

  it('renders status filter options', async () => {
    mockAssessmentsList.mockResolvedValue({ assessments: [] })

    const wrapper = mountPage()
    await flushPromises()

    const select = wrapper.find('select')
    const options = select.findAll('option')
    expect(options.map(o => o.text())).toEqual(['ALL', 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'])
  })
})
