import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SummaryCard from '@/components/ledger/SummaryCard.vue'
import type { CompareData, LedgerResponse } from '@/lib/api-ledger'

function makeSummary(overrides: Partial<LedgerResponse> = {}): LedgerResponse {
  return {
    period: '2026-05',
    exchange_rate: { usd_to_idr: 16500, updated_at: '2026-05-15T06:00:00Z', source: 'auto' },
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
        breakdown: [{ category: 'database', cost_idr: 200000 }],
      },
      opportunity_cost: { tokens_granted: 50, equivalent_idr: 750000 },
      summary: {
        revenue_idr: 5000000,
        total_costs_idr: 547025,
        net_profit_idr: 4452975,
        profit_margin_percent: 89.06,
      },
    },
    ...overrides,
  } as LedgerResponse
}

function makeCompare(overrides = {}): CompareData {
  const s = makeSummary()
  return {
    current: s,
    previous: { ...s, period: '2026-04' },
    delta: {
      revenue_idr: { absolute: 500000, percent: 12.0 },
      ai_costs_idr: { absolute: -10000, percent: -5.0 },
      infra_costs_idr: { absolute: 0, percent: 0.0 },
      net_profit_idr: { absolute: 510000, percent: 18.0 },
      profit_margin_points: 3.2,
    },
    ...overrides,
  }
}

describe('SummaryCard', () => {
  it('shows loading placeholder when loading=true and no summary', () => {
    const wrapper = mount(SummaryCard, { props: { summary: null, loading: true } })
    expect(wrapper.find('[data-testid="summary-loading"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="metric-revenue"]').exists()).toBe(false)
  })

  it('shows error message when error prop is set', () => {
    const wrapper = mount(SummaryCard, {
      props: { summary: null, error: 'failed to load ledger' },
    })
    const err = wrapper.find('[data-testid="summary-error"]')
    expect(err.exists()).toBe(true)
    expect(err.text()).toContain('ERROR')
    expect(err.text()).toContain('FAILED TO LOAD LEDGER')
  })

  it('renders all 4 metric cards with full summary data', () => {
    const wrapper = mount(SummaryCard, { props: { summary: makeSummary() } })
    expect(wrapper.find('[data-testid="metric-revenue"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="metric-ai-costs"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="metric-infra-costs"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="metric-net-profit"]').exists()).toBe(true)
  })

  it('renders period and FX rate in header', () => {
    const wrapper = mount(SummaryCard, { props: { summary: makeSummary() } })
    expect(wrapper.text()).toContain('2026-05')
    expect(wrapper.find('[data-testid="fx-badge"]').text()).toContain('AUTO')
  })

  it('shows no delta indicators when compare is null', () => {
    const wrapper = mount(SummaryCard, {
      props: { summary: makeSummary(), compare: null },
    })
    expect(wrapper.find('[data-testid="revenue-delta"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="ai-costs-delta"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="net-profit-delta"]').exists()).toBe(false)
  })

  it('shows positive delta with green class for revenue increase', () => {
    const wrapper = mount(SummaryCard, {
      props: { summary: makeSummary(), compare: makeCompare() },
    })
    const el = wrapper.find('[data-testid="revenue-delta"]')
    expect(el.exists()).toBe(true)
    expect(el.text()).toContain('+12.0%')
    expect(el.text()).toContain('▲')
    expect(el.classes()).toContain('text-terminal-green')
  })

  it('shows green delta for AI costs decrease (inverse semantic)', () => {
    const wrapper = mount(SummaryCard, {
      props: { summary: makeSummary(), compare: makeCompare() },
    })
    const el = wrapper.find('[data-testid="ai-costs-delta"]')
    // -5% on a cost metric = good = green
    expect(el.classes()).toContain('text-terminal-green')
    expect(el.text()).toContain('-5.0%')
    expect(el.text()).toContain('▼')
  })

  it('shows [ NEW ] badge when delta percent is null', () => {
    const compare = makeCompare({
      delta: {
        revenue_idr: { absolute: 500000, percent: null },
        ai_costs_idr: { absolute: 0, percent: 0 },
        infra_costs_idr: { absolute: 0, percent: 0 },
        net_profit_idr: { absolute: 0, percent: 0 },
        profit_margin_points: 0,
      },
    })
    const wrapper = mount(SummaryCard, {
      props: { summary: makeSummary(), compare },
    })
    expect(wrapper.find('[data-testid="revenue-delta"]').text()).toContain('[ NEW ]')
  })

  it('shows margin delta from compare', () => {
    const wrapper = mount(SummaryCard, {
      props: { summary: makeSummary(), compare: makeCompare() },
    })
    const el = wrapper.find('[data-testid="margin-delta"]')
    expect(el.exists()).toBe(true)
    expect(el.text()).toContain('+3.2')
    expect(el.text()).toContain('pts')
  })

  it('uses danger color for negative net profit', () => {
    const summary = makeSummary({
      monthly: {
        ...makeSummary().monthly,
        summary: {
          revenue_idr: 100000,
          total_costs_idr: 600000,
          net_profit_idr: -500000,
          profit_margin_percent: -400,
        },
      },
    })
    const wrapper = mount(SummaryCard, { props: { summary } })
    const profitCard = wrapper.find('[data-testid="metric-net-profit"]')
    // The profit value element should carry danger class
    expect(profitCard.html()).toContain('text-danger')
  })

  it('renders manual FX badge with hazard class', () => {
    const summary = makeSummary({
      exchange_rate: { usd_to_idr: 16780, source: 'manual', updated_at: '2026-05-17T08:00:00Z' },
    })
    const wrapper = mount(SummaryCard, { props: { summary } })
    const badge = wrapper.find('[data-testid="fx-badge"]')
    expect(badge.text()).toContain('MANUAL')
    expect(badge.classes().some((c) => c.includes('hazard'))).toBe(true)
  })

  it('renders cached FX badge with dim class', () => {
    const summary = makeSummary({
      exchange_rate: { usd_to_idr: 16500, source: 'cached', updated_at: '2026-05-10T06:00:00Z' },
    })
    const wrapper = mount(SummaryCard, { props: { summary } })
    const badge = wrapper.find('[data-testid="fx-badge"]')
    expect(badge.text()).toContain('CACHED')
    expect(badge.classes().some((c) => c.includes('phosphor-dim'))).toBe(true)
  })

  it('renders fallback FX badge with danger class', () => {
    const summary = makeSummary({
      exchange_rate: { usd_to_idr: 16500, source: 'fallback', updated_at: '' },
    })
    const wrapper = mount(SummaryCard, { props: { summary } })
    const badge = wrapper.find('[data-testid="fx-badge"]')
    expect(badge.text()).toContain('FALLBACK')
    expect(badge.classes().some((c) => c.includes('danger'))).toBe(true)
  })
})
