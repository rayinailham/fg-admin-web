import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { createRouter, createMemoryHistory } from 'vue-router'
import LoginPage from '@/pages/LoginPage.vue'

const mockLogin = vi.fn()

vi.mock('@/lib/api', () => ({
  authApi: {
    login: (...args: unknown[]) => mockLogin(...args),
  },
}))

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', name: 'login', component: { template: '<div />' } },
      { path: '/app/overview', name: 'overview', component: { template: '<div />' } },
      { path: '/change-password', name: 'change-password', component: { template: '<div />' } },
    ],
  })
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders login form with email and password fields', () => {
    const router = createTestRouter()
    const wrapper = mount(LoginPage, {
      global: {
        plugins: [
          createTestingPinia({ createSpy: vi.fn }),
          router,
        ],
      },
    })

    expect(wrapper.find('input[type="email"]').exists()).toBe(true)
    expect(wrapper.find('input[type="password"]').exists()).toBe(true)
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true)
  })

  it('calls authApi.login on form submit', async () => {
    mockLogin.mockResolvedValue({ token: 'fake.eyJzdWIiOiIxMjMiLCJlbWFpbCI6ImFAYi5jIiwicm9sZSI6ImFkbWluIiwibXVzdF9jaGFuZ2VfcGFzc3dvcmQiOmZhbHNlLCJleHAiOjk5OTk5OTk5OTl9.sig' })

    const router = createTestRouter()
    await router.push('/login')
    await router.isReady()

    const wrapper = mount(LoginPage, {
      global: {
        plugins: [
          createTestingPinia({ createSpy: vi.fn }),
          router,
        ],
      },
    })

    await wrapper.find('input[type="email"]').setValue('admin@futureguide.id')
    await wrapper.find('input[type="password"]').setValue('password123')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockLogin).toHaveBeenCalledWith('admin@futureguide.id', 'password123')
  })

  it('displays error message on login failure', async () => {
    mockLogin.mockRejectedValue({ message: 'Email atau password salah', status: 401 })

    const router = createTestRouter()
    const wrapper = mount(LoginPage, {
      global: {
        plugins: [
          createTestingPinia({ createSpy: vi.fn }),
          router,
        ],
      },
    })

    await wrapper.find('input[type="email"]').setValue('wrong@test.com')
    await wrapper.find('input[type="password"]').setValue('wrong')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Email atau password salah')
  })
})
