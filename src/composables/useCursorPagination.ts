import { ref, computed, type Ref } from 'vue'

export function useCursorPagination() {
  const cursorStack = ref<string[]>([]) as Ref<string[]>
  const currentCursor = ref<string | undefined>(undefined) as Ref<string | undefined>
  const nextCursor = ref<string | undefined>(undefined) as Ref<string | undefined>

  const hasNext = computed(() => !!nextCursor.value)
  const hasPrev = computed(() => cursorStack.value.length > 0)

  function goNext() {
    if (!nextCursor.value) return
    if (currentCursor.value) {
      cursorStack.value.push(currentCursor.value)
    } else {
      cursorStack.value.push('')
    }
    currentCursor.value = nextCursor.value
  }

  function goPrev() {
    const prev = cursorStack.value.pop()
    currentCursor.value = prev === '' ? undefined : prev
  }

  function reset() {
    cursorStack.value = []
    currentCursor.value = undefined
    nextCursor.value = undefined
  }

  function setNextCursor(cursor: string | undefined) {
    nextCursor.value = cursor
  }

  return {
    currentCursor,
    nextCursor,
    hasNext,
    hasPrev,
    goNext,
    goPrev,
    reset,
    setNextCursor,
  }
}
