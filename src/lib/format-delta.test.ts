import { describe, it, expect } from 'vitest'
import {
  formatDelta,
  formatMarginPoints,
  formatIDR,
  formatUSD,
  formatPercent,
} from '@/lib/format-delta'
import type { CompareDelta } from '@/lib/api-ledger'

// ---------------------------------------------------------------------------
// formatDelta
// ---------------------------------------------------------------------------

describe('formatDelta', () => {
  it('returns [ NEW ] for null delta', () => {
    const r = formatDelta(null)
    expect(r.text).toBe('[ NEW ]')
    expect(r.direction).toBe('new')
    expect(r.arrow).toBe('')
    expect(r.colorClass).toBe('text-phosphor-faint')
  })

  it('returns [ NEW ] for undefined delta', () => {
    expect(formatDelta(undefined).text).toBe('[ NEW ]')
  })

  it('returns [ NEW ] when percent is null (divide-by-zero guard)', () => {
    const delta: CompareDelta = { absolute: 500000, percent: null }
    const r = formatDelta(delta)
    expect(r.text).toBe('[ NEW ]')
    expect(r.direction).toBe('new')
  })

  it('returns neutral = for zero percent', () => {
    const delta: CompareDelta = { absolute: 0, percent: 0 }
    const r = formatDelta(delta)
    expect(r.text).toBe('= vs prev')
    expect(r.direction).toBe('neutral')
    expect(r.arrow).toBe('=')
    expect(r.colorClass).toBe('text-phosphor-faint')
  })

  it('returns positive green ▲ for positive percent', () => {
    const delta: CompareDelta = { absolute: 500000, percent: 12.0 }
    const r = formatDelta(delta)
    expect(r.text).toBe('+12.0% ▲ vs prev')
    expect(r.direction).toBe('positive')
    expect(r.arrow).toBe('▲')
    expect(r.colorClass).toBe('text-terminal-green')
  })

  it('returns negative red ▼ for negative percent', () => {
    const delta: CompareDelta = { absolute: -10000, percent: -5.0 }
    const r = formatDelta(delta)
    expect(r.text).toBe('-5.0% ▼ vs prev')
    expect(r.direction).toBe('negative')
    expect(r.arrow).toBe('▼')
    expect(r.colorClass).toBe('text-danger')
  })

  it('inverse: true → positive percent becomes negative (cost increase is bad)', () => {
    const delta: CompareDelta = { absolute: 10000, percent: 5.0 }
    const r = formatDelta(delta, { inverse: true })
    expect(r.direction).toBe('negative')
    expect(r.colorClass).toBe('text-danger')
    expect(r.arrow).toBe('▲')
  })

  it('inverse: true → negative percent becomes positive (cost decrease is good)', () => {
    const delta: CompareDelta = { absolute: -10000, percent: -5.0 }
    const r = formatDelta(delta, { inverse: true })
    expect(r.direction).toBe('positive')
    expect(r.colorClass).toBe('text-terminal-green')
    expect(r.arrow).toBe('▼')
  })

  it('respects custom suffix', () => {
    const delta: CompareDelta = { absolute: 0, percent: 0 }
    expect(formatDelta(delta, { suffix: ' vs Apr' }).text).toBe('= vs Apr')
  })

  it('formats percent to 1 decimal place', () => {
    const delta: CompareDelta = { absolute: 1, percent: 12.345 }
    expect(formatDelta(delta).text).toBe('+12.3% ▲ vs prev')
  })
})

// ---------------------------------------------------------------------------
// formatMarginPoints
// ---------------------------------------------------------------------------

describe('formatMarginPoints', () => {
  it('returns neutral = for zero points', () => {
    const r = formatMarginPoints(0)
    expect(r.text).toBe('= pts vs prev')
    expect(r.direction).toBe('neutral')
  })

  it('returns positive for positive points', () => {
    const r = formatMarginPoints(3.2)
    expect(r.text).toBe('+3.2 pts vs prev')
    expect(r.direction).toBe('positive')
    expect(r.colorClass).toBe('text-terminal-green')
  })

  it('returns negative for negative points', () => {
    const r = formatMarginPoints(-1.5)
    expect(r.text).toBe('-1.5 pts vs prev')
    expect(r.direction).toBe('negative')
    expect(r.colorClass).toBe('text-danger')
  })

  it('respects custom suffix', () => {
    expect(formatMarginPoints(1, ' pts').text).toBe('+1.0 pts')
  })
})

// ---------------------------------------------------------------------------
// formatIDR
// ---------------------------------------------------------------------------

describe('formatIDR', () => {
  it('formats IDR with Rp prefix', () => {
    expect(formatIDR(1500000)).toContain('Rp')
  })

  it('rounds non-integer input', () => {
    expect(formatIDR(1500.9)).toContain('Rp')
    expect(formatIDR(1500.9)).toBe(formatIDR(1501))
  })

  it('handles zero', () => {
    expect(formatIDR(0)).toBe('Rp 0')
  })
})

// ---------------------------------------------------------------------------
// formatUSD
// ---------------------------------------------------------------------------

describe('formatUSD', () => {
  it('formats with $ prefix and 2 decimals', () => {
    expect(formatUSD(1.234)).toBe('$1.23')
    expect(formatUSD(0)).toBe('$0.00')
    expect(formatUSD(10)).toBe('$10.00')
  })
})

// ---------------------------------------------------------------------------
// formatPercent
// ---------------------------------------------------------------------------

describe('formatPercent', () => {
  it('formats with % suffix and 2 decimals by default', () => {
    expect(formatPercent(89.06)).toBe('89.06%')
  })

  it('respects custom decimal digits', () => {
    expect(formatPercent(72.8, 1)).toBe('72.8%')
    expect(formatPercent(72, 0)).toBe('72%')
  })
})
