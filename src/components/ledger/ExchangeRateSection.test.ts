import { describe, it, expect, beforeEach, vi } from 'vitest'
import { reactive } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import ExchangeRateSection from '@/components/ledger/ExchangeRateSection.vue'

const mockGetExchangeRate = vi.fn()
const mockRefreshExchangeRate = vi.fn()
const mockUpdateExchangeRate = vi.fn()

vi.mock('@/lib/api-ledger', () => ({
  ledgerApi: {
    getExchangeRate: (...args: unknown[]) => mockGetExchangeRate(...args),
    refreshExchangeRate: (...args: unknown[]) => mockRefreshExchangeRate(...args),
    updateExchangeRate: (...args: unknown[]) => mockUpdateExchangeRate(...args),
  },
}))

vi.mock('@/composables/useToast', () => ({
  useToast: () => ({
    error: vi.fn(),
    success: vi.fn(),
    dismiss: vi.fn(),
    toasts: { value: [] },
  }),
}))

// reactive() proxy → template v-if gets a plain boolean, not a Ref object
const authMock = reactive({ isSuperadmin: false })
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => authMock,
}))

function makeRate(source: 'auto' | 'manual' | 'cached' | 'fallback') {
  return {
    usd_to_idr: 16500,
    source,
    updated_at: '2026-05-15T06:00:00Z',
    audit: [
      {
        id: 1,
        old_value: '16400.00',
        new_value: '16500.00',
        changed_by: 'admin@example.com',
        changed_at: '2026-05-15T06:00:00Z',
        reason: 'Monthly update',
      },
    ],
  }
}

function mountSection(isSuperadmin = false) {
  authMock.isSuperadmin = isSuperadmin
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return mount(ExchangeRateSection, {
    global: { plugins: [[VueQueryPlugin, { queryClient }]] },
  })
}

describe('ExchangeRateSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMock.isSuperadmin = false
  })

  it('shows loading state while fetching', () => {
    mockGetExchangeRate.mockReturnValue(new Promise(() => {}))
    const wrapper = mountSection()
    expect(wrapper.find('[data-testid="fx-loading"]').exists()).toBe(true)
  })

  it('shows error state when query fails', async () => {
    mockGetExchangeRate.mockRejectedValue({ message: 'fetch error', status: 500 })
    const wrapper = mountSection()
    await flushPromises()
    expect(wrapper.find('[data-testid="fx-error"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="fx-error"]').text()).toContain('ERROR')
  })

  it('renders rate and source data', async () => {
    mockGetExchangeRate.mockResolvedValue(makeRate('auto'))
    const wrapper = mountSection()
    await flushPromises()
    expect(wrapper.find('[data-testid="fx-data"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="fx-source-badge"]').text()).toContain('AUTO')
  })

  it('shows green badge for auto source', async () => {
    mockGetExchangeRate.mockResolvedValue(makeRate('auto'))
    const wrapper = mountSection()
    await flushPromises()
    const badge = wrapper.find('[data-testid="fx-source-badge"]')
    expect(badge.classes().some((c) => c.includes('terminal-green'))).toBe(true)
  })

  it('shows teal hazard badge for manual source', async () => {
    mockGetExchangeRate.mockResolvedValue(makeRate('manual'))
    const wrapper = mountSection()
    await flushPromises()
    const badge = wrapper.find('[data-testid="fx-source-badge"]')
    expect(badge.text()).toContain('MANUAL')
    expect(badge.classes().some((c) => c.includes('hazard'))).toBe(true)
  })

  it('shows dim badge and warning for cached source', async () => {
    mockGetExchangeRate.mockResolvedValue(makeRate('cached'))
    const wrapper = mountSection()
    await flushPromises()
    expect(wrapper.find('[data-testid="fx-source-badge"]').text()).toContain('CACHED')
    expect(wrapper.find('[data-testid="fx-warning"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="fx-warning"]').text()).toContain('Upstream API failed')
  })

  it('shows danger badge and warning for fallback source', async () => {
    mockGetExchangeRate.mockResolvedValue(makeRate('fallback'))
    const wrapper = mountSection()
    await flushPromises()
    const badge = wrapper.find('[data-testid="fx-source-badge"]')
    expect(badge.text()).toContain('FALLBACK')
    expect(badge.classes().some((c) => c.includes('danger'))).toBe(true)
    expect(wrapper.find('[data-testid="fx-warning"]').text()).toContain('No rate has ever been stored')
  })

  it('refresh label is "REFRESH FROM API" for auto source', async () => {
    mockGetExchangeRate.mockResolvedValue(makeRate('auto'))
    const wrapper = mountSection(true)
    await flushPromises()
    expect(wrapper.find('[data-testid="refresh-button"]').text()).toContain('REFRESH FROM API')
  })

  it('refresh label is "UNLOCK & REFRESH" for manual source', async () => {
    mockGetExchangeRate.mockResolvedValue(makeRate('manual'))
    const wrapper = mountSection(true)
    await flushPromises()
    expect(wrapper.find('[data-testid="refresh-button"]').text()).toContain('UNLOCK & REFRESH')
  })

  it('refresh label is "RETRY UPSTREAM" for cached source', async () => {
    mockGetExchangeRate.mockResolvedValue(makeRate('cached'))
    const wrapper = mountSection(true)
    await flushPromises()
    expect(wrapper.find('[data-testid="refresh-button"]').text()).toContain('RETRY UPSTREAM')
  })

  it('refresh label is "FETCH RATE" for fallback source', async () => {
    mockGetExchangeRate.mockResolvedValue(makeRate('fallback'))
    const wrapper = mountSection(true)
    await flushPromises()
    expect(wrapper.find('[data-testid="refresh-button"]').text()).toContain('FETCH RATE')
  })

  it('hides OVERRIDE RATE and REFRESH buttons for non-superadmin', async () => {
    mockGetExchangeRate.mockResolvedValue(makeRate('auto'))
    const wrapper = mountSection(false)
    await flushPromises()
    expect(wrapper.find('[data-testid="open-override"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="refresh-button"]').exists()).toBe(false)
  })

  it('shows OVERRIDE RATE and REFRESH buttons for superadmin', async () => {
    mockGetExchangeRate.mockResolvedValue(makeRate('auto'))
    const wrapper = mountSection(true)
    await flushPromises()
    expect(wrapper.find('[data-testid="open-override"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="refresh-button"]').exists()).toBe(true)
  })

  it('clicking refresh on auto source triggers mutation directly (no confirm step)', async () => {
    mockGetExchangeRate.mockResolvedValue(makeRate('auto'))
    mockRefreshExchangeRate.mockResolvedValue(makeRate('auto'))
    const wrapper = mountSection(true)
    await flushPromises()
    await wrapper.find('[data-testid="refresh-button"]').trigger('click')
    await flushPromises()
    // Mutation fires immediately for non-manual sources — no intermediate confirm step needed
    expect(mockRefreshExchangeRate).toHaveBeenCalledTimes(1)
  })

  it('clicking refresh on manual source shows confirm before firing mutation', async () => {
    mockGetExchangeRate.mockResolvedValue(makeRate('manual'))
    const wrapper = mountSection(true)
    await flushPromises()
    await wrapper.find('[data-testid="refresh-button"]').trigger('click')
    // Mutation must NOT have fired yet — user must confirm first
    expect(mockRefreshExchangeRate).not.toHaveBeenCalled()
  })

  it('confirm dialog: confirming refresh triggers mutation', async () => {
    mockGetExchangeRate.mockResolvedValue(makeRate('manual'))
    mockRefreshExchangeRate.mockResolvedValue(makeRate('auto'))
    const wrapper = mountSection(true)
    await flushPromises()
    await wrapper.find('[data-testid="refresh-button"]').trigger('click')
    await wrapper.find('[data-testid="confirm-refresh"]').trigger('click')
    await flushPromises()
    expect(mockRefreshExchangeRate).toHaveBeenCalledTimes(1)
  })

  it('expands and collapses audit table', async () => {
    mockGetExchangeRate.mockResolvedValue(makeRate('auto'))
    const wrapper = mountSection()
    await flushPromises()
    expect(wrapper.find('[data-testid="fx-audit-table"]').exists()).toBe(false)
    await wrapper.find('[data-testid="fx-audit-toggle"]').trigger('click')
    expect(wrapper.find('[data-testid="fx-audit-table"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Monthly update')
    await wrapper.find('[data-testid="fx-audit-toggle"]').trigger('click')
    expect(wrapper.find('[data-testid="fx-audit-table"]').exists()).toBe(false)
  })

  it('shows empty audit message when no history', async () => {
    mockGetExchangeRate.mockResolvedValue({
      ...makeRate('auto'),
      audit: [],
    })
    const wrapper = mountSection()
    await flushPromises()
    await wrapper.find('[data-testid="fx-audit-toggle"]').trigger('click')
    expect(wrapper.text()).toContain('NO AUDIT ENTRIES')
  })
})
