# Ledger Frontend — Vue 3 Best Practices Audit

**Audit date:** 2026-05-17
**Scope:** All files introduced or modified during ledger expansion Phases 1–6
**Auditor:** automated (vue3-best-practices skill) + manual review
**Status:** All findings resolved

---

## Summary

| Severity | Findings | Fixed |
|----------|----------|-------|
| High | 1 | ✓ |
| Medium | 2 | ✓ |
| Low | 9 | ✓ |
| **Total** | **12** | **12** |

---

## Findings & Resolutions

### F-01 — Unstable `:key` on AI costs list
**File:** `src/pages/LedgerPage.vue`
**Severity:** high
**Rule:** `template-key-optimization`

**Problem:**
```html
<!-- BEFORE -->
v-for="(item, i) in data.monthly.ai_costs.breakdown" :key="i"
```
Using array index as `:key` causes Vue to re-use stale DOM nodes when the array is replaced (e.g., on month change). This can produce incorrect rendering artefacts.

**Fix:**
```html
<!-- AFTER -->
v-for="item in data.monthly.ai_costs.breakdown"
:key="`${item.category}/${item.model}`"
```
The `(category, model)` pair is the natural composite identity for an AI cost breakdown row and is stable across re-renders.

---

### F-02 — Template function call re-evaluated on every render
**File:** `src/components/ledger/InfraCostsEditModal.vue`
**Severity:** medium
**Rule:** `reactivity-computed-caching`

**Problem:**
```html
<!-- BEFORE -->
:max="maxEffectiveFrom()"
```
`maxEffectiveFrom()` creates a `new Date()`, performs arithmetic, and formats a string on every re-render (triggered by keystrokes in cost inputs, checkbox toggles, etc.).

**Fix:**
```ts
// AFTER — computed, evaluated once per month rollover
const maxEffectiveDateFrom = computed(() => {
  const now = new Date()
  ...
})
```
```html
:max="maxEffectiveDateFrom"
```

---

### F-03 — Label/checkbox without `for`/`id` association
**File:** `src/components/ledger/InfraCostsEditModal.vue`
**Severity:** medium
**Rule:** accessibility / `other`

**Problem:**
```html
<!-- BEFORE -->
<input v-model="row.included" type="checkbox" />
<label @click="row.included = !row.included">{{ row.category }}</label>
```
Manual `@click` toggle on `<label>` circumvents native browser label semantics and breaks screen reader association.

**Fix:**
```html
<!-- AFTER -->
<input v-model="row.included" :id="`check-${row.category}`" type="checkbox" />
<label :for="`check-${row.category}`">{{ row.category }}</label>
```
Native `for`/`id` pairing restores click, keyboard, and assistive technology behaviour. The `@click` handler removed.

---

### F-04 — Redundant `{ deep: true }` on watch with object-returning computed
**File:** `src/components/ledger/AiUsageDetailSection.vue`
**Severity:** low
**Rule:** `reactivity-watch-vs-watcheffect`

**Problem:**
```ts
// BEFORE
watch([monthRef, filtersRef], () => reset(), { deep: true })
```
`filtersRef` is a `computed` that returns a new object literal on every reactive change. Vue detects the new reference without needing deep traversal, so `deep: true` adds unnecessary object-graph walking.

**Fix:**
```ts
// AFTER
watch([monthRef, filtersRef], () => reset())
```

---

### F-05, F-06, F-07 — `computed(() => props.x)` prop alias instead of `toRef`
**Files:**
- `src/components/ledger/InfraCostsSection.vue`
- `src/components/ledger/RevenueDetailSection.vue`
- `src/components/ledger/AiUsageDetailSection.vue`

**Severity:** low
**Rule:** `reactivity-computed-caching`

**Problem:**
```ts
// BEFORE — adds a redundant computed node just to obtain a Ref
const monthRef = computed(() => props.month)
```
`computed` is designed for *derived/transformed* values. Using it purely to alias a prop adds an unnecessary node to the reactivity graph.

**Fix:**
```ts
// AFTER — direct prop-linked ref, no intermediate computation
const monthRef = toRef(props, 'month')
```

---

### F-08, F-09, F-10 — Duplicate `ChartJS.register(...)` across three chart files
**Files:**
- `src/components/ledger/RevenueBreakdownChart.vue`
- `src/components/ledger/AiUsageBreakdownChart.vue`
- `src/components/ledger/InfraBreakdownChart.vue`

**Severity:** low
**Rule:** `other` (module evaluation duplication)

**Problem:**
Each chart component called `ChartJS.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip)` at module-evaluation time. The same five modules were registered three times across three async chunks.

**Fix:**
Created `src/lib/chart-setup.ts` containing the single canonical `ChartJS.register` call. Each chart component replaces its inline register block with:
```ts
import '@/lib/chart-setup'
```
Chart.js `register()` is idempotent so this is safe even if the module is evaluated more than once due to async chunk loading. The setup module is kept out of `main.ts` to preserve chart.js from the initial bundle (lazy-loading is intentional).

---

### F-11 — `InfraCostsEditModal` eagerly imported in `InfraCostsSection`
**File:** `src/components/ledger/InfraCostsSection.vue`
**Severity:** low
**Rule:** `bundle-tree-shaking`

**Problem:**
```ts
// BEFORE — loaded on every page visit regardless of role
import InfraCostsEditModal from '@/components/ledger/InfraCostsEditModal.vue'
```
The modal is only reachable by superadmin and only when `[ EDIT COSTS ]` is clicked.

**Fix:**
```ts
// AFTER — deferred to first superadmin click
const InfraCostsEditModal = defineAsyncComponent(
  () => import('@/components/ledger/InfraCostsEditModal.vue'),
)
```

---

### F-12 — `ExchangeRateOverrideModal` eagerly imported in `ExchangeRateSection`
**File:** `src/components/ledger/ExchangeRateSection.vue`
**Severity:** low
**Rule:** `bundle-tree-shaking`

**Problem/Fix:** Identical to F-11. Converted to `defineAsyncComponent`.

---

## Items Verified Clean

| Area | Verdict |
|------|---------|
| All files use `<script setup lang="ts">` | ✓ No Options API |
| `useLedger.ts` composable | ✓ Clean — query key factory, conditional `enabled`, partial invalidation all correct |
| `format-delta.ts` | ✓ Pure functions, nothing Vue-specific |
| `vue-chartjs` `<Bar>` lifecycle | ✓ No manual `onUnmounted` needed — vue-chartjs calls `chart.destroy()` internally |
| `chartOptions` as plain `const` in Revenue + Infra charts | ✓ Correct — callbacks only close over pure functions |
| `chartOptions` as `computed` in AiUsage chart | ✓ Correct — callback closes over reactive `sorted.value` |
| `Suspense` pairing with `defineAsyncComponent` | ✓ All three chart components correctly wrapped |
| `useLedgerRevenue` / `useLedgerAiUsage` lazy-load via `enabled` Ref | ✓ Fetch gated on expand, v-if prevents phantom queries |
| Keyset cursor pagination | ✓ `useCursorPagination` reuse is idiomatic |
| Pinia auth store usage | ✓ `isSuperadmin` read via computed, no direct store subscription |

---

## Build Impact After Fixes

| Chunk | Before | After | Delta |
|-------|--------|-------|-------|
| `LedgerPage` | 55.00 kB / 13.73 kB gz | 46.35 kB / 11.63 kB gz | −8.65 kB / −2.1 kB gz |
| `InfraCostsEditModal` (async) | n/a | split into own chunk | deferred |
| `ExchangeRateOverrideModal` (async) | n/a | split into own chunk | deferred |

The `LedgerPage` initial chunk shrank by ~8.6 kB raw (~16%) because `InfraCostsEditModal` and `ExchangeRateOverrideModal` were moved to async chunks that only load on demand.
