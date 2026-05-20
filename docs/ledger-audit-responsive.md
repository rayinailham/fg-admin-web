# Ledger Frontend — Responsive Design Audit

**Audit date:** 2026-05-17
**Scope:** All ledger components + shared `Modal.vue`
**Target viewports:** 375px (iPhone SE), 768px (tablet), 1024px+ (desktop)
**Status:** All critical + serious + moderate issues resolved

---

## Findings & Fixes

### Critical (4 fixes) — Tables overflowed page bounds at 375px

| # | File | Issue | Fix |
|---|------|-------|-----|
| R-01 | `InfraCostsSection.vue` audit history | `grid-cols-[110px_100px_140px_1fr_140px_120px]` = 610px fixed cols inside a `border` parent with no scroll wrapper. Extended page horizontally on mobile. | Wrapped in `overflow-x-auto`, added `min-w-[760px]` to header + row grids |
| R-02 | `ExchangeRateSection.vue` audit | `grid-cols-[140px_120px_120px_140px_1fr]` = 520px fixed cols, no scroll wrapper | Same fix: `overflow-x-auto` parent + `min-w-[680px]` on grids |
| R-03 | `RevenueDetailSection.vue` detail table | `grid-cols-[140px_1fr_1fr_100px_140px]` = 380px fixed + 2× 1fr that collapsed to nothing | `overflow-x-auto` + `min-w-[760px]` on grids |
| R-04 | `InfraCostsSection.vue` active basis | `grid-cols-[1fr_140px_140px]` — the 1fr CATEGORY column collapsed to ~50px on mobile, truncating values | `overflow-x-auto` + `min-w-[420px]` on grids |

`AiUsageDetailSection.vue` was already implemented correctly (`overflow-x-auto` + `min-w-[820px]`) and used as the reference pattern.

---

### Serious (1 fix) — Header strip overflow

| # | File | Issue | Fix |
|---|------|-------|-----|
| R-05 | `ExchangeRateSection.vue` | Right-side superadmin button group `flex items-center gap-2` held `[ OVERRIDE RATE ]` + `[ UNLOCK & REFRESH ]` (~20-char label). Did not wrap on 375px even though the outer header had `flex-wrap`. | Added `flex-wrap` to the inner button group |
| R-06 | `InfraCostsSection.vue` | Left-side header group `flex items-center gap-3` with title + `/// BASIS: 2026-05` could overflow before the right side wrapped | Added `flex-wrap` to the inner group |

---

### Moderate (5 fixes) — Grid breakpoint jumps

| # | File | Before | After | Why |
|---|------|--------|-------|-----|
| R-07 | `LedgerPage.vue` lifetime panel | `grid-cols-2 lg:grid-cols-5` | `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5` | 5 cells in 2 cramped columns at 375px. Added intermediate tablet step. |
| R-08 | `SummaryCard.vue` metrics | `grid-cols-1 lg:grid-cols-2` | `grid-cols-1 sm:grid-cols-2` | Tablets (768–1024px) had a single column unnecessarily. |
| R-09 | `SummaryCard.vue` net profit | `lg:col-span-2` | `sm:col-span-2` | Span breakpoint must match new grid breakpoint. |
| R-10 | `ExchangeRateSection.vue` rate/source/updated | `grid-cols-1 lg:grid-cols-3` | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` | Same: tablet got an unnecessary single column. |
| R-11 | `AiUsageDetailSection.vue` filters | `grid-cols-1 lg:grid-cols-3` | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` | Same. |

---

### Low (2 fixes) — Mobile UX polish

| # | File | Fix |
|---|------|-----|
| R-12 | `Modal.vue` | `max-w-lg w-full` → `max-w-[calc(100vw-1rem)] sm:max-w-lg w-full`. Forces 0.5rem horizontal gutter on mobile so the close button does not sit flush against the screen edge. |
| R-13 | `RevenueDetailSection.vue` package filter | Added `w-full sm:w-auto` to the `<select>`. Consistency with `AiUsageDetailSection` filters. |

---

## Acknowledged Tradeoffs (Not Fixed)

These are flagged but intentionally **not changed** to preserve the CRT/terminal aesthetic per `CONTEXT.md`:

| Rule | Where | Rationale |
|------|-------|-----------|
| Touch targets ≥ 44×44 px | `[ COMPARE: ON ]`, `[ EDIT COSTS ]`, `[ DELETE ]` etc. (`px-3 py-1.5 text-[11px]`) | Calm Professional + Terminal Accents archetype dictates 11px uppercase labels and tight padding. Ledger is an admin-only desktop-first tool. |
| Modal close `[ X ]` button — no padding | `Modal.vue` line 42 | Same aesthetic constraint. The button area is small but adjacent to the title block which provides comfortable Esc-to-close fallback. |
| Chart y-axis label truncation | `AiUsageBreakdownChart.vue` `category / model` labels | Chart.js auto-allocates label width based on container. Drill-down table provides full text for screen readers. |
| Page-level header layout | `LedgerPage.vue` line 60 | Already uses `flex-wrap`; explicit column-stack pattern would add CSS that flex-wrap already covers. |

---

## Pattern Established for Future Tables

Every fixed-column data table in the ledger now follows this pattern:

```html
<div class="border border-crt-border overflow-x-auto" data-testid="...">
  <div class="grid grid-cols-[...] ... min-w-[XXXpx]">
    <!-- headers -->
  </div>
  <div v-for="..." class="grid grid-cols-[...] ... min-w-[XXXpx]">
    <!-- row -->
  </div>
</div>
```

`overflow-x-auto` on the wrapper + `min-w-[Npx]` on every grid row keeps headers and cells aligned during horizontal scroll. The min-width matches the sum of fixed columns plus a sensible budget for `1fr` content (~120–200px per `1fr` token).

---

## Mobile-First Grid Strategy

Standardized breakpoint progression for all ledger panels going forward:

| Cells | Mobile (< 640px) | Tablet (640–1024px) | Desktop (≥ 1024px) |
|-------|------------------|---------------------|--------------------|
| 2 | `grid-cols-1` | `sm:grid-cols-2` | `sm:grid-cols-2` |
| 3 | `grid-cols-1` | `sm:grid-cols-2` | `lg:grid-cols-3` |
| 4 | `grid-cols-1` | `sm:grid-cols-2` | `lg:grid-cols-4` |
| 5 | `grid-cols-1` | `sm:grid-cols-2 md:grid-cols-3` | `lg:grid-cols-5` |

---

## Verification

| Check | Result |
|-------|--------|
| `vue-tsc --noEmit` | clean |
| `npm run test:run` | 287/287 pass |
| `npm run build` | clean, 2.92s |
| `LedgerPage` chunk | 48.17 kB / 12.00 kB gz (was 47.90 kB — +0.27 kB for added `min-w-*` + breakpoint utilities) |

Manual viewport testing recommended at: 375 px, 414 px (iPhone Plus), 768 px (iPad portrait), 1024 px (iPad landscape), 1440 px (laptop). Tables should scroll horizontally on mobile with no overall page overflow; summary card metric grids should reflow from 1 → 2 → 5 columns as viewport widens.
