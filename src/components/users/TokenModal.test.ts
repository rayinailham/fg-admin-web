import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import TokenModal from '@/components/users/TokenModal.vue'

const mockGrantTokens = vi.fn()
const mockDeductTokens = vi.fn()

vi.mock('@/lib/api-users', () => ({
  usersApi: {
    grantTokens: (...args: unknown[]) => mockGrantTokens(...args),
    deductTokens: (...args: unknown[]) => mockDeductTokens(...args),
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

describe('TokenModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders grant mode title', () => {
    const wrapper = mount(TokenModal, {
      props: { open: true, userId: 'u1', mode: 'grant' },
    })

    expect(wrapper.text()).toContain('GRANT TOKENS')
  })

  it('renders deduct mode title', () => {
    const wrapper = mount(TokenModal, {
      props: { open: true, userId: 'u1', mode: 'deduct' },
    })

    expect(wrapper.text()).toContain('DEDUCT TOKENS')
  })

  it('calls grantTokens API on grant submit', async () => {
    mockGrantTokens.mockResolvedValue({ message: 'Tokens granted' })

    const wrapper = mount(TokenModal, {
      props: { open: true, userId: 'u1', mode: 'grant' },
    })

    await wrapper.find('input[type="number"]').setValue(5)
    await wrapper.find('textarea').setValue('Compensation for error')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockGrantTokens).toHaveBeenCalledWith('u1', 5, 'Compensation for error')
    expect(wrapper.emitted('saved')).toHaveLength(1)
  })

  it('calls deductTokens API on deduct submit', async () => {
    mockDeductTokens.mockResolvedValue({ message: 'Tokens deducted' })

    const wrapper = mount(TokenModal, {
      props: { open: true, userId: 'u1', mode: 'deduct' },
    })

    await wrapper.find('input[type="number"]').setValue(2)
    await wrapper.find('textarea').setValue('Policy violation')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockDeductTokens).toHaveBeenCalledWith('u1', 2, 'Policy violation')
    expect(wrapper.emitted('saved')).toHaveLength(1)
  })

  it('displays error on API failure', async () => {
    mockGrantTokens.mockRejectedValue({ message: 'insufficient token balance', status: 400 })

    const wrapper = mount(TokenModal, {
      props: { open: true, userId: 'u1', mode: 'grant' },
    })

    await wrapper.find('input[type="number"]').setValue(5)
    await wrapper.find('textarea').setValue('Test')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('insufficient token balance')
  })

  it('emits close when cancel is clicked', async () => {
    const wrapper = mount(TokenModal, {
      props: { open: true, userId: 'u1', mode: 'grant' },
    })

    const cancelBtn = wrapper.findAll('button').find((b) => b.text().includes('CANCEL'))!
    await cancelBtn.trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
