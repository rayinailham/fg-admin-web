import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { createRouter, createMemoryHistory } from 'vue-router'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import LedgerPage from '@/pages/LedgerPage.vue'

const mockGetSummary = vi.fn()
const mockMonths = vi.fn()
const mockGetCompare = vi.fn()
const mockGetInfraCosts = vi.fn()
const mockGetExchangeRate = vi.fn()
const mockGetRevenue = vi.fn()
const mockGetAiUsage = vi.fn()

vi.mock('@/lib/api-ledger', () => ({
  ledgerApi: {
    getSummary: (...args: unknown[]) => mockGetSummary(...args),
    get: (...args: unknown[]) => mockGetSummary(...args),
    months: (...args: unknown[]) => mockMonths(...args),
    getCompare: (...args: unknown[]) => mockGetCompare(...args),
    getInfraCosts: (...args: unknown[]) => mockGetInfraCosts(...args),
    getExchangeRate: (...args: unknown[]) => mockGetExchangeRate(...args),
    getRevenue: (...args: unknown[]) => mockGetRevenue(...args),
    getAiUsage: (...args: unknown[]) => mockGetAiUsage(...args),
    deleteInfraCost: vi.fn(),
    updateInfraCosts: vi.fn(),
    updateExchangeRate: vi.fn(),
    refreshExchangeRate: vi.fn(),
  },
}))

const ledgerData = {
  period: '2026-05',
  exchange_rate: { usd_to_idr: 16500.0, updated_at: '2026-05-15T06:00:00Z', source: 'auto' },
  lifetime: {
    revenue_idr: 45000000,
    ai_costs_usd: 12.45,
    ai_costs_idr: 205425,
    infra_costs_idr: 3000000,
    infra_costs_from_month: '2026-01',
    net_profit_idr: 41794575,
  },
  monthly: {
    revenue: {
      total_idr: 5000000,
      order_count: 42,
      breakdown: [{ package_id: 'basic_1', label: '1 Token', count: 10, total_idr: 150000 }],
    },
    ai_costs: {
      total_usd: 2.85,
      total_idr: 47025,
      breakdown: [{ category: 'analysis', model: 'gemini-2.5-flash', cost_usd: 1.8, cost_idr: 29700, call_count: 45 }],
    },
    infra_costs: {
      total_idr: 500000,
      breakdown: [
        { category: 'database', cost_idr: 200000 },
        { category: 'redis', cost_idr: 100000 },
        { category: 'server', cost_idr: 150000 },
        { category: 'domain', cost_idr: 50000 },
        { category: 'other', cost_idr: 0 },
      ],
    },
    opportunity_cost: { tokens_granted: 50, equivalent_idr: 750000 },
    summary: {
      revenue_idr: 5000000,
      total_costs_idr: 547025,
      net_profit_idr: 4452975,
      profit_margin_percent: 89.06,
    },
  },
}

const compareData = {
  current: ledgerData,
  previous: { ...ledgerData, period: '2026-04' },
  delta: {
    revenue_idr: { absolute: 500000, percent: 12.0 },
    ai_costs_idr: { absolute: -10000, percent: -5.0 },
    infra_costs_idr: { absolute: 0, percent: 0.0 },
    net_profit_idr: { absolute: 510000, percent: 18.0 },
    profit_margin_points: 3.2,
  },
}

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/app/ledger', name: 'ledger', component: { template: '<div />' } }],
  })
}

function mountPage() {
  const router = createTestRouter()
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return mount(LedgerPage, {
    global: { plugins: [createTestingPinia({ createSpy: vi.fn }), router, [VueQueryPlugin, { queryClient }]] },
  })
}

describe('LedgerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCompare.mockResolvedValue(compareData)
    mockMonths.mockResolvedValue({ months: [] })
    mockGetInfraCosts.mockResolvedValue({
      month: '2026-05',
      active: ledgerData.monthly.infra_costs.breakdown,
      total_idr: ledgerData.monthly.infra_costs.total_idr,
      history: [],
    })
    mockGetExchangeRate.mockResolvedValue({
      usd_to_idr: 16500,
      source: 'auto',
      updated_at: '2026-05-15T06:00:00Z',
      audit: [],
    })
    mockGetRevenue.mockResolvedValue({ rows: [], next_cursor: '' })
    mockGetAiUsage.mockResolvedValue({ rows: [], next_cursor: '' })
  })

  it('shows loading state', () => {
    mockGetSummary.mockReturnValue(new Promise(() => {}))
    const wrapper = mountPage()
    expect(wrapper.text()).toContain('LOADING SUMMARY')
  })

  it('renders period and exchange rate badge', async () => {
    mockGetSummary.mockResolvedValue(ledgerData)
    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.text()).toContain('2026-05')
    expect(wrapper.find('[data-testid="fx-badge"]').text()).toContain('AUTO')
  })

  it('shows error state when summary fails to load', async () => {
    mockGetSummary.mockRejectedValue({ message: 'failed to load', status: 500 })
    const wrapper = mountPage()
    await flushPromises()
    const errorEl = wrapper.find('[data-testid="summary-error"]')
    expect(errorEl.exists()).toBe(true)
    expect(errorEl.text()).toContain('ERROR')
  })

  it('renders summary metrics with full data', async () => {
    mockGetSummary.mockResolvedValue(ledgerData)
    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.find('[data-testid="metric-revenue"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="metric-ai-costs"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="metric-infra-costs"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="metric-net-profit"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('89.06%')
  })

  it('renders compare deltas when compare data is available', async () => {
    mockGetSummary.mockResolvedValue(ledgerData)
    const wrapper = mountPage()
    await flushPromises()
    await flushPromises()
    expect(wrapper.find('[data-testid="revenue-delta"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="revenue-delta"]').text()).toContain('+12')
    expect(wrapper.find('[data-testid="ai-costs-delta"]').text()).toContain('-5')
    expect(wrapper.find('[data-testid="net-profit-delta"]').text()).toContain('+18')
  })

  it('falls back to no-compare render when compare toggle is off', async () => {
    mockGetSummary.mockResolvedValue(ledgerData)
    const wrapper = mountPage()
    await flushPromises()
    const toggle = wrapper.find('[data-testid="compare-toggle"]')
    await toggle.trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="revenue-delta"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="ai-costs-delta"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="net-profit-delta"]').exists()).toBe(false)
  })

  it('falls back to no-compare render when compare query fails', async () => {
    mockGetSummary.mockResolvedValue(ledgerData)
    mockGetCompare.mockRejectedValue({ message: 'compare unavailable', status: 500 })
    const wrapper = mountPage()
    await flushPromises()
    await flushPromises()
    expect(wrapper.find('[data-testid="metric-revenue"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="revenue-delta"]').exists()).toBe(false)
  })

  it('renders revenue breakdown', async () => {
    mockGetSummary.mockResolvedValue(ledgerData)
    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.text()).toContain('1 Token')
    expect(wrapper.text()).toContain('42 orders')
  })

  it('renders AI costs breakdown', async () => {
    mockGetSummary.mockResolvedValue(ledgerData)
    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.text()).toContain('analysis')
    expect(wrapper.text()).toContain('gemini-2.5-flash')
    expect(wrapper.text()).toContain('45 calls')
  })

  it('renders infra costs', async () => {
    mockGetSummary.mockResolvedValue(ledgerData)
    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.text()).toContain('DATABASE')
    expect(wrapper.text()).toContain('REDIS')
    expect(wrapper.text()).toContain('SERVER')
  })

  it('renders opportunity cost', async () => {
    mockGetSummary.mockResolvedValue(ledgerData)
    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.text()).toContain('OPPORTUNITY COST')
    expect(wrapper.text()).toContain('50')
  })

  it('renders month selector when months available', async () => {
    mockGetSummary.mockResolvedValue(ledgerData)
    mockMonths.mockResolvedValue({ months: [{ month: '2026-05', has_revenue: true, has_costs: true }] })
    const wrapper = mountPage()
    await flushPromises()
    const select = wrapper.find('[data-testid="month-select"]')
    expect(select.exists()).toBe(true)
    expect(select.text()).toContain('2026-05')
  })

  // ---------------------------------------------------------------------------
  // DRILL-DOWNS
  // ---------------------------------------------------------------------------

  it('does not fetch revenue detail until expanded (lazy-load)', async () => {
    mockGetSummary.mockResolvedValue(ledgerData)
    mountPage()
    await flushPromises()
    expect(mockGetRevenue).not.toHaveBeenCalled()
  })

  it('does not fetch AI usage detail until expanded (lazy-load)', async () => {
    mockGetSummary.mockResolvedValue(ledgerData)
    mountPage()
    await flushPromises()
    expect(mockGetAiUsage).not.toHaveBeenCalled()
  })

  it('expands revenue detail and shows empty state when no rows', async () => {
    mockGetSummary.mockResolvedValue(ledgerData)
    mockGetRevenue.mockResolvedValue({ rows: [], next_cursor: '' })
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.find('[data-testid="revenue-detail-toggle"]').trigger('click')
    await flushPromises()

    expect(mockGetRevenue).toHaveBeenCalled()
    expect(wrapper.find('[data-testid="revenue-detail-empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="revenue-detail-empty"]').text()).toContain('NO REVENUE DATA')
  })

  it('expands revenue detail and renders rows', async () => {
    mockGetSummary.mockResolvedValue(ledgerData)
    mockGetRevenue.mockResolvedValue({
      rows: [
        {
          id: 'rev-1',
          user_id: 'u1',
          user_email: 'user@example.com',
          package_id: 'basic_1',
          package_label: '1 Token',
          amount_idr: 75000,
          payment_method: 'qris',
          completed_at: '2026-05-15T10:30:00Z',
        },
      ],
      next_cursor: '',
    })
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.find('[data-testid="revenue-detail-toggle"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="revenue-detail-table"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="revenue-row-rev-1"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="revenue-row-rev-1"]').text()).toContain('user@example.com')
  })

  it('shows error state when revenue detail query fails', async () => {
    mockGetSummary.mockResolvedValue(ledgerData)
    mockGetRevenue.mockRejectedValue({ message: 'failed to load', status: 500 })
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.find('[data-testid="revenue-detail-toggle"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="revenue-detail-error"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="revenue-detail-error"]').text()).toContain('ERROR')
  })

  it('paginates revenue detail with NEXT cursor button', async () => {
    mockGetSummary.mockResolvedValue(ledgerData)
    mockGetRevenue
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'rev-1',
            user_id: 'u1',
            user_email: 'a@example.com',
            package_id: 'basic_1',
            package_label: '1 Token',
            amount_idr: 75000,
            payment_method: 'qris',
            completed_at: '2026-05-15T10:30:00Z',
          },
        ],
        next_cursor: 'next-page-cursor',
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'rev-2',
            user_id: 'u2',
            user_email: 'b@example.com',
            package_id: 'basic_1',
            package_label: '1 Token',
            amount_idr: 75000,
            payment_method: 'qris',
            completed_at: '2026-05-14T10:30:00Z',
          },
        ],
        next_cursor: '',
      })
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.find('[data-testid="revenue-detail-toggle"]').trigger('click')
    await flushPromises()

    const nextBtn = wrapper.find('[data-testid="revenue-next"]')
    expect((nextBtn.element as HTMLButtonElement).disabled).toBe(false)

    await nextBtn.trigger('click')
    await flushPromises()

    expect(mockGetRevenue).toHaveBeenCalledTimes(2)
    const secondCall = mockGetRevenue.mock.calls[1]![0]
    expect(secondCall.cursor).toBe('next-page-cursor')
    expect(wrapper.find('[data-testid="revenue-row-rev-2"]').exists()).toBe(true)
  })

  it('disables NEXT button when there are no more pages', async () => {
    mockGetSummary.mockResolvedValue(ledgerData)
    mockGetRevenue.mockResolvedValue({
      rows: [
        {
          id: 'rev-1',
          user_id: 'u1',
          user_email: 'user@example.com',
          package_id: 'basic_1',
          package_label: '1 Token',
          amount_idr: 75000,
          payment_method: 'qris',
          completed_at: '2026-05-15T10:30:00Z',
        },
      ],
      next_cursor: '',
    })
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.find('[data-testid="revenue-detail-toggle"]').trigger('click')
    await flushPromises()

    const nextBtn = wrapper.find('[data-testid="revenue-next"]')
    expect((nextBtn.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('expands AI usage detail and renders rows', async () => {
    mockGetSummary.mockResolvedValue(ledgerData)
    mockGetAiUsage.mockResolvedValue({
      rows: [
        {
          id: 'ai-1',
          created_at: '2026-05-15T10:30:00Z',
          provider: 'gemini',
          model: 'gemini-2.5-flash',
          operation: 'generate_analysis',
          category: 'analysis',
          prompt_tokens: 12500,
          completion_tokens: 3200,
          total_tokens: 15700,
          latency_ms: 4500,
          estimated_cost_usd: 0.0045,
        },
      ],
      next_cursor: '',
    })
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.find('[data-testid="ai-usage-detail-toggle"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="ai-usage-detail-table"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="ai-usage-row-ai-1"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="ai-usage-row-ai-1"]').text()).toContain('gemini-2.5-flash')
  })

  it('passes category filter to AI usage detail query', async () => {
    mockGetSummary.mockResolvedValue(ledgerData)
    mockGetAiUsage.mockResolvedValue({ rows: [], next_cursor: '' })
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.find('[data-testid="ai-usage-detail-toggle"]').trigger('click')
    await flushPromises()

    const select = wrapper.find('[data-testid="ai-usage-category-filter"]')
    await select.setValue('chat')
    await flushPromises()

    const lastCall = mockGetAiUsage.mock.calls.at(-1)![0]
    expect(lastCall.category).toBe('chat')
  })

  it('collapses revenue detail and clears cursor on collapse', async () => {
    mockGetSummary.mockResolvedValue(ledgerData)
    mockGetRevenue.mockResolvedValue({ rows: [], next_cursor: '' })
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.find('[data-testid="revenue-detail-toggle"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="revenue-detail-empty"]').exists()).toBe(true)

    await wrapper.find('[data-testid="revenue-detail-toggle"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="revenue-detail-empty"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="revenue-detail-table"]').exists()).toBe(false)
  })
})
