import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useToast } from '@/composables/useToast'

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    const { toasts } = useToast()
    toasts.value = []
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('adds an error toast', () => {
    const { error, toasts } = useToast()

    error('Something went wrong')

    expect(toasts.value).toHaveLength(1)
    expect(toasts.value[0]!.type).toBe('error')
    expect(toasts.value[0]!.message).toBe('Something went wrong')
  })

  it('adds a success toast', () => {
    const { success, toasts } = useToast()

    success('Operation completed')

    expect(toasts.value).toHaveLength(1)
    expect(toasts.value[0]!.type).toBe('success')
    expect(toasts.value[0]!.message).toBe('Operation completed')
  })

  it('auto-dismisses after 5 seconds', () => {
    const { error, toasts } = useToast()

    error('Temporary error')
    expect(toasts.value).toHaveLength(1)

    vi.advanceTimersByTime(5000)

    expect(toasts.value).toHaveLength(0)
  })

  it('supports countdown for rate-limited errors', () => {
    const { error, toasts } = useToast()

    error('Rate limited', 10)

    expect(toasts.value[0]!.countdown).toBe(10)

    vi.advanceTimersByTime(3000)
    expect(toasts.value[0]!.countdown).toBe(7)
  })

  it('dismisses countdown toast after countdown expires', () => {
    const { error, toasts } = useToast()

    error('Rate limited', 5)

    vi.advanceTimersByTime(5000)

    expect(toasts.value).toHaveLength(0)
  })

  it('manually dismisses a toast', () => {
    const { error, toasts, dismiss } = useToast()

    error('Dismissable')
    const id = toasts.value[0]!.id

    dismiss(id)

    expect(toasts.value).toHaveLength(0)
  })
})
