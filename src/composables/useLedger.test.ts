import { describe, it, expect, beforeEach, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import {
  ledgerKeys,
  useUpdateInfraCosts,
  useDeleteInfraCostPeriod,
  useUpdateExchangeRate,
  useRefreshExchangeRate,
} from '@/composables/useLedger'

const mockApi = {
  updateInfraCosts: vi.fn(),
  deleteInfraCost: vi.fn(),
  updateExchangeRate: vi.fn(),
  refreshExchangeRate: vi.fn(),
}

vi.mock('@/lib/api-ledger', () => ({
  ledgerApi: {
    updateInfraCosts: (...args: unknown[]) => mockApi.updateInfraCosts(...args),
    deleteInfraCost: (...args: unknown[]) => mockApi.deleteInfraCost(...args),
    updateExchangeRate: (...args: unknown[]) => mockApi.updateExchangeRate(...args),
    refreshExchangeRate: (...args: unknown[]) => mockApi.refreshExchangeRate(...args),
  },
}))

function makeHarness<T>(useHook: () => T) {
  let captured: T
  const Harness = defineComponent({
    setup() {
      captured = useHook()
      return () => h('div')
    },
  })
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
  const wrapper = mount(Harness, {
    global: { plugins: [[VueQueryPlugin, { queryClient }]] },
  })
  return { wrapper, queryClient, invalidateSpy, get hook() { return captured } }
}

function invalidatedKeys(spy: ReturnType<typeof vi.spyOn>): unknown[] {
  return spy.mock.calls.map((c: unknown[]) => (c[0] as { queryKey: unknown }).queryKey)
}

describe('ledgerKeys', () => {
  it('produces stable summary key', () => {
    expect(ledgerKeys.summary('2026-05')).toEqual(['ledger', 'summary', '2026-05'])
  })

  it('produces stable months key', () => {
    expect(ledgerKeys.months()).toEqual(['ledger', 'months'])
  })

  it('produces stable compare key', () => {
    expect(ledgerKeys.compare('2026-05', 'prev')).toEqual(['ledger', 'compare', '2026-05', 'prev'])
  })

  it('produces stable infraCosts key', () => {
    expect(ledgerKeys.infraCosts('2026-05')).toEqual(['ledger', 'infraCosts', '2026-05'])
  })

  it('produces stable exchangeRate key', () => {
    expect(ledgerKeys.exchangeRate()).toEqual(['ledger', 'exchangeRate'])
  })

  it('keeps revenue and aiUsage keys distinct under the same root', () => {
    const r = ledgerKeys.revenue('2026-05', '', undefined)
    const a = ledgerKeys.aiUsage('2026-05', '', {})
    expect(r[0]).toBe('ledger')
    expect(a[0]).toBe('ledger')
    expect(r[1]).toBe('revenue')
    expect(a[1]).toBe('aiUsage')
  })
})

describe('useUpdateInfraCosts', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('invalidates infraCosts, summary, and compare on success', async () => {
    mockApi.updateInfraCosts.mockResolvedValue({ month: '2026-06', active: [], total_idr: 0, history: [] })
    const { hook, invalidateSpy } = makeHarness(() => useUpdateInfraCosts())

    hook.mutate({ effective_from: '2026-06-01', items: [{ category: 'database', cost_idr: 250000 }] })
    await flushPromises()
    await nextTick()

    const keys = invalidatedKeys(invalidateSpy)
    expect(keys).toContainEqual(['ledger', 'infraCosts'])
    expect(keys).toContainEqual(['ledger', 'summary'])
    expect(keys).toContainEqual(['ledger', 'compare'])
  })
})

describe('useDeleteInfraCostPeriod', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('invalidates the same scope as update on success', async () => {
    mockApi.deleteInfraCost.mockResolvedValue(undefined)
    const { hook, invalidateSpy } = makeHarness(() => useDeleteInfraCostPeriod())

    hook.mutate('period-uuid')
    await flushPromises()
    await nextTick()

    const keys = invalidatedKeys(invalidateSpy)
    expect(keys).toContainEqual(['ledger', 'infraCosts'])
    expect(keys).toContainEqual(['ledger', 'summary'])
    expect(keys).toContainEqual(['ledger', 'compare'])
  })
})

describe('useUpdateExchangeRate', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('invalidates exchangeRate, summary, and compare on success', async () => {
    mockApi.updateExchangeRate.mockResolvedValue({ usd_to_idr: 16780, source: 'manual', updated_at: '', audit: [] })
    const { hook, invalidateSpy } = makeHarness(() => useUpdateExchangeRate())

    hook.mutate({ usd_to_idr: 16780, reason: 'lock for May' })
    await flushPromises()
    await nextTick()

    const keys = invalidatedKeys(invalidateSpy)
    expect(keys).toContainEqual(['ledger', 'exchangeRate'])
    expect(keys).toContainEqual(['ledger', 'summary'])
    expect(keys).toContainEqual(['ledger', 'compare'])
  })
})

describe('useRefreshExchangeRate', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('invalidates full scope on success', async () => {
    mockApi.refreshExchangeRate.mockResolvedValue({ usd_to_idr: 16500, source: 'auto', updated_at: '', audit: [] })
    const { hook, invalidateSpy } = makeHarness(() => useRefreshExchangeRate())

    hook.mutate()
    await flushPromises()
    await nextTick()

    const keys = invalidatedKeys(invalidateSpy)
    expect(keys).toContainEqual(['ledger', 'exchangeRate'])
    expect(keys).toContainEqual(['ledger', 'summary'])
    expect(keys).toContainEqual(['ledger', 'compare'])
  })

  it('invalidates only exchangeRate on error (502 upstream failed)', async () => {
    mockApi.refreshExchangeRate.mockRejectedValue({ message: 'exchange rate refresh failed', status: 502 })
    const { hook, invalidateSpy } = makeHarness(() => useRefreshExchangeRate())

    hook.mutate()
    await flushPromises()
    await nextTick()

    const keys = invalidatedKeys(invalidateSpy)
    expect(keys).toContainEqual(['ledger', 'exchangeRate'])
    expect(keys).not.toContainEqual(['ledger', 'summary'])
    expect(keys).not.toContainEqual(['ledger', 'compare'])
  })
})
