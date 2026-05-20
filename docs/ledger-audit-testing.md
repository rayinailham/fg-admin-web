# Ledger Frontend — Testing Audit

**Audit date:** 2026-05-17
**Scope:** All test files introduced or modified during ledger expansion Phases 1–6 + new coverage added by this audit
**Baseline:** 209 passing tests before audit
**After audit:** 271 passing tests

---

## Coverage Map

| File | Test file | Coverage |
|------|-----------|----------|
| `src/lib/format-delta.ts` | `format-delta.test.ts` ← **NEW** | ✓ full (pure functions) |
| `src/components/ledger/SummaryCard.vue` | `SummaryCard.test.ts` ← **NEW** | ✓ props, deltas, badges, colors |
| `src/components/ledger/InfraCostsSection.vue` | `InfraCostsSection.test.ts` ← **NEW** | ✓ loading, error, RBAC, audit, delete |
| `src/components/ledger/InfraCostsEditModal.vue` | `InfraCostsEditModal.test.ts` (Phase 3) | ✓ existing |
| `src/components/ledger/ExchangeRateSection.vue` | `ExchangeRateSection.test.ts` ← **NEW** | ✓ loading, error, RBAC, all 4 source flags, confirm |
| `src/components/ledger/ExchangeRateOverrideModal.vue` | `ExchangeRateOverrideModal.test.ts` (Phase 4) | ✓ existing |
| `src/components/ledger/RevenueDetailSection.vue` | via `LedgerPage.test.ts` | ✓ integration (expand, pagination, error) |
| `src/components/ledger/AiUsageDetailSection.vue` | via `LedgerPage.test.ts` | ✓ integration (expand, filter, row render) |
| `src/components/ledger/RevenueBreakdownChart.vue` | — | ⊘ intentionally skipped (visual) |
| `src/components/ledger/AiUsageBreakdownChart.vue` | — | ⊘ intentionally skipped (visual) |
| `src/components/ledger/InfraBreakdownChart.vue` | — | ⊘ intentionally skipped (visual) |
| `src/composables/useLedger.ts` | `useLedger.test.ts` (Phase 1) | ✓ key shapes, mutation invalidation |
| `src/lib/api-ledger.ts` | via composable + page tests | ✓ transitively |
| `src/lib/chart-setup.ts` | — | ⊘ registration-only side-effect module |
| `src/pages/LedgerPage.vue` | `LedgerPage.test.ts` | ✓ integration (22 tests) |

---

## New Test Files

### `src/lib/format-delta.test.ts` — 19 tests

Pure function coverage for the formatting utility used across all ledger components:

| Function | Test cases |
|----------|-----------|
| `formatDelta` | null delta, undefined, percent=null (NEW badge), zero (neutral), positive (+▲ green), negative (-▼ red), inverse flag (cost decrease = green), custom suffix, decimal precision |
| `formatMarginPoints` | zero neutral, positive green, negative red, custom suffix |
| `formatIDR` | Rp prefix, rounding, zero |
| `formatUSD` | $ prefix + 2dp, zero, integers |
| `formatPercent` | 2dp default, custom digits |

**Why this was missing:** Pure utility functions are easy to overlook when focus is on component integration. They carry the entire delta-indicator colour logic and should be tested in isolation before relying on component tests to catch edge cases.

---

### `src/components/ledger/SummaryCard.test.ts` — 12 tests

Prop-driven component; no composables, no API calls, no VueQueryPlugin needed:

| Area | Tests |
|------|-------|
| Loading state | Shows `>>> LOADING SUMMARY...` placeholder |
| Error state | Shows error text with ERROR prefix |
| Metric cards | All 4 cards present (revenue, total-costs, AI, infra, net profit) |
| Period + FX header | Period string and badge text rendered |
| No compare | No delta elements in DOM |
| Positive delta | Green `text-terminal-green` class + `+%` text + `▲` |
| Inverse delta (AI costs) | Cost decrease renders green (inverse semantic verified) |
| Null percent delta | `[ NEW ]` badge rendered |
| Margin delta | `pts vs prev` text present |
| Negative net profit | `text-danger` class on profit value |
| FX source badges | `manual` → hazard class; `cached` → phosphor-dim; `fallback` → danger |

---

### `src/components/ledger/InfraCostsSection.test.ts` — 11 tests

Requires VueQueryPlugin (calls `ledgerApi.getInfraCosts`). Auth mock uses `reactive()` proxy (see Patterns section).

| Area | Tests |
|------|-------|
| Loading | Loading placeholder rendered before query resolves |
| Error | Error banner with ERROR text |
| Active basis | All 5 categories rendered (DATABASE, REDIS, SERVER, DOMAIN, OTHER) |
| RBAC — edit | Button hidden for admin; shown for superadmin |
| Audit expand | Toggle shows/hides audit table; history row text visible |
| Audit collapse | Second click hides table |
| RBAC — delete | DELETE per-row button hidden for admin; shown for superadmin |
| Delete flow | Click DELETE → confirm appears; confirm click → `deleteInfraCost` called with correct period ID |

---

### `src/components/ledger/ExchangeRateSection.test.ts` — 17 tests

Requires VueQueryPlugin (calls `ledgerApi.getExchangeRate`). Auth mock uses same `reactive()` pattern.

| Area | Tests |
|------|-------|
| Loading | Loading placeholder |
| Error | Error banner |
| Rate data | `fx-data` section present |
| Source badges | `auto` → terminal-green; `manual` → hazard; `cached` → dim; `fallback` → danger |
| Cached warning | Inline "Upstream API failed" warning shown |
| Fallback warning | Inline "No rate has ever been stored" warning shown |
| Refresh labels | `auto` → REFRESH FROM API; `manual` → UNLOCK & REFRESH; `cached` → RETRY UPSTREAM; `fallback` → FETCH RATE |
| RBAC | Override + refresh buttons hidden for admin; shown for superadmin |
| Auto refresh | Clicking refresh fires mutation immediately (no intermediate confirm) |
| Manual refresh | Clicking refresh does NOT fire mutation until confirm step completes |
| Confirm fires mutation | Confirm button triggers `refreshExchangeRate` |
| Audit expand/collapse | Toggle shows/hides; history entry text visible |
| Empty audit | `[ NO AUDIT ENTRIES ]` shown |

---

## Patterns Applied

### 1. Auth Store Mocking — `reactive()` proxy, not `ref()`

**Problem:** `createTestingPinia({ initialState: { auth: { payload: {...} } } })` does not correctly propagate role changes into `isSuperadmin` computed in setup stores. Additionally, `v-if="auth.isSuperadmin"` when `auth = { isSuperadmin: ref(false) }` is always truthy because the Ref object itself is truthy.

**Pattern used:**
```ts
const authMock = reactive({ isSuperadmin: false })
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => authMock,
}))

// In mountSection():
authMock.isSuperadmin = isSuperadmin

// In beforeEach():
authMock.isSuperadmin = false  // reset for isolation
```

`reactive()` creates a proxy where `authMock.isSuperadmin` is a plain boolean, not a Ref. Vue templates evaluate this correctly with `v-if`.

---

### 2. Blackbox Assertions — `data-testid` + text, not implementation

All tests follow the blackbox pattern from the skill reference:
- Query by `data-testid` attributes
- Assert on rendered text and element presence
- Simulate user interactions via `trigger('click')` + `flushPromises()`
- Never access `wrapper.vm` internals

---

### 3. `flushPromises()` for async queries

TanStack Query resolution happens asynchronously. Tests that need data rendered always call `await flushPromises()` after mount. Tests with chained async ops (e.g., click → mutation → invalidation) call `flushPromises()` twice.

---

### 4. Confirm-dialog tests — behavior over DOM presence

`Modal.vue` always renders its slot content in the DOM regardless of the `:open` prop (the dialog's `showModal`/`close` API only controls native dialog visibility, not slot rendering). Tests that check whether a confirm step fires before a mutation assert on **mutation call count**, not `element.exists()`:

```ts
// WRONG — element is always in DOM
expect(wrapper.find('[data-testid="confirm-refresh"]').exists()).toBe(false)

// CORRECT — assert on behavior
expect(mockRefreshExchangeRate).not.toHaveBeenCalled()
```

---

### 5. Charts — intentionally not unit-tested

`RevenueBreakdownChart`, `AiUsageBreakdownChart`, `InfraBreakdownChart` are visual components. They are:
- Covered transitively via `LedgerPage.test.ts` (components mount but JSDOM has no canvas; chart rendering is suppressed)
- Validated at build time via `vue-tsc` type-checking
- Evaluated visually (per plan §"Test Plan": "Charts not unit-tested (visual)")

---

## Coverage Gaps Still Present (non-blocking)

| Item | Reason not tested | Risk level |
|------|-------------------|------------|
| Chart `paletteFor()` logic | Pure function inside `.vue`, not exported | Low — visual only |
| `useCursorPagination` reset on filter change | Tested transitively via drill-down LedgerPage tests | Low |
| `InfraCostsEditModal` day-1 boundary date edge (Dec→Jan rollover) | `defaultEffectiveFrom` logic for m=12 | Low — pure date math |
| `ExchangeRateSection` 502 error toast path | Requires mocking `useRefreshExchangeRate` to reject with status 502 | Low — covered by Phase 4 composable test |

---

## Test Count Progression

| Phase | Tests passing |
|-------|---------------|
| Phase 1 (API + composable) | 175 |
| Phase 2 (summary card) | 179 |
| Phase 3 (infra costs) | 189 |
| Phase 4 (exchange rate) | 199 |
| Phase 5 (charts) | 199 |
| Phase 6 (drill-downs) | 209 |
| Vue 3 audit (no new tests) | 209 |
| **Testing audit (this audit)** | **271** |

Net gain this audit: +62 tests (format-delta: 19, SummaryCard: 12, InfraCostsSection: 11, ExchangeRateSection: 17, plus 3 isolation improvements).

The 16 failures remain pre-existing in non-ledger files (DataTable, UsersPage, AssessmentsPage, AbTestsPage, UserDetailPage).
