import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import InfraCostsEditModal from '@/components/ledger/InfraCostsEditModal.vue'

const mutateAsync = vi.fn()
const isPending = ref(false)

vi.mock('@/composables/useLedger', () => ({
  useUpdateInfraCosts: () => ({
    mutateAsync,
    isPending,
  }),
}))

const toastError = vi.fn()
const toastSuccess = vi.fn()

vi.mock('@/composables/useToast', () => ({
  useToast: () => ({
    error: toastError,
    success: toastSuccess,
    dismiss: vi.fn(),
    toasts: { value: [] },
  }),
}))

function nextMonthFirst(): string {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth() + 1
  const year = m > 11 ? y + 1 : y
  const month = ((m % 12) + 1).toString().padStart(2, '0')
  return `${year}-${month}-01`
}

function mountModal() {
  return mount(InfraCostsEditModal, {
    props: { open: true },
    attachTo: document.body,
  })
}

describe('InfraCostsEditModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isPending.value = false
  })

  it('renders the form with all 5 categories', () => {
    const wrapper = mountModal()
    expect(wrapper.text()).toContain('EDIT INFRA COSTS')
    expect(wrapper.find('[data-testid="include-database"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="include-redis"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="include-server"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="include-domain"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="include-other"]').exists()).toBe(true)
  })

  it('defaults effective_from to first of next month', () => {
    const wrapper = mountModal()
    const input = wrapper.find('[data-testid="effective-from"]').element as HTMLInputElement
    expect(input.value).toBe(nextMonthFirst())
  })

  it('rejects submission when no category is selected', async () => {
    const wrapper = mountModal()
    expect(wrapper.find('[data-testid="items-error"]').text()).toContain('select at least one')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('rejects effective_from that is not day 1 of a month', async () => {
    const wrapper = mountModal()
    await wrapper.find('[data-testid="include-database"]').setValue(true)
    await wrapper.find('[data-testid="effective-from"]').setValue('2026-06-15')
    expect(wrapper.find('[data-testid="date-error"]').text()).toContain('day 1')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('rejects effective_from that is more than one month in the future', async () => {
    const wrapper = mountModal()
    await wrapper.find('[data-testid="include-database"]').setValue(true)
    // Push 24 months out — definitely beyond max
    const now = new Date()
    const farFuture = `${now.getUTCFullYear() + 2}-01-01`
    await wrapper.find('[data-testid="effective-from"]').setValue(farFuture)
    expect(wrapper.find('[data-testid="date-error"]').text()).toContain('max allowed')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('rejects cost above the 1,000,000,000 ceiling', async () => {
    const wrapper = mountModal()
    await wrapper.find('[data-testid="include-server"]').setValue(true)
    await wrapper.find('[data-testid="cost-server"]').setValue(2_000_000_000)
    expect(wrapper.find('[data-testid="items-error"]').text()).toContain('1,000,000,000')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('submits valid payload and emits saved + close on success', async () => {
    mutateAsync.mockResolvedValue({ month: '2026-06', active: [], total_idr: 0, history: [] })
    const wrapper = mountModal()
    await wrapper.find('[data-testid="include-database"]').setValue(true)
    await wrapper.find('[data-testid="cost-database"]').setValue(250000)
    await wrapper.find('[data-testid="include-server"]').setValue(true)
    await wrapper.find('[data-testid="cost-server"]').setValue(800000)
    await wrapper.find('[data-testid="note"]').setValue('Q3 baseline')

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mutateAsync).toHaveBeenCalledTimes(1)
    const payload = mutateAsync.mock.calls[0]![0]
    expect(payload.effective_from).toBe(nextMonthFirst())
    expect(payload.note).toBe('Q3 baseline')
    expect(payload.items).toEqual([
      { category: 'database', cost_idr: 250000 },
      { category: 'server', cost_idr: 800000 },
    ])
    expect(toastSuccess).toHaveBeenCalledWith('Infra costs updated')
    expect(wrapper.emitted('saved')).toHaveLength(1)
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('shows 409 conflict message and keeps modal open', async () => {
    mutateAsync.mockRejectedValue({
      message: 'cost period already exists for this category and month',
      status: 409,
    })
    const wrapper = mountModal()
    await wrapper.find('[data-testid="include-database"]').setValue(true)
    await wrapper.find('[data-testid="cost-database"]').setValue(250000)

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    const submitErr = wrapper.find('[data-testid="submit-error"]')
    expect(submitErr.exists()).toBe(true)
    expect(submitErr.text()).toContain('already exists')
    expect(toastError).toHaveBeenCalledWith('cost period already exists for this category and month')
    expect(wrapper.emitted('close')).toBeUndefined()
    expect(wrapper.emitted('saved')).toBeUndefined()
  })

  it('shows generic error message on non-409 failure', async () => {
    mutateAsync.mockRejectedValue({ message: 'validation failed', status: 400 })
    const wrapper = mountModal()
    await wrapper.find('[data-testid="include-database"]').setValue(true)
    await wrapper.find('[data-testid="cost-database"]').setValue(250000)

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    const submitErr = wrapper.find('[data-testid="submit-error"]')
    expect(submitErr.exists()).toBe(true)
    expect(submitErr.text()).toContain('validation failed')
    expect(wrapper.emitted('close')).toBeUndefined()
  })

  it('emits close when CANCEL button is clicked', async () => {
    const wrapper = mountModal()
    const cancelBtn = wrapper.findAll('button').find((b) => b.text().includes('CANCEL'))!
    await cancelBtn.trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
