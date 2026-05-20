import { ref } from 'vue'

export interface Toast {
  id: number
  message: string
  type: 'error' | 'success'
  countdown?: number
}

const toasts = ref<Toast[]>([])
let nextId = 0

export function useToast() {
  function add(message: string, type: 'error' | 'success', countdown?: number) {
    const id = nextId++
    toasts.value.push({ id, message, type, countdown })

    if (countdown && countdown > 0) {
      const interval = setInterval(() => {
        const toast = toasts.value.find((t) => t.id === id)
        if (toast && toast.countdown !== undefined && toast.countdown > 0) {
          toast.countdown--
        } else {
          clearInterval(interval)
        }
      }, 1000)
      setTimeout(() => {
        clearInterval(interval)
        dismiss(id)
      }, countdown * 1000)
    } else {
      setTimeout(() => dismiss(id), 5000)
    }
  }

  function error(message: string, countdown?: number) {
    add(message, 'error', countdown)
  }

  function success(message: string) {
    add(message, 'success')
  }

  function dismiss(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  return { toasts, error, success, dismiss }
}
