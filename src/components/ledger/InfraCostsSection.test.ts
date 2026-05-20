import { describe, it, expect, beforeEach, vi } from 'vitest'
import { reactive } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import InfraCostsSection from '@/components/ledger/InfraCostsSection.vue'

const mockGetInfraCosts = vi.fn()
const mockDeleteInfraCost = vi.fn()

vi.mock('@/lib/api-ledger', () => ({
  ledgerApi: {
    getInfraCosts: (...args: unknown[]) => mockGetInfraCosts(...args),
    deleteInfraCost: (...args: unknown[]) => mockDeleteInfraCost(...args),
    updateInfraCosts: vi.fn(),
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

const activeRows = [
  { category: 'database', cost_idr: 250000, effective_from: '2026-04-01T00:00:00Z', period_id: 'p1' },
  { category: 'redis', cost_idr: 100000, effective_from: '2026-01-01T00:00:00Z', period_id: 'p2' },
  { category: 'server', cost_idr: 800000, effective_from: '2026-05-01T00:00:00Z', period_id: 'p3' },
  { category: 'domain', cost_idr: 50000, effective_from: '2025-01-01T00:00:00Z', period_id: 'p4' },
  { category: 'other', cost_idr: 0 },
]

const historyRow = {
  id: 'hist-uuid-1',
  category: 'server',
  cost_idr: 800000,
  effective_from: '2026-05-01T00:00:00Z',
  note: 'Upgraded to 4 vCPU',
  created_by: 'admin@example.com',
  created_at: '2026-05-01T08:00:00Z',
}

function mountSection(isSuperadmin = false) {
  authMock.isSuperadmin = isSuperadmin
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return mount(InfraCostsSection, {
    props: { month: '2026-05' },
    global: { plugins: [[VueQueryPlugin, { queryClient }]] },
  })
}

describe('InfraCostsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMock.isSuperadmin = false
  })

  it('shows loading state while fetching', () => {
    mockGetInfraCosts.mockReturnValue(new Promise(() => {}))
    const wrapper = mountSection()
    expect(wrapper.find('[data-testid="infra-loading"]').exists()).toBe(true)
  })

  it('shows error state when query fails', async () => {
    mockGetInfraCosts.mockRejectedValue({ message: 'network error', status: 500 })
    const wrapper = mountSection()
    await flushPromises()
    expect(wrapper.find('[data-testid="infra-error"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="infra-error"]').text()).toContain('ERROR')
  })

  it('renders active basis table with all 5 categories', async () => {
    mockGetInfraCosts.mockResolvedValue({
      month: '2026-05',
      active: activeRows,
      total_idr: 1200000,
      history: [],
    })
    const wrapper = mountSection()
    await flushPromises()
    expect(wrapper.find('[data-testid="active-basis"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="active-DATABASE"]').exists()).toBe(false) // rows keyed by category
    expect(wrapper.text()).toContain('DATABASE')
    expect(wrapper.text()).toContain('REDIS')
    expect(wrapper.text()).toContain('SERVER')
    expect(wrapper.text()).toContain('OTHER')
  })

  it('hides EDIT button for non-superadmin', async () => {
    mockGetInfraCosts.mockResolvedValue({
      month: '2026-05',
      active: activeRows,
      total_idr: 1200000,
      history: [],
    })
    const wrapper = mountSection(false)
    await flushPromises()
    expect(wrapper.find('[data-testid="open-edit"]').exists()).toBe(false)
  })

  it('shows EDIT button for superadmin', async () => {
    mockGetInfraCosts.mockResolvedValue({
      month: '2026-05',
      active: activeRows,
      total_idr: 1200000,
      history: [],
    })
    const wrapper = mountSection(true)
    await flushPromises()
    expect(wrapper.find('[data-testid="open-edit"]').exists()).toBe(true)
  })

  it('expands audit table on toggle click', async () => {
    mockGetInfraCosts.mockResolvedValue({
      month: '2026-05',
      active: activeRows,
      total_idr: 1200000,
      history: [historyRow],
    })
    const wrapper = mountSection()
    await flushPromises()
    expect(wrapper.find('[data-testid="audit-table"]').exists()).toBe(false)
    await wrapper.find('[data-testid="audit-toggle"]').trigger('click')
    expect(wrapper.find('[data-testid="audit-table"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Upgraded to 4 vCPU')
  })

  it('collapses audit table on second toggle click', async () => {
    mockGetInfraCosts.mockResolvedValue({
      month: '2026-05',
      active: activeRows,
      total_idr: 1200000,
      history: [historyRow],
    })
    const wrapper = mountSection()
    await flushPromises()
    await wrapper.find('[data-testid="audit-toggle"]').trigger('click')
    await wrapper.find('[data-testid="audit-toggle"]').trigger('click')
    expect(wrapper.find('[data-testid="audit-table"]').exists()).toBe(false)
  })

  it('shows DELETE button in audit rows for superadmin', async () => {
    mockGetInfraCosts.mockResolvedValue({
      month: '2026-05',
      active: activeRows,
      total_idr: 1200000,
      history: [historyRow],
    })
    const wrapper = mountSection(true)
    await flushPromises()
    await wrapper.find('[data-testid="audit-toggle"]').trigger('click')
    expect(wrapper.find(`[data-testid="audit-delete-hist-uuid-1"]`).exists()).toBe(true)
  })

  it('hides DELETE button in audit rows for non-superadmin', async () => {
    mockGetInfraCosts.mockResolvedValue({
      month: '2026-05',
      active: activeRows,
      total_idr: 1200000,
      history: [historyRow],
    })
    const wrapper = mountSection(false)
    await flushPromises()
    await wrapper.find('[data-testid="audit-toggle"]').trigger('click')
    expect(wrapper.find(`[data-testid="audit-delete-hist-uuid-1"]`).exists()).toBe(false)
  })

  it('opens confirm dialog when delete button is clicked', async () => {
    mockGetInfraCosts.mockResolvedValue({
      month: '2026-05',
      active: activeRows,
      total_idr: 1200000,
      history: [historyRow],
    })
    const wrapper = mountSection(true)
    await flushPromises()
    await wrapper.find('[data-testid="audit-toggle"]').trigger('click')
    await wrapper.find(`[data-testid="audit-delete-hist-uuid-1"]`).trigger('click')
    expect(wrapper.find('[data-testid="confirm-delete"]').exists()).toBe(true)
  })

  it('calls deleteInfraCost mutation on confirm', async () => {
    mockGetInfraCosts.mockResolvedValue({
      month: '2026-05',
      active: activeRows,
      total_idr: 1200000,
      history: [historyRow],
    })
    mockDeleteInfraCost.mockResolvedValue(undefined)
    const wrapper = mountSection(true)
    await flushPromises()
    await wrapper.find('[data-testid="audit-toggle"]').trigger('click')
    await wrapper.find(`[data-testid="audit-delete-hist-uuid-1"]`).trigger('click')
    await wrapper.find('[data-testid="confirm-delete"]').trigger('click')
    await flushPromises()
    expect(mockDeleteInfraCost).toHaveBeenCalledWith('hist-uuid-1')
  })
})
