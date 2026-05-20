<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import Sidebar from '@/components/Sidebar.vue'
import Topbar from '@/components/Topbar.vue'

const sidebarOpen = ref(false)
const route = useRoute()

// Auto-close sidebar on navigation (mobile UX)
watch(() => route.fullPath, () => {
  sidebarOpen.value = false
})

function openSidebar() {
  sidebarOpen.value = true
}

function closeSidebar() {
  sidebarOpen.value = false
}
</script>

<template>
  <div class="min-h-screen flex bg-crt">
    <!-- Skip navigation: visually hidden until focused (WCAG 2.4.1) -->
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-1.5 focus:text-[11px] focus:bg-crt focus:border focus:border-hazard focus:text-hazard"
    >
      Skip to main content
    </a>

    <!-- Backdrop (mobile only) -->
    <div
      v-if="sidebarOpen"
      class="lg:hidden fixed inset-0 bg-black/60 z-30"
      aria-hidden="true"
      @click="closeSidebar"
    ></div>

    <Sidebar :open="sidebarOpen" @close="closeSidebar" />

    <div class="flex-1 flex flex-col min-w-0">
      <Topbar @open-sidebar="openSidebar" />
      <main id="main-content" class="flex-1 p-3 sm:p-4 lg:p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>
