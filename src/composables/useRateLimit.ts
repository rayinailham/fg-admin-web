import { ref } from 'vue'

const remaining = ref<number | null>(null)
const limit = ref<number | null>(null)
const lastUpdated = ref<number | null>(null)

export function useRateLimit() {
  function update(response: Response) {
    const rem = response.headers.get('X-RateLimit-Remaining')
    const lim = response.headers.get('X-RateLimit-Limit')
    if (rem !== null) {
      remaining.value = parseInt(rem, 10)
      lastUpdated.value = Date.now()
    }
    if (lim !== null) {
      limit.value = parseInt(lim, 10)
    }
  }

  return {
    remaining,
    limit,
    lastUpdated,
    update,
  }
}
