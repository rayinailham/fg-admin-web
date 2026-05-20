<script setup lang="ts">
import { RouterView } from 'vue-router'
import { gsap } from 'gsap'
import { motion, prefersReducedMotion } from '@/composables/useMotion'

function onEnter(el: Element, done: () => void) {
  if (prefersReducedMotion()) { done(); return }
  gsap.fromTo(
    el,
    { opacity: 0, y: 8 },
    {
      opacity: 1, y: 0,
      duration: motion.medium,
      ease: motion.ease,
      onComplete: () => { gsap.set(el, { clearProps: 'opacity,transform' }); done() },
    },
  )
}

function onLeave(el: Element, done: () => void) {
  if (prefersReducedMotion()) { done(); return }
  gsap.to(el, { opacity: 0, y: -4, duration: 0.16, ease: motion.easeIn, onComplete: done })
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-crt px-4 py-8">
    <RouterView v-slot="{ Component, route: r }">
      <Transition mode="out-in" :css="false" @enter="onEnter" @leave="onLeave">
        <component :is="Component" :key="r.fullPath" />
      </Transition>
    </RouterView>
  </div>
</template>
