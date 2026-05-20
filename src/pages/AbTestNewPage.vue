<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { abTestsApi } from '@/lib/api-abtests'
import type { ApiError } from '@/lib/api'

const router = useRouter()
const toast = useToast()

const assessmentId = ref('')
const templateKey = ref('')
const versionA = ref<number>(1)
const versionB = ref<number>(2)
const loading = ref(false)

async function handleSubmit() {
  loading.value = true
  try {
    const res = await abTestsApi.create(assessmentId.value, templateKey.value, versionA.value, versionB.value)
    toast.success(res.message)
    router.push({ name: 'ab-test-detail', params: { id: res.id } })
  } catch (e) {
    toast.error((e as ApiError).message || 'Terjadi kesalahan')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <button class="text-[11px] text-phosphor-dim hover:text-phosphor mb-2 uppercase min-h-[32px] inline-flex items-center" @click="router.push({ name: 'ab-tests' })">
      &lt;&lt;&lt; BACK TO A/B TESTS
    </button>
    <div class="heading-macro text-xl text-phosphor mb-1">NEW A/B TEST</div>
    <div class="text-[11px] text-phosphor-faint mb-4 sm:mb-6 uppercase">/// CREATE PROMPT COMPARISON TEST</div>

    <div class="border-2 border-crt-border p-3 sm:p-4">
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div>
          <label class="block text-[11px] text-phosphor-faint mb-1 uppercase">ASSESSMENT ID</label>
          <input
            v-model="assessmentId"
            class="w-full bg-crt-surface border border-crt-border px-2 py-2 text-base sm:text-xs text-phosphor focus:outline-none focus:border-hazard min-h-[44px] sm:min-h-0"
            placeholder="UUID of a completed assessment"
            required
          />
        </div>
        <div>
          <label class="block text-[11px] text-phosphor-faint mb-1 uppercase">TEMPLATE KEY</label>
          <input
            v-model="templateKey"
            class="w-full bg-crt-surface border border-crt-border px-2 py-2 text-base sm:text-xs text-phosphor focus:outline-none focus:border-hazard min-h-[44px] sm:min-h-0"
            placeholder="e.g. analysis.role"
            required
          />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-[11px] text-phosphor-faint mb-1 uppercase">VERSION A</label>
            <input
              v-model.number="versionA"
              type="number"
              min="1"
              class="w-full bg-crt-surface border border-crt-border px-2 py-2 text-base sm:text-xs text-phosphor focus:outline-none focus:border-hazard min-h-[44px] sm:min-h-0"
              required
            />
          </div>
          <div>
            <label class="block text-[11px] text-phosphor-faint mb-1 uppercase">VERSION B</label>
            <input
              v-model.number="versionB"
              type="number"
              min="1"
              class="w-full bg-crt-surface border border-crt-border px-2 py-2 text-base sm:text-xs text-phosphor focus:outline-none focus:border-hazard min-h-[44px] sm:min-h-0"
              required
            />
          </div>
        </div>

        <div class="text-[11px] text-phosphor-faint border border-crt-border p-2 uppercase">
          /// MAX 3 CONCURRENT PENDING/RUNNING TESTS
        </div>

        <div class="flex flex-col sm:flex-row gap-2">
          <button
            type="submit"
            class="border border-hazard px-3 text-[11px] text-hazard hover:bg-hazard hover:text-crt transition-colors min-h-[40px] w-full sm:w-auto"
            :disabled="loading || !assessmentId || !templateKey"
          >
            [ CREATE TEST ]
          </button>
          <button
            type="button"
            class="border border-crt-border px-3 text-[11px] text-phosphor-dim hover:text-phosphor hover:border-phosphor-dim transition-colors min-h-[40px] w-full sm:w-auto"
            @click="router.push({ name: 'ab-tests' })"
          >
            [ CANCEL ]
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
