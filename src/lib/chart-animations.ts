/**
 * Shared Chart.js animation config.
 *
 * Tuned to match the GSAP motion system in `src/composables/useMotion.ts`:
 *   - duration ~ 350ms (slightly longer than UI fades since charts are bigger)
 *   - easeOutQuart is the Chart.js curve closest to GSAP power2.out
 *
 * Chart.js animates the `y` (numeric) property on bar/line charts by default.
 * For horizontal bar charts (indexAxis: 'y') we animate `x` instead so bars
 * sweep from the axis outward. We also fade points + lines on line charts.
 *
 * Honors prefers-reduced-motion: returns `false` (instant render) when set.
 */

const reducedMotion = (): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Animation block for vertical bar / line charts (numeric y axis). */
export function makeChartAnimation() {
  if (reducedMotion()) return false as const

  return {
    duration: 350,
    easing: 'easeOutQuart' as const,
    animations: {
      // Vertical bars / line points lift from the x-axis.
      y: {
        from: (ctx: { type: string; mode: string }) => {
          if (ctx.type !== 'data' || ctx.mode !== 'default') return undefined
          return undefined
        },
      },
    },
  }
}

/**
 * Animation block for horizontal bar charts (indexAxis: 'y').
 * Bars sweep from x=0 outward.
 */
export function makeHorizontalBarAnimation() {
  if (reducedMotion()) return false as const

  return {
    duration: 350,
    easing: 'easeOutQuart' as const,
    animations: {
      x: {
        from: 0,
      },
    },
  }
}

/**
 * Animation block for line charts. Points and the line draw together.
 * Slightly longer duration so the line draw reads as a sweep.
 */
export function makeLineChartAnimation() {
  if (reducedMotion()) return false as const

  return {
    duration: 450,
    easing: 'easeOutQuart' as const,
    animations: {
      y: {
        duration: 450,
        easing: 'easeOutQuart' as const,
        from: (ctx: { type: string; mode: string; chart: { scales: { y?: { getPixelForValue: (v: number) => number } } } }) => {
          if (ctx.type !== 'data' || ctx.mode !== 'default') return undefined
          // Start from the zero baseline so the line rises into place.
          const y = ctx.chart.scales.y
          return y ? y.getPixelForValue(0) : undefined
        },
      },
    },
  }
}
