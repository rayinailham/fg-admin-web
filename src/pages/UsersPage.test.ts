import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { createRouter, createMemoryHistory } from 'vue-router'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import UsersPage from '@/pages/UsersPage.vue'

const mockUsersList = vi.fn()

vi.mock('@/lib/api-users', () => ({
  usersApi: {
    list: (...args: unknown[]) => mockUsersList(...args),
  },
}))

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/app/users', name: 'users', component: { template: '<div />' } },
      { path: '/app/users/:id', name: 'user-detail', component: { template: '<div />' } },
    ],
  })
}

function mountUsersPage() {
  const router = createTestRouter()
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return mount(UsersPage, {
    global: {
      plugins: [
        createTestingPinia({ createSpy: vi.fn }),
        router,
        [VueQueryPlugin, { queryClient }],
      ],
    },
  })
}

describe('UsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders filter form and table', async () => {
    mockUsersList.mockResolvedValue({ users: [] })

    const wrapper = mountUsersPage()
    await flushPromises()

    expect(wrapper.text()).toContain('USERS')
    expect(wrapper.text()).toContain('FILTERS')
    expect(wrapper.find('input[placeholder="SEARCH..."]').exists()).toBe(true)
    expect(wrapper.text()).toContain('[ NO RECORDS FOUND ]')
  })

  it('displays users from API response', async () => {
    mockUsersList.mockResolvedValue({
      users: [
        {
          id: 'u1',
          full_name: 'John Doe',
          email: 'john@test.com',
          school_name: 'SMA 1',
          registered_at: '2026-05-10T08:00:00Z',
          email_verified: true,
          suspended: false,
          token_balance: 3,
          assessment_count: 5,
          last_assessment_at: null,
        },
      ],
    })

    const wrapper = mountUsersPage()
    await flushPromises()

    expect(wrapper.text()).toContain('John Doe')
    expect(wrapper.text()).toContain('john@test.com')
    expect(wrapper.text()).toContain('SMA 1')
  })

  it('shows loading state', () => {
    mockUsersList.mockReturnValue(new Promise(() => {}))

    const wrapper = mountUsersPage()

    expect(wrapper.text()).toContain('LOADING')
  })
})
