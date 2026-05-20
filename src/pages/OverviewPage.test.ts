import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { createRouter, createMemoryHistory } from 'vue-router'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import OverviewPage from '@/pages/OverviewPage.vue'

const mockStats = vi.fn()
const mockTimeseries = vi.fn()
const mockSchools = vi.fn()

vi.mock('@/lib/api-overview', () => ({
  overviewApi: {
    stats: (...args: unknown[]) => mockStats(...args),
    timeseries: (...args: unknown[]) => mockTimeseries(...args),
    schools: (...args: unknown[]) => mockSchools(...args),
  },
}))

vi.mock('vue-chartjs', () => ({
  Line: { template: '<canvas data-testid="chart" />', props: ['data', 'options'] },
}))

const overviewData = {
  stats: {
    users_registered_today: { value: 12, yesterday: 10 },
    users_verified_today: { value: 8, yesterday: 6 },
    tokens_purchased_today: { value: 45, yesterday: 30 },
    orders_completed_today: { value: 15, yesterday: 10 },
    tokens_granted_today: { value: 5, yesterday: 0 },
    assessments_submitted_today: { value: 20, yesterday: 18 },
    revenue_today_idr: { value: 500000, yesterday: 400000 },
    ai_costs_today_usd: { value: 1.25, yesterday: 1.10 },
    independent_users_total: 340,
    independent_assessments_total: 120,
  },
  models: {
    analysis_current: 'gemini-2.5-flash',
    chat_current: 'google/gemini-2.5-flash',
    used_today: [
      { model: 'gemini-2.5-flash', provider: 'gemini', requests: 45 },
    ],
  },
}

const schoolsData = {
  by_assessments: [{ school_id: 's1', school_name: 'SMA Negeri 1 Jakarta', count: 245 }],
  by_users: [{ school_id: 's1', school_name: 'SMA Negeri 1 Jakarta', count: 89 }],
}

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/app/overview', name: 'overview', component: { template: '<div />' } },
    ],
  })
}

function mountPage() {
  const router = createTestRouter()
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return mount(OverviewPage, {
    global: {
      plugins: [
        createTestingPinia({ createSpy: vi.fn }),
        router,
        [VueQueryPlugin, { queryClient }],
      ],
    },
  })
}

describe('OverviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTimeseries.mockResolvedValue({ metric: 'users_registered', range: '7d', data: [] })
    mockSchools.mockResolvedValue(schoolsData)
  })

  it('shows loading state', () => {
    mockStats.mockReturnValue(new Promise(() => {}))
    const wrapper = mountPage()
    expect(wrapper.text()).toContain('LOADING OVERVIEW')
  })

  it('renders stat cards with values', async () => {
    mockStats.mockResolvedValue(overviewData)
    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.text()).toContain('USERS REGISTERED')
    expect(wrapper.text()).toContain('12')
    expect(wrapper.text()).toContain('+2 vs yesterday')
  })

  it('renders model info', async () => {
    mockStats.mockResolvedValue(overviewData)
    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.text()).toContain('gemini-2.5-flash')
    expect(wrapper.text()).toContain('google/gemini-2.5-flash')
    expect(wrapper.text()).toContain('45 req')
  })

  it('renders school rankings', async () => {
    mockStats.mockResolvedValue(overviewData)
    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.text()).toContain('SMA Negeri 1 Jakarta')
    expect(wrapper.text()).toContain('245')
    expect(wrapper.text()).toContain('89')
  })

  it('renders timeseries controls', async () => {
    mockStats.mockResolvedValue(overviewData)
    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.text()).toContain('TIMESERIES')
    expect(wrapper.text()).toContain('7D')
    expect(wrapper.text()).toContain('30D')
    expect(wrapper.text()).toContain('12MO')
  })

  it('shows positive delta with + prefix', async () => {
    mockStats.mockResolvedValue(overviewData)
    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.text()).toContain('+5 vs yesterday')
  })

  it('shows = for zero delta', async () => {
    const data = {
      ...overviewData,
      stats: { ...overviewData.stats, users_registered_today: { value: 10, yesterday: 10 } },
    }
    mockStats.mockResolvedValue(data)
    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.text()).toContain('= vs yesterday')
  })
})
