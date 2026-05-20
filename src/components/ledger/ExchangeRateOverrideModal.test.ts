import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import ExchangeRateOverrideModal from '@/components/ledger/ExchangeRateOverrideModal.vue'

const mutateAsync = vi.fn()
const isPending = ref(false)

vi.mock('@/composables/useLedger', () => ({
  useUpdateExchangeRate: () => ({
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

function mountModal(currentRate: number | null = 16_500) {
  return mount(ExchangeRateOverrideModal, {
    props: { open: true, currentRate },
    attachTo: document.body,
  })
}

describe('ExchangeRateOverrideModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isPending.value = false
  })

  it('renders the form with rate prefilled from currentRate prop', () => {
    const wrapper = mountModal(16_780)
    expect(wrapper.text()).toContain('OVERRIDE EXCHANGE RATE')
    const input = wrapper.find('[data-testid="rate"]').element as HTMLInputElement
    expect(input.value).toBe('16780')
  })

  it('falls back to 16500 when no current rate is provided', () => {
    const wrapper = mountModal(null)
    const input = wrapper.find('[data-testid="rate"]').element as HTMLInputElement
    expect(input.value).toBe('16500')
  })

  it('rejects rate below 10,000', async () => {
    const wrapper = mountModal(16_500)
    await wrapper.find('[data-testid="rate"]').setValue('5000')
    await wrapper.find('[data-testid="reason"]').setValue('test')
    expect(wrapper.find('[data-testid="rate-error"]').text()).toContain('≥')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('rejects rate above 20,000', async () => {
    const wrapper = mountModal(16_500)
    await wrapper.find('[data-testid="rate"]').setValue('25000')
    await wrapper.find('[data-testid="reason"]').setValue('test')
    expect(wrapper.find('[data-testid="rate-error"]').text()).toContain('≤')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('rejects empty reason', async () => {
    const wrapper = mountModal(16_500)
    await wrapper.find('[data-testid="rate"]').setValue('16780')
    await wrapper.find('[data-testid="reason"]').setValue('')
    expect(wrapper.find('[data-testid="reason-error"]').text()).toContain('required')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('rejects whitespace-only reason', async () => {
    const wrapper = mountModal(16_500)
    await wrapper.find('[data-testid="rate"]').setValue('16780')
    await wrapper.find('[data-testid="reason"]').setValue('   ')
    expect(wrapper.find('[data-testid="reason-error"]').exists()).toBe(true)
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('submits valid payload and emits saved + close on success', async () => {
    mutateAsync.mockResolvedValue({ usd_to_idr: 16780, source: 'manual', updated_at: '', audit: [] })
    const wrapper = mountModal(16_500)
    await wrapper.find('[data-testid="rate"]').setValue('16780')
    await wrapper.find('[data-testid="reason"]').setValue('Locking rate for May reporting')

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mutateAsync).toHaveBeenCalledTimes(1)
    expect(mutateAsync).toHaveBeenCalledWith({
      usd_to_idr: 16780,
      reason: 'Locking rate for May reporting',
    })
    expect(toastSuccess).toHaveBeenCalledWith('Exchange rate updated')
    expect(wrapper.emitted('saved')).toHaveLength(1)
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('trims surrounding whitespace from reason before submitting', async () => {
    mutateAsync.mockResolvedValue({ usd_to_idr: 16780, source: 'manual', updated_at: '', audit: [] })
    const wrapper = mountModal(16_500)
    await wrapper.find('[data-testid="rate"]').setValue('16780')
    await wrapper.find('[data-testid="reason"]').setValue('  trimmed reason  ')

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mutateAsync).toHaveBeenCalledWith({
      usd_to_idr: 16780,
      reason: 'trimmed reason',
    })
  })

  it('shows API error and keeps modal open on failure', async () => {
    mutateAsync.mockRejectedValue({ message: 'rate must be greater than 1000', status: 400 })
    const wrapper = mountModal(16_500)
    await wrapper.find('[data-testid="rate"]').setValue('16780')
    await wrapper.find('[data-testid="reason"]').setValue('test')

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    const submitErr = wrapper.find('[data-testid="submit-error"]')
    expect(submitErr.exists()).toBe(true)
    expect(submitErr.text()).toContain('rate must be greater than 1000')
    expect(wrapper.emitted('close')).toBeUndefined()
    expect(wrapper.emitted('saved')).toBeUndefined()
  })

  it('emits close when CANCEL button is clicked', async () => {
    const wrapper = mountModal(16_500)
    const cancelBtn = wrapper.findAll('button').find((b) => b.text().includes('CANCEL'))!
    await cancelBtn.trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
