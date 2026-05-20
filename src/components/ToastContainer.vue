<script setup lang="ts">
import { gsap } from 'gsap'
import { useToast } from '@/composables/useToast'
import { motion, prefersReducedMotion } from '@/composables/useMotion'

const { toasts, dismiss } = useToast()

function onEnter(el: Element, done: () => void) {
  if (prefersReducedMotion()) { done(); return }
  gsap.fromTo(
    el,
    { opacity: 0, x: 16, scale: 0.98 },
    {
      opacity: 1, x: 0, scale: 1,
      duration: motion.short,
      ease: motion.ease,
      onComplete: () => { gsap.set(el, { clearProps: 'transform' }); done() },
    },
  )
}

function onLeave(el: Element, done: () => void) {
  if (prefersReducedMotion()) { done(); return }
  gsap.to(el, {
    opacity: 0, x: 24, scale: 0.98,
    duration: 0.18, ease: motion.easeIn,
    onComplete: done,
  })
}
</script>

<template>
  <div class="fixed top-4 right-4 z-[9998] flex flex-col gap-2 w-[380px]">
    <TransitionGroup tag="div" :css="false" @enter="onEnter" @leave="onLeave" class="flex flex-col gap-2">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="border px-4 py-3 text-[13px] cursor-pointer shadow-sm bg-crt-raised will-change-transform"
        :class="[
          toast.type === 'error'
            ? 'border-hazard text-hazard'
            : 'border-crt-border text-phosphor',
        ]"
        @click="dismiss(toast.id)"
      >
        <div class="flex items-start justify-between gap-2">
          <span class="flex-1 leading-snug">
            <span class="font-semibold mr-1">{{ toast.type === 'error' ? 'Error:' : 'OK:' }}</span>
            {{ toast.message }}
          </span>
          <span v-if="toast.countdown" class="text-phosphor-dim shrink-0 font-mono text-[12px]">
            {{ toast.countdown }}s
          </span>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>
