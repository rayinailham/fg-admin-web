import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ResetPasswordModal from '@/components/users/ResetPasswordModal.vue'

const mockResetPassword = vi.fn()

vi.mock('@/lib/api-users', () => ({
  usersApi: {
    resetPassword: (...args: unknown[]) => mockResetPassword(...args),
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

describe('ResetPasswordModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders reset form with optional password field', () => {
    const wrapper = mount(ResetPasswordModal, {
      props: { open: true, userId: 'u1' },
    })

    expect(wrapper.text()).toContain('RESET USER PASSWORD')
    expect(wrapper.find('input').exists()).toBe(true)
    expect(wrapper.text()).toContain('Leave empty for auto-generated')
  })

  it('calls resetPassword with empty password for auto-generate', async () => {
    mockResetPassword.mockResolvedValue({
      message: 'Password reset successful',
      temporary_password: 'AutoGen@123',
      sessions_revoked: true,
    })

    const wrapper = mount(ResetPasswordModal, {
      props: { open: true, userId: 'u1' },
    })

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockResetPassword).toHaveBeenCalledWith('u1', undefined)
  })

  it('calls resetPassword with provided password', async () => {
    mockResetPassword.mockResolvedValue({
      message: 'Password reset successful',
      temporary_password: 'Custom@Pass1',
      sessions_revoked: true,
    })

    const wrapper = mount(ResetPasswordModal, {
      props: { open: true, userId: 'u1' },
    })

    await wrapper.find('input').setValue('Custom@Pass1')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockResetPassword).toHaveBeenCalledWith('u1', 'Custom@Pass1')
  })

  it('displays temporary password after successful reset', async () => {
    mockResetPassword.mockResolvedValue({
      message: 'Password reset successful',
      temporary_password: 'TempP@ss789',
      sessions_revoked: true,
    })

    const wrapper = mount(ResetPasswordModal, {
      props: { open: true, userId: 'u1' },
    })

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('TempP@ss789')
    expect(wrapper.text()).toContain('COPY')
    expect(wrapper.text()).toContain('won\'t be shown again')
  })

  it('displays error on API failure', async () => {
    mockResetPassword.mockRejectedValue({ message: 'password must be at least 8 characters', status: 400 })

    const wrapper = mount(ResetPasswordModal, {
      props: { open: true, userId: 'u1' },
    })

    await wrapper.find('input').setValue('short')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('password must be at least 8 characters')
  })

  it('emits close when DONE is clicked after reset', async () => {
    mockResetPassword.mockResolvedValue({
      message: 'Password reset successful',
      temporary_password: 'TempP@ss789',
      sessions_revoked: true,
    })

    const wrapper = mount(ResetPasswordModal, {
      props: { open: true, userId: 'u1' },
    })

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    const doneBtn = wrapper.findAll('button').find((b) => b.text().includes('DONE'))!
    await doneBtn.trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
