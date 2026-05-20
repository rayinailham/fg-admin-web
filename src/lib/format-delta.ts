import type { CompareDelta } from '@/lib/api-ledger'

export type DeltaDirection = 'positive' | 'negative' | 'neutral' | 'new'

export interface FormattedDelta {
  /** Display string, e.g. "+12% ▲ vs prev", "-5% ▼ vs prev", "= vs prev", "[ NEW ]" */
  text: string
  direction: DeltaDirection
  /** Tailwind class for color: green for positive, red for negative, faint for neutral/new. */
  colorClass: string
  /** Arrow only, useful when caller wants a separate icon slot. */
  arrow: '' | '▲' | '▼' | '='
}

const COLOR_BY_DIRECTION: Record<DeltaDirection, string> = {
  positive: 'text-terminal-green',
  negative: 'text-danger',
  neutral: 'text-phosphor-faint',
  new: 'text-phosphor-faint',
}

/**
 * Formats a `CompareDelta` from the ledger compare endpoint.
 *
 * Rules (per docs/ledger-frontend-plan.md § "Delta Indicators"):
 * - `percent: null` → `[ NEW ]` (previous value was 0)
 * - positive percent → green ▲
 * - negative percent → red ▼
 * - zero percent → gray =
 *
 * `inverse: true` flips the color semantic. Use it for cost-style metrics where
 * a *decrease* is good (e.g., AI costs, infra costs).
 */
export function formatDelta(
  delta: CompareDelta | null | undefined,
  options: { inverse?: boolean; suffix?: string } = {},
): FormattedDelta {
  const { inverse = false, suffix = ' vs prev' } = options

  if (!delta) {
    return {
      text: '[ NEW ]',
      direction: 'new',
      colorClass: COLOR_BY_DIRECTION.new,
      arrow: '',
    }
  }

  if (delta.percent === null || delta.percent === undefined) {
    return {
      text: '[ NEW ]',
      direction: 'new',
      colorClass: COLOR_BY_DIRECTION.new,
      arrow: '',
    }
  }

  const pct = delta.percent
  if (pct === 0) {
    return {
      text: `=${suffix}`,
      direction: 'neutral',
      colorClass: COLOR_BY_DIRECTION.neutral,
      arrow: '=',
    }
  }

  const isPositiveValue = pct > 0
  const direction: DeltaDirection = inverse
    ? isPositiveValue
      ? 'negative'
      : 'positive'
    : isPositiveValue
    ? 'positive'
    : 'negative'

  const arrow = isPositiveValue ? '▲' : '▼'
  const sign = isPositiveValue ? '+' : ''
  return {
    text: `${sign}${pct.toFixed(1)}% ${arrow}${suffix}`,
    direction,
    colorClass: COLOR_BY_DIRECTION[direction],
    arrow,
  }
}

/**
 * Formats a percentage-points delta (used for `profit_margin_points`).
 * No inversion option: a higher margin is always better.
 */
export function formatMarginPoints(points: number, suffix = ' pts vs prev'): FormattedDelta {
  if (points === 0) {
    return {
      text: `=${suffix}`,
      direction: 'neutral',
      colorClass: COLOR_BY_DIRECTION.neutral,
      arrow: '=',
    }
  }
  const isPositiveValue = points > 0
  const direction: DeltaDirection = isPositiveValue ? 'positive' : 'negative'
  const arrow = isPositiveValue ? '▲' : '▼'
  const sign = isPositiveValue ? '+' : ''
  return {
    text: `${sign}${points.toFixed(1)}${suffix}`,
    direction,
    colorClass: COLOR_BY_DIRECTION[direction],
    arrow,
  }
}

export function formatIDR(n: number): string {
  return `Rp ${Math.round(n).toLocaleString('id-ID')}`
}

export function formatUSD(n: number): string {
  return `$${n.toFixed(2)}`
}

export function formatPercent(n: number, digits = 2): string {
  return `${n.toFixed(digits)}%`
}
