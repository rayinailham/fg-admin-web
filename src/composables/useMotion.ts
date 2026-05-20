import { onMounted, onUnmounted, ref, nextTick, type Ref } from 'vue'
import { gsap } from 'gsap'

/**
 * Respects user's reduced-motion preference. When true, all helpers
 * collapse to instant state changes (no animation) but final styles
 * still apply.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Common GSAP timing — keep all motion in this app on the same clock so
 * page transitions, reveals, and toasts feel like one system.
 *
 * 220ms / power2.out is fast enough to not feel sluggish on every
 * navigation, slow enough to read as intentional.
 */
export const motion = {
  short: 0.22,
  medium: 0.32,
  long: 0.5,
  ease: 'power2.out',
  easeIn: 'power2.in',
  easeInOut: 'power2.inOut',
} as const

/**
 * Auto-reveal children on mount with a small Y-offset + fade stagger.
 *
 * Pass a containerRef and (optionally) a selector. Defaults to direct
 * children of the container. Reveals run once on mount, scoped to the
 * component, and clean up on unmount.
 *
 * Usage:
 *   const root = ref<HTMLElement | null>(null)
 *   useStaggerReveal(root)
 *   // or scoped selector:
 *   useStaggerReveal(root, '[data-reveal]')
 */
export function useStaggerReveal(
  containerRef: Ref<HTMLElement | null>,
  selector: string = ':scope > *',
  opts: { y?: number; stagger?: number; duration?: number; delay?: number } = {},
) {
  let ctx: gsap.Context | undefined

  onMounted(async () => {
    await nextTick()
    const root = containerRef.value
    if (!root) return

    if (prefersReducedMotion()) return

    ctx = gsap.context(() => {
      const targets = root.querySelectorAll(selector)
      if (!targets.length) return
      gsap.from(targets, {
        opacity: 0,
        y: opts.y ?? 8,
        duration: opts.duration ?? motion.short,
        ease: motion.ease,
        stagger: opts.stagger ?? 0.04,
        delay: opts.delay ?? 0,
        clearProps: 'opacity,transform',
      })
    }, root)
  })

  onUnmounted(() => {
    ctx?.revert()
  })
}

/**
 * Imperative fade-in helper for elements that mount asynchronously
 * (e.g. data resolves, content swaps inside an already-mounted page).
 * Skips animation when reduced-motion is on but still ensures element
 * is visible.
 */
export function fadeIn(el: Element | null, opts: { y?: number; duration?: number; delay?: number } = {}) {
  if (!el) return
  if (prefersReducedMotion()) {
    gsap.set(el, { opacity: 1, y: 0 })
    return
  }
  gsap.from(el, {
    opacity: 0,
    y: opts.y ?? 6,
    duration: opts.duration ?? motion.short,
    ease: motion.ease,
    delay: opts.delay ?? 0,
    clearProps: 'opacity,transform',
  })
}

/**
 * Convenience for components that just need a root ref + auto reveal.
 */
export function usePageMotion(opts: { selector?: string; y?: number; stagger?: number } = {}) {
  const root = ref<HTMLElement | null>(null)
  useStaggerReveal(root, opts.selector ?? ':scope > *', {
    y: opts.y,
    stagger: opts.stagger,
  })
  return root
}
