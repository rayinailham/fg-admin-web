import { describe, it, expect } from 'vitest'
import { useCursorPagination } from '@/composables/useCursorPagination'

describe('useCursorPagination', () => {
  it('initializes with no cursor and no navigation', () => {
    const { currentCursor, hasNext, hasPrev } = useCursorPagination()

    expect(currentCursor.value).toBeUndefined()
    expect(hasNext.value).toBe(false)
    expect(hasPrev.value).toBe(false)
  })

  it('goNext advances cursor and enables prev', () => {
    const { currentCursor, hasNext, hasPrev, goNext, setNextCursor } = useCursorPagination()

    setNextCursor('cursor-page-2')
    expect(hasNext.value).toBe(true)

    goNext()

    expect(currentCursor.value).toBe('cursor-page-2')
    expect(hasPrev.value).toBe(true)
  })

  it('goPrev returns to previous cursor', () => {
    const { currentCursor, hasPrev, goNext, goPrev, setNextCursor } = useCursorPagination()

    setNextCursor('cursor-page-2')
    goNext()
    setNextCursor('cursor-page-3')
    goNext()

    expect(currentCursor.value).toBe('cursor-page-3')

    goPrev()
    expect(currentCursor.value).toBe('cursor-page-2')

    goPrev()
    expect(currentCursor.value).toBeUndefined()
    expect(hasPrev.value).toBe(false)
  })

  it('reset clears all state', () => {
    const { currentCursor, hasNext, hasPrev, goNext, reset, setNextCursor } = useCursorPagination()

    setNextCursor('cursor-page-2')
    goNext()
    setNextCursor('cursor-page-3')

    reset()

    expect(currentCursor.value).toBeUndefined()
    expect(hasNext.value).toBe(false)
    expect(hasPrev.value).toBe(false)
  })

  it('goNext does nothing when no next cursor', () => {
    const { currentCursor, goNext } = useCursorPagination()

    goNext()

    expect(currentCursor.value).toBeUndefined()
  })

  it('handles multi-page navigation correctly', () => {
    const { currentCursor, goNext, goPrev, setNextCursor } = useCursorPagination()

    setNextCursor('c1')
    goNext()
    expect(currentCursor.value).toBe('c1')

    setNextCursor('c2')
    goNext()
    expect(currentCursor.value).toBe('c2')

    setNextCursor('c3')
    goNext()
    expect(currentCursor.value).toBe('c3')

    goPrev()
    expect(currentCursor.value).toBe('c2')

    goPrev()
    expect(currentCursor.value).toBe('c1')

    goPrev()
    expect(currentCursor.value).toBeUndefined()
  })
})
