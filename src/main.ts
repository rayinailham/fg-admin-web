import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import App from './App.vue'
import { router } from './router'
import './assets/main.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(VueQueryPlugin, {
  queryClientConfig: {
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          const status = (error as { status?: number })?.status
          if (status === 401 || status === 403) return false
          return failureCount < 1
        },
        refetchOnWindowFocus: false,
        staleTime: 30_000,
      },
    },
  },
})

app.mount('#app')
