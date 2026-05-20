# Ledger Page Frontend Plan

Status: Ready for implementation
Owner: admin-futureguide (frontend)
Last updated: 2026-05-17
Counterpart backend doc: [`docs/ledger-expansion-plan.md`](./ledger-expansion-plan.md)
API reference: [`docs/ledger-api-update.md`](./ledger-api-update.md)

## Context

The backend ledger expansion (migration 041) added:
- Versioned **Cost Period** schema (replaces flat `system_config` infra cost keys)
- **Source Flag** + **Manual Lock** state machine for the exchange rate
- New endpoints: `/admin/ledger/compare`, `/admin/ledger/revenue`, `/admin/ledger/ai-usage`, `/admin/ledger/infra-costs` (GET/PUT/DELETE), `/admin/ledger/exchange-rate` (GET/PUT) and `/admin/ledger/exchange-rate/refresh` (POST)
- Lifetime infra now uses true historical sum + `lifetime.infra_costs_from_month` field

The current frontend ledger page (`src/pages/LedgerPage.vue`) renders the v1 API shape only. It has no drill-down, no compare, no infra cost editing, no FX management, and no charts. The API client (`src/lib/api-ledger.ts`) is also drifted — `breakdown[].item` was renamed to `category` in the new API, and `period_id` / `infra_costs_from_month` fields are missing.

This plan replaces both files and adds new components, composables, and tests.

## Locked Decisions (from grilling session)

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | Page layout | Single scroll + modals/drawers | Consistent with existing detail pages; CRT terminal aesthetic favors compartmentalized sections over tabs |
| 2 | Drill-down loading | Lazy expand-to-load | Aggregate breakdowns enough for overview; raw rows fetched only when investigating |
| 3 | Compare/delta | Default-on, parallel server fetch | MoM is the default admin question; server runs both fetches in parallel; minimal added latency |
| 4 | Infra cost edit | Modal + batch form (1–5 items) + expand history + manual conflict resolution | Modal preserves page focus; batch form mirrors API intent; manual 409 flow keeps audit trail clean |
| 5 | FX rate UX | Header badge + body section + contextual refresh button + conditional confirm | Source flag is telemetry → visible always; refresh always available with state-aware label |
| 6 | Charts | Breakdown only (revenue / AI / infra), async-loaded | Trend already covered by overview timeseries; breakdown is the unique ledger value |
| 7 | Permissions | Strict hide superadmin-only buttons | Aligned with existing CONTEXT.md rule, no exceptions |

## Goals

- Render the new API shape correctly across all states (no data, partial data, full data, error).
- Surface drill-down rows for revenue and AI usage on demand.
- Provide first-class editing flows for infra cost periods and the exchange rate, with proper 409 / 502 / 429 handling.
- Show month-over-month deltas inline with summary cards.
- Add breakdown charts that respect the CRT visual archetype.
- Keep `LedgerPage.vue` thin: section components own their state, page orchestrates.

## Non-Goals

- Multi-month trend charts (covered by overview timeseries).
- CSV / PDF export.
- Real-time updates (admin tool, manual refresh is fine).
- Migrating other pages off the inline API client pattern.
- Schema-level changes (already done by backend).

---

## File Structure

```
src/
├── pages/
│   ├── LedgerPage.vue                       (rewrite — orchestrator only)
│   └── LedgerPage.test.ts                   (rewrite)
├── components/
│   └── ledger/                              (new folder)
│       ├── LedgerSummaryCards.vue           (period + lifetime + monthly summary + delta)
│       ├── LedgerExchangeRateSection.vue    (FX section + audit expand + override / refresh)
│       ├── LedgerRevenueSection.vue         (aggregate breakdown + chart + drill-down expand)
│       ├── LedgerAiUsageSection.vue         (aggregate breakdown + chart + drill-down expand)
│       ├── LedgerInfraCostsSection.vue      (active basis + chart + history expand + edit)
│       ├── LedgerOpportunityCostCard.vue    (small static card)
│       ├── InfraCostsEditModal.vue          (batch form, day-1 picker, conflict toast)
│       ├── InfraCostsEditModal.test.ts
│       ├── ExchangeRateOverrideModal.vue    (rate input, reason, validation)
│       ├── ExchangeRateOverrideModal.test.ts
│       ├── RevenueDrillDownTable.vue        (paginated table, package filter)
│       ├── AiUsageDrillDownTable.vue        (paginated table, category/model/provider filters)
│       ├── RevenueBreakdownChart.vue        (async — Chart.js doughnut/bar)
│       ├── AiCostsBreakdownChart.vue        (async)
│       └── InfraCostsBreakdownChart.vue     (async)
├── composables/
│   ├── useLedger.ts                         (new — TanStack Query hooks + mutation invalidation)
│   └── useLedger.test.ts
└── lib/
    └── api-ledger.ts                        (rewrite — match new API surface)
```

The `components/ledger/` sub-folder follows the existing `components/users/` pattern.

---

## API Client Rewrite (`src/lib/api-ledger.ts`)

Breaking changes from current types:
- `InfraCostBreakdownItem.item` → `category`, plus optional `effective_from`, `note`, `period_id`
- `LedgerResponse.lifetime` adds `infra_costs_from_month: string | null`
- `AiCostBreakdownItem.category` is now `'analysis' | 'chat' | 'embedding' | 'ab_test'` (string union)

New types and functions:

```ts
// Shared
export type FxSource = 'auto' | 'manual' | 'cached' | 'fallback'
export type InfraCategory = 'database' | 'redis' | 'server' | 'domain' | 'other'
export type AiCategory = 'analysis' | 'chat' | 'embedding' | 'ab_test'

// Existing (rewritten)
export interface LedgerResponse { /* updated shape per ledger-api-update.md §1 */ }
export interface LedgerMonth { /* unchanged */ }

// New
export interface CompareResponse {
  current: LedgerResponse
  previous: LedgerResponse
  delta: {
    revenue_idr:          { absolute: number; percent: number | null }
    ai_costs_idr:         { absolute: number; percent: number | null }
    infra_costs_idr:      { absolute: number; percent: number | null }
    net_profit_idr:       { absolute: number; percent: number | null }
    profit_margin_points: number
  }
}

export interface RevenueRow { /* per §4 */ }
export interface AiUsageRow { /* per §5 */ }

export interface InfraCostPeriod { /* per §6 active[] / history[] */ }
export interface InfraCostsResponse {
  month: string
  active: InfraCostPeriod[]   // always 5 entries
  total_idr: number
  history: InfraCostPeriod[]
}

export interface ExchangeRateResponse { /* per §7 GET */ }

// Functions
export const ledgerApi = {
  get(month?: string): Promise<LedgerResponse>
  months(): Promise<{ months: LedgerMonth[] }>
  compare(month?: string, against?: 'prev' | string): Promise<CompareResponse>

  listRevenue(params: { month?: string; cursor?: string; limit?: number; package_id?: string }): Promise<{ rows: RevenueRow[]; next_cursor?: string }>
  listAiUsage(params: { month?: string; cursor?: string; limit?: number; category?: AiCategory; model?: string; provider?: 'gemini' | 'openrouter' }): Promise<{ rows: AiUsageRow[]; next_cursor?: string }>

  getInfraCosts(month?: string): Promise<InfraCostsResponse>
  putInfraCosts(req: { effective_from: string; note?: string; items: { category: InfraCategory; cost_idr: number }[] }): Promise<InfraCostsResponse>
  deleteInfraCostPeriod(periodId: string): Promise<void>

  getExchangeRate(): Promise<ExchangeRateResponse>
  putExchangeRate(req: { usd_to_idr: number; reason: string }): Promise<ExchangeRateResponse>
  refreshExchangeRate(): Promise<ExchangeRateResponse>
}
```

Cursor handling: treat `next_cursor` as opaque. Empty string `""` or absent = no more pages (per API spec).

---

## Composable: `src/composables/useLedger.ts`

Single source of truth for query keys + mutation invalidation. Prevents cache-key drift across section components.

```ts
// Query keys (frozen, exported for tests + manual invalidation)
export const ledgerKeys = {
  all:           ['ledger'] as const,
  summary:       (month: string) => [...ledgerKeys.all, 'summary', month] as const,
  months:        () => [...ledgerKeys.all, 'months'] as const,
  compare:       (month: string, against: string) => [...ledgerKeys.all, 'compare', month, against] as const,
  revenue:       (month: string, cursor: string, packageId?: string) => [...ledgerKeys.all, 'revenue', month, cursor, packageId ?? ''] as const,
  aiUsage:       (month: string, cursor: string, filters: { category?: string; model?: string; provider?: string }) => [...ledgerKeys.all, 'aiUsage', month, cursor, filters] as const,
  infraCosts:    (month: string) => [...ledgerKeys.all, 'infraCosts', month] as const,
  exchangeRate:  () => [...ledgerKeys.all, 'exchangeRate'] as const,
}

// Read hooks (return useQuery results)
export function useLedgerSummary(month: Ref<string>)
export function useLedgerMonths()
export function useLedgerCompare(month: Ref<string>, against: Ref<string>, enabled: Ref<boolean>)
export function useLedgerRevenue(month: Ref<string>, cursor: Ref<string>, packageId: Ref<string | undefined>)
export function useLedgerAiUsage(month: Ref<string>, cursor: Ref<string>, filters: Ref<{...}>)
export function useLedgerInfraCosts(month: Ref<string>)
export function useExchangeRate()

// Mutation hooks (handle invalidation centrally)
export function useUpdateInfraCosts()      // invalidates: infraCosts, summary, compare
export function useDeleteInfraCostPeriod() // invalidates: infraCosts, summary, compare
export function useUpdateExchangeRate()    // invalidates: exchangeRate, summary, compare (IDR values change)
export function useRefreshExchangeRate()   // same as above
```

Vue 3 best practices applied:
- `composition-script-setup` everywhere
- `composition-composables-reuse` — page is thin, all logic in composables
- `reactivity-computed-caching` — derived state (delta indicators, formatted IDR/USD) via `computed`
- `reactivity-shallow-ref` — Chart.js instances stored in `shallowRef` (deep reactive watch on chart class is wasteful and bug-prone)

---

## Component Plan

### `LedgerPage.vue` — orchestrator only

State owned:
- `selectedMonth: Ref<string>` (empty string = current month)
- `compareAgainst: Ref<string>` (default `'prev'`)

Composables called: `useLedgerMonths`, `useLedgerSummary(selectedMonth)`, `useLedgerCompare(selectedMonth, compareAgainst, hasPriorMonth)`.

Renders:
1. `<header>` — title + month selector + FX badge (passed via prop from `useExchangeRate` data)
2. `<LedgerSummaryCards>` — bound to compare data with summary fallback
3. `<LedgerRevenueSection>` — `:month="selectedMonth"` `:summary="summaryData.monthly.revenue"`
4. `<LedgerAiUsageSection>` — same shape
5. `<LedgerInfraCostsSection>` — `:month="selectedMonth"`
6. `<LedgerOpportunityCostCard>` — `:data="summaryData.monthly.opportunity_cost"`
7. `<LedgerExchangeRateSection>` — no props (uses `useExchangeRate` directly)

Page should be ≤ 120 lines including template.

### `LedgerSummaryCards.vue`

Props: `summary: LedgerResponse | null`, `compare: CompareResponse | null`

Renders 5 cards: Period · Lifetime · Revenue · Total Costs · Net Profit + Margin. When `compare` is non-null, each numeric card gets a delta indicator below the value:
```
REVENUE
Rp 4.5M
+12% ▲ vs prev
```

`percent: null` → render as `[ NEW ]` badge instead.

### `LedgerRevenueSection.vue` / `LedgerAiUsageSection.vue`

Pattern (both follow this skeleton):

```
[ REVENUE — Rp 4.5M / 3 orders ]
  <RevenueBreakdownChart :data="...">  (async, Suspense fallback)
  Aggregate breakdown rows (text fallback, always rendered for screen readers)

  [ + EXPAND DETAIL (3 ROWS) ]   ← toggle, count from summary.order_count

  <RevenueDrillDownTable v-if="expanded" :month="month">
    Filters: package_id (revenue) / category, model, provider (ai-usage)
    Table + cursor pagination via useCursorPagination
  </RevenueDrillDownTable>
```

Uses `useCursorPagination` (existing composable) for the drill-down table.

### `LedgerInfraCostsSection.vue`

```
[ INFRA COSTS — Rp 1.2M (basis: 2026-05) ]
  <InfraCostsBreakdownChart :data="active">

  Active basis table (5 rows, always visible — that's the core info)
  Each row: CATEGORY  Rp X  (since YYYY-MM-DD)

  [ EDIT COSTS ]               ← v-if="isSuperadmin"
  [ + EXPAND HISTORY (47) ]    ← toggle

  History table (collapsed by default, Delete button per row v-if="isSuperadmin")
```

Edit button opens `<InfraCostsEditModal>`. Delete uses native confirm + `useDeleteInfraCostPeriod`.

### `InfraCostsEditModal.vue`

Form state:
- `effectiveFrom: Ref<string>` — default = first of next month, validated as day-1 of month, max +1 month into future
- `note: Ref<string>` — max 500 chars
- `items: Ref<{ category: InfraCategory; included: boolean; cost_idr: number }[]>` — 5 fixed entries (one per category), checkbox to include

Validation rules (client-side, mirror server):
- At least one item must have `included=true`
- All included items must have `cost_idr` 0 ≤ x ≤ 1,000,000,000
- `effective_from` parses as YYYY-MM-DD AND equals first-of-month AND ≤ first day of next month from today
- `note` length ≤ 500

Submit:
- Build payload with only `included` items
- Call `useUpdateInfraCosts.mutate(...)`
- On 409 conflict: toast in CRT terminal style — `Period for {category} {effective_from} already exists. Delete it from history first.`
- On 200: close modal, success toast, queries invalidate automatically

### `ExchangeRateOverrideModal.vue`

Form: `usd_to_idr` (number, exclusive 1000–100000) + `reason` (required, non-empty).

Submit calls `useUpdateExchangeRate.mutate(...)`. On success: close + toast.

### `LedgerExchangeRateSection.vue`

```
[ EXCHANGE RATE ]                                  [ AUTO 16500 | MANUAL 16780 🔒 | CACHED ⚠ | FALLBACK ⚠ ]
  USD → IDR     16,780.50
  SOURCE        MANUAL  (locked by admin@x at 2026-05-17 08:00)   ← if cached/fallback, show inline warning text
  UPDATED       2026-05-17 08:00

  [ OVERRIDE RATE ]   [ {refreshButtonLabel} ]    ← v-if="isSuperadmin"

  [ + EXPAND AUDIT (last 10 changes) ]
  <table v-if="auditExpanded">
```

Refresh button label is `computed`:
```ts
const refreshLabel = computed(() => {
  switch (data.value?.source) {
    case 'auto':     return 'REFRESH FROM API'
    case 'manual':   return 'UNLOCK & REFRESH'
    case 'cached':   return 'RETRY UPSTREAM'
    case 'fallback': return 'FETCH RATE'
    default:         return 'REFRESH'
  }
})
```

Confirm dialog only when `source === 'manual'`. 429 from refresh → toast countdown from `Retry-After` header (existing `useRateLimit` composable).

### Chart Components (3 files, all async-loaded)

All three follow the same skeleton:
- `<script setup lang="ts">` with `defineProps`
- Chart.js instance held in `shallowRef`
- Computed dataset from props, `watch` to update
- Cleanup chart instance in `onUnmounted`
- CRT theme config (no animation, monospace tooltip, hazard red + phosphor palette)

Imported in parent via:
```ts
const RevenueBreakdownChart = defineAsyncComponent(() => import('@/components/ledger/RevenueBreakdownChart.vue'))
```

---

## UI Styling Conventions

All styling follows the **Calm Professional + Terminal Accents** archetype established in CONTEXT.md and demonstrated across existing pages (OverviewPage, AdminsPage, etc.).

### Color Palette

| Element | Color | Hex | Usage |
|---------|-------|-----|-------|
| Background | Slate-50 | `#F8FAFC` | Page background |
| Surface | White | `#FFFFFF` | Cards, modals |
| Surface tint | Slate-100 | `#F1F5F9` | Table headers, sidebar |
| Border | Slate-200 | `#E2E8F0` | `border-crt-border` |
| Text primary | Slate-900 | `#0F172A` | `text-phosphor` |
| Text secondary | Slate-600 | `#475569` | `text-phosphor-dim` |
| Text tertiary | Slate-500 | `#64748B` | `text-phosphor-faint` |
| Brand / Primary | Teal-700 | `#0F766E` | `text-hazard`, `border-hazard` (active states, primary actions) |
| Success | Green-600 | `#16A34A` | `text-terminal-green` (positive deltas, success indicators) |
| Danger | Red-600 | `#DC2626` | `text-danger` (negative states, fallback FX) |

### Typography

- **Body & headings:** Inter sans-serif (not monospace-dominant)
- **Data values only:** JetBrains Mono (`.font-mono` class explicit)
- **Section labels:** `text-[11px] uppercase` (e.g., `[ REVENUE ]`, `[ INFRA COSTS ]`)
- **Subtitles:** `text-[11px] text-phosphor-faint uppercase` with `///` prefix (e.g., `/// PROFIT & LOSS TRACKING`)
- **Headline numbers:** `text-lg text-phosphor`
- **Data rows:** `text-xs` (12px) with two-column flex layout

### Section & Card Styling

```
Major section:     border-2 border-crt-border p-4 mb-4
Table/DataTable:   border border-crt-border bg-crt-raised
Modal:             <Modal> component (existing), dialog element
Form input:        bg-crt-surface border border-crt-border focus:border-hazard text-xs
```

### Button Conventions

**Primary action (hazard/teal):**
```html
<button class="border border-hazard px-3 py-1.5 text-[11px] text-hazard hover:bg-hazard hover:text-crt transition-colors">
  [ ACTION LABEL ]
</button>
```

**Secondary action (neutral):**
```html
<button class="border border-crt-border px-3 py-1.5 text-[11px] text-phosphor-dim hover:text-phosphor hover:border-phosphor-dim transition-colors">
  [ ACTION LABEL ]
</button>
```

**Danger action (red):**
```html
<button class="border border-danger px-3 py-1.5 text-[11px] text-danger hover:bg-danger hover:text-crt transition-colors">
  [ DELETE ]
</button>
```

All button text wrapped in `[ ]` brackets. No border-radius.

### Status & State Text

| State | Style | Example |
|-------|-------|---------|
| Loading | `text-xs text-phosphor-faint` | `>>> LOADING LEDGER...` |
| Empty | `text-xs text-phosphor-faint` | `[ NO REVENUE DATA ]` |
| Error | `text-xs text-danger` | `[ ERROR: FAILED TO LOAD ]` |
| Success toast | `text-xs text-terminal-green` | (via `useToast()`) |

### Source Flag Badges (FX Rate)

| Source | Badge | Color | Icon | Context |
|--------|-------|-------|------|---------|
| `auto` | `[ AUTO ]` | `text-terminal-green border-terminal-green` | none | Fresh, normal operation |
| `manual` | `[ MANUAL ]` | `text-hazard border-hazard` | 🔒 or `[L]` | Admin-locked, intentional |
| `cached` | `[ CACHED ]` | `text-phosphor-dim border-phosphor-dim` | ⚠ | Stale, upstream failed |
| `fallback` | `[ FALLBACK ]` | `text-danger border-danger` | ⚠ | Never set, using default |

Cached/fallback states include inline warning text in section body: `"Upstream API failed at {timestamp}. Using cached rate from {date}. Retry refresh to fetch latest."`

### Delta Indicators (Compare)

Rendered below summary card values:

| Direction | Style | Example |
|-----------|-------|---------|
| Positive | `text-terminal-green` | `+12% ▲ vs prev` |
| Negative | `text-danger` | `-5% ▼ vs prev` |
| Neutral | `text-phosphor-faint` | `= vs prev` |
| No prior | `text-phosphor-faint` | `[ NEW ]` badge |

When `percent: null` (zero previous value), render as `[ NEW ]` badge instead of percentage.

### Breakdown Charts

**Type:** Horizontal bar chart (readable for long labels like model names)

**Color scheme:**
- Top item (highest value): `#0F766E` (brand teal)
- Remaining items: `#475569` (phosphor-dim) with opacity descending (80%, 60%, 40%)

**Chart.js options (reuse from OverviewPage):**
```ts
{
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#FFFFFF',
      titleColor: '#0F172A',
      bodyColor: '#0F172A',
      borderColor: '#E2E8F0',
      borderWidth: 1,
    },
  },
  scales: {
    x: {
      ticks: { color: '#64748B', font: { family: 'Inter, system-ui, sans-serif', size: 11 } },
      grid: { color: '#F1F5F9' },
      border: { color: '#E2E8F0' },
    },
    y: {
      ticks: { color: '#64748B', font: { family: 'Inter, system-ui, sans-serif', size: 11 } },
      grid: { color: '#F1F5F9' },
      border: { color: '#E2E8F0' },
    },
  },
}
```

No animations on initial render (or ≤200ms). Monospace data labels right-aligned.

### Modal & Form Patterns

**Modal structure (per existing Modal.vue):**
- Title: `heading-macro text-sm text-hazard` (teal, uppercase)
- Close button: `[ X ]` text-[11px] text-phosphor-dim hover:text-hazard
- Content: `space-y-3` for form fields
- Buttons: flex gap-2, primary action first, cancel second

**Form field pattern:**
```html
<div>
  <label class="block text-[11px] text-phosphor-faint mb-1 uppercase">FIELD LABEL</label>
  <input class="w-full bg-crt-surface border border-crt-border px-2 py-1.5 text-xs text-phosphor focus:outline-none focus:border-hazard" />
</div>
```

**Confirm dialog (delete operations):**
```html
<Modal title="DELETE X">
  <p class="text-xs text-hazard mb-4">Delete {item}? This cannot be undone.</p>
  <div class="flex gap-2">
    <button class="border border-danger px-3 py-1.5 text-[11px] text-danger hover:bg-danger hover:text-crt">[ DELETE ]</button>
    <button class="border border-crt-border px-3 py-1.5 text-[11px] text-phosphor-dim">[ CANCEL ]</button>
  </div>
</Modal>
```

### Responsive Behavior

- Light theme works on all devices (no dark mode variant)
- No border-radius anywhere (all 90-degree corners)
- No gradients, no soft shadows, no translucency
- Grid layouts use `grid-cols-1 lg:grid-cols-N` for mobile-first stacking

---

## Permission Strategy

Auth state from existing Pinia store. New page-level `computed`:

```ts
const auth = useAuthStore()
const isSuperadmin = computed(() => auth.role === 'superadmin')
```

`isSuperadmin` passed as prop or provided via `provide/inject` to sections. All write-action buttons gated with `v-if="isSuperadmin"`. No "view only" badges, no disabled styling — strict hide per CONTEXT.md.

---

## Cache Invalidation Map

| Mutation | Invalidates |
|----------|-------------|
| PUT `/admin/ledger/infra-costs` | `infraCosts(*)`, `summary(*)`, `compare(*, *)` |
| DELETE `/admin/ledger/infra-costs/{id}` | same as above |
| PUT `/admin/ledger/exchange-rate` | `exchangeRate()`, `summary(*)`, `compare(*, *)` |
| POST `/admin/ledger/exchange-rate/refresh` (200) | same as above |
| POST `/admin/ledger/exchange-rate/refresh` (502) | only `exchangeRate()` (no value change but UI state needs refresh) |

Drill-down (`revenue`, `aiUsage`) is read-only and never invalidated by mutations from the ledger page itself. Month change via dropdown is a query-key change, not invalidation.

---

## Vue 3 Best Practices Applied

| Rule | Where |
|------|-------|
| `composition-script-setup` | All components |
| `composition-composables-reuse` | `useLedger.ts` centralizes server state; page is thin |
| `reactivity-computed-caching` | Delta indicators, formatted currency, refresh-button label, summary card derivations |
| `reactivity-shallow-ref` | Chart.js instances |
| `component-async-components` | All three chart components (~70KB Chart.js gzip) |
| `template-conditional-rendering` | `v-if` for expand sections (not `v-show`) — avoids loading drill-down query when hidden |
| `bundle-tree-shaking` | Selective Chart.js imports (`BarController`, `DoughnutController`, `Tooltip` only) |
| `state-pinia-optimization` | Auth role read via `computed`, not direct subscription |
| `lifecycle-cleanup` | Chart instances destroyed in `onUnmounted` |

---

## Test Plan

Selective testing (per Q7 decision):

| File | Coverage |
|------|----------|
| `LedgerPage.test.ts` | Loading state, error state, no compare data fallback, full data render, admin role hides edit buttons, month change triggers refetch |
| `InfraCostsEditModal.test.ts` | Form validation: empty items rejected, day-1-of-month rule, max +1 month rule, cost range, 409 toast on conflict, success closes modal |
| `ExchangeRateOverrideModal.test.ts` | Validation: rate range, reason required, success path |
| `useLedger.test.ts` | Mutation invalidation: `useUpdateInfraCosts` triggers correct invalidate calls; same for FX mutations |

Charts not unit-tested (visual). Drill-down components covered transitively via `LedgerPage.test.ts` integration test with mocked cursor responses.

Test infrastructure (existing): Vitest + happy-dom + Vue Test Utils + `@pinia/testing`.

---

## Rollout Phases

**Phase 1 — API client + composable (foundation, no UI change yet)**
1. Rewrite `src/lib/api-ledger.ts` to new types + new methods
2. Create `src/composables/useLedger.ts` with all hooks
3. Write `useLedger.test.ts`
4. Update existing `LedgerPage.vue` minimally to consume new types (add `as InfraCostBreakdownItem` casts where needed) — keep render unchanged
5. Verify `npm run build` + existing tests pass

**Phase 2 — Charts + restructure**
1. Add three chart components under `components/ledger/`
2. Split `LedgerPage.vue` into section components (no behavior change yet, just refactor)
3. Wire charts into the three breakdown sections
4. Update `LedgerPage.test.ts` for new component tree

**Phase 3 — Compare + drill-downs**
1. Implement `useLedgerCompare` and wire into `LedgerSummaryCards`
2. Implement `RevenueDrillDownTable` + `AiUsageDrillDownTable` with `useCursorPagination`
3. Add expand toggles to revenue / ai-usage sections

**Phase 4 — Infra cost editing**
1. Build `InfraCostsEditModal`
2. Add edit button + history expand to `LedgerInfraCostsSection`
3. Wire mutations
4. Test conflict / validation paths

**Phase 5 — Exchange rate management**
1. Build `ExchangeRateOverrideModal`
2. Build `LedgerExchangeRateSection` with audit expand + state-aware refresh button
3. Wire mutations
4. Add header FX badge (top-of-page strip)

**Phase 6 — Polish**
1. Run accessibility check (keyboard navigation through modals, focus traps)
2. Manual QA on all source-flag states (`auto` / `manual` / `cached` / `fallback`)
3. Manual QA on month selector edge cases (no months, single month, multi-month)
4. Verify CRT styling (no border-radius, no gradients, monospace data, structural headers)

Each phase keeps the page fully functional; later phases can be split into separate PRs if needed.

---

## Open Questions

1. **Confirmation copy for FX unlock** — should the confirm dialog show the current locked rate explicitly? Suggested copy: `Unlocking will fetch latest rate from open.er-api.com and discard the manual override (current: 16,780.50). Continue?` — confirm with the team.
2. **Chart color palette for `auto` source vs `manual` source** — should we tint the chart accent slightly when FX source is `manual` / `cached` / `fallback` to remind admins the IDR conversions are based on a non-fresh rate? Or is the section badge enough?
3. **Drill-down filters persistence** — should filter state in drill-down tables persist across month changes? Default: reset (cleaner mental model). Confirm with the team.
4. **Empty-state for first-month operation** — when only one month has data and `/compare` is skipped, should the summary cards show a small "FIRST MONTH — no comparison available" hint, or render silently?

These are tracking only; none are blockers for Phase 1.
