<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { gsap } from 'gsap'
import Sidebar from '@/components/Sidebar.vue'
import Topbar from '@/components/Topbar.vue'
import { motion, prefersReducedMotion } from '@/composables/useMotion'

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

// --- Route transitions (GSAP JS hooks on Vue <Transition>) ---
// Mode = "out-in" so the leaving page finishes before the next mounts.
// Keep the curve consistent with motion.short / power2.out everywhere.

function onPageEnter(el: Element, done: () => void) {
  if (prefersReducedMotion()) {
    gsap.set(el, { opacity: 1, y: 0 })
    done()
    return
  }
  gsap.fromTo(
    el,
    { opacity: 0, y: 6 },
    {
      opacity: 1,
      y: 0,
      duration: motion.short,
      ease: motion.ease,
      onComplete: () => {
        gsap.set(el, { clearProps: 'opacity,transform' })
        done()
      },
    },
  )
}

function onPageLeave(el: Element, done: () => void) {
  if (prefersReducedMotion()) {
    done()
    return
  }
  gsap.to(el, {
    opacity: 0,
    y: -4,
    duration: 0.16,
    ease: motion.easeIn,
    onComplete: done,
  })
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
        <RouterView v-slot="{ Component, route: r }">
          <Transition
            mode="out-in"
            :css="false"
            @enter="onPageEnter"
            @leave="onPageLeave"
          >
            <component :is="Component" :key="r.fullPath" />
          </Transition>
        </RouterView>
      </main>
    </div>
  </div>
</template>
