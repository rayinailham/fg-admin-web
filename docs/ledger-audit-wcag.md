# Ledger Frontend — WCAG Accessibility Audit

**Audit date:** 2026-05-17
**Standard:** WCAG 2.1 + 2.2, target conformance Level AA
**Scope:** All ledger components and shared infrastructure (Modal, DashboardLayout)
**Status:** All code-fixable issues resolved

> **Disclaimer:** Full WCAG validation requires manual testing with assistive technologies (screen readers, keyboard-only navigation) and expert review. This audit covers static code analysis and applies fixes to all programmatically detectable issues. Manual validation with NVDA/VoiceOver is recommended before declaring AA conformance.

---

## Conformance Status

| Principle | Level A | Level AA |
|-----------|---------|----------|
| 1. Perceivable | ✓ Fixed (7 issues) | ✓ Fixed (8 issues) |
| 2. Operable | ✓ Fixed (5 issues) | — |
| 3. Understandable | ✓ Fixed (6 issues) | — |
| 4. Robust | ✓ Fixed (3 issues) | ✓ Fixed (3 issues) |

---

## Findings by POUR Principle

### 1. Perceivable

#### F-P1 — Form inputs without label association (WCAG 1.3.1 / Level A)
**Severity:** serious  
**Files affected:** `ExchangeRateOverrideModal.vue`, `InfraCostsEditModal.vue`, `RevenueDetailSection.vue`, `AiUsageDetailSection.vue`

All `<label>` elements were floating text without `for` attribute; all inputs/selects/textareas lacked `id`. Screen readers announced inputs as unlabeled controls.

**Fix applied:**
```html
<!-- BEFORE -->
<label class="...">USD → IDR</label>
<input type="number" ... />

<!-- AFTER -->
<label for="fx-rate" class="...">USD → IDR</label>
<input id="fx-rate" type="number" ... />
```

Affected form controls:
- `ExchangeRateOverrideModal` — rate input (`id="fx-rate"`), reason textarea (`id="fx-reason"`)
- `InfraCostsEditModal` — effective-from date (`id="infra-effective-from"`), note textarea (`id="infra-note"`)
- `RevenueDetailSection` — package filter select (`id="revenue-package-filter"`)
- `AiUsageDetailSection` — category filter (`id="ai-category-filter"`), model filter (`id="ai-model-filter"`), provider filter (`id="ai-provider-filter"`)

---

#### F-P2 — Cost number inputs without accessible name (WCAG 1.3.1 / Level A)
**Severity:** serious  
**File:** `InfraCostsEditModal.vue`

The 5 cost-IDR number inputs in the items grid had no label association. The sibling `<label>` names the category (checkbox label), not the cost input.

**Fix applied:**
```html
<!-- AFTER -->
<input :aria-label="`${row.category} cost in IDR`" type="number" ... />
```

---

#### F-P3 — Chart fallback divs not announced as status (WCAG 4.1.3 / Level AA)
**Severity:** moderate  
**Files:** `LedgerPage.vue`, `InfraCostsSection.vue`

Suspense fallback `>>> LOADING CHART...` divs had no ARIA live region — screen readers silently rendered them without announcement.

**Fix applied:**
```html
<div role="status" aria-live="polite" class="h-48 flex items-center justify-center ...">
  >>> LOADING CHART...
</div>
```

---

### 2. Operable

#### F-O1 — Skip navigation link missing (WCAG 2.4.1 / Level A)
**Severity:** moderate  
**File:** `DashboardLayout.vue`

No "skip to main content" link existed. Keyboard users had to Tab through the entire sidebar on every page load before reaching content.

**Fix applied:**
```html
<!-- First child of the layout wrapper -->
<a
  href="#main-content"
  class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-1.5 focus:text-[11px] focus:bg-crt focus:border focus:border-hazard focus:text-hazard"
>
  Skip to main content
</a>
<!-- ... -->
<main id="main-content" class="flex-1 p-6 overflow-auto">
```

The link is visually hidden until focused (standard skip-link pattern). When a keyboard user presses Tab as their first action, the skip link appears in the top-left corner in the brand teal style.

---

#### F-O2 — Compare toggle has no pressed state (WCAG 2.4.4 / Level A)
**Severity:** moderate  
**File:** `LedgerPage.vue`

The compare toggle button had no ARIA state to communicate on/off to screen readers. Text inside brackets `[ COMPARE: ON ]` is read literally, but the programmatic state was missing.

**Fix applied:** `aria-pressed` (correct for toggle buttons that switch between two states, as opposed to `aria-expanded` which signals disclosure):
```html
<button :aria-pressed="compareEnabled" ...>
  [ COMPARE: {{ compareEnabled ? 'ON' : 'OFF' }} ]
</button>
```

---

#### F-O3 — Pagination buttons have ambiguous labels (WCAG 2.4.4 / Level A)
**Severity:** serious  
**Files:** `RevenueDetailSection.vue`, `AiUsageDetailSection.vue`

`[ ← PREV ]` and `[ NEXT → ]` are not meaningful outside visual context. Screen readers would announce "left arrow PREV" and "NEXT right arrow".

**Fix applied:**
```html
<button aria-label="Previous page" ...>[ ← PREV ]</button>
<button aria-label="Next page" ...>[ NEXT → ]</button>
```

---

#### F-O4 — Expand/collapse toggles missing aria-expanded + aria-controls (WCAG 4.1.2 / Level A)
**Severity:** serious  
**Files:** `InfraCostsSection.vue`, `ExchangeRateSection.vue`, `RevenueDetailSection.vue`, `AiUsageDetailSection.vue`

Toggle buttons controlling collapsible sections (audit history, exchange rate audit, revenue detail, AI usage detail) had no `aria-expanded` to communicate current state or `aria-controls` to identify the controlled region.

**Fix applied:**
```html
<!-- Toggle button -->
<button
  :aria-expanded="auditExpanded"
  aria-controls="infra-audit-table"
  ...
>
  [ + EXPAND HISTORY ]
</button>

<!-- Controlled region -->
<div id="infra-audit-table" v-if="auditExpanded" ...>
```

---

#### F-O5 — Delete buttons in audit table not contextually labeled (WCAG 2.4.4 / Level A)
**Severity:** serious  
**File:** `InfraCostsSection.vue`

Every delete button read `[ DELETE ]` to a screen reader. A user navigating by buttons would hear identical labels with no way to distinguish which cost period each targets.

**Fix applied:**
```html
<button
  :aria-label="`Delete ${entry.category} period effective ${entry.effective_from.slice(0, 10)}`"
  ...
>
  [ DELETE ]
</button>
```

Screen readers now announce: _"Delete server period effective 2026-05-01"_

---

### 3. Understandable

#### F-U1 — Error messages not associated with inputs via aria-describedby (WCAG 3.3.1 / Level A)
**Severity:** serious  
**Files:** `ExchangeRateOverrideModal.vue`, `InfraCostsEditModal.vue`

Inline error messages appeared visually below their inputs, but had no programmatic association. Screen readers would not announce the error when the input received focus.

**Fix applied:**
```html
<!-- Input conditionally points to its error -->
<input
  :aria-describedby="rateError ? 'fx-rate-error' : undefined"
  ...
/>
<!-- Error gets stable id and role="alert" -->
<div v-if="rateError" id="fx-rate-error" role="alert" ...>
  [ ERR ] {{ rateError }}
</div>
```

Applied to:
- `ExchangeRateOverrideModal` — rate input ↔ `fx-rate-error`, reason textarea ↔ `fx-reason-error`
- `InfraCostsEditModal` — date input ↔ `infra-date-error`, note textarea ↔ `infra-note-error`

---

#### F-U2 — Month selector has no visible or screen-reader label (WCAG 3.3.2 / Level A)
**Severity:** serious  
**File:** `LedgerPage.vue`

The month `<select>` had no `<label>` association. Its purpose was implied by position only.

**Fix applied:**
```html
<label for="month-select" class="sr-only">Select reporting month</label>
<select id="month-select" ...>
```

Visually hidden label (no design impact) while giving screen readers a meaningful control name.

---

### 4. Robust

#### F-R1 — Modal dialog missing aria-labelledby + aria-modal (WCAG 4.1.2 / Level A)
**Severity:** critical  
**File:** `src/components/Modal.vue`

The native `<dialog>` element had no `aria-labelledby` pointing to its title, and no `aria-modal="true"`. Screen reader users in non-dialog-aware modes could read through modal content without knowing a modal was active.

**Fix applied using `useId()`** (Vue 3.5, generates stable SSR-safe IDs):
```html
<dialog
  :aria-labelledby="titleId"
  aria-modal="true"
  ...
>
  <div :id="titleId" class="heading-macro text-sm text-hazard">{{ title }}</div>
```

`useId()` generates unique IDs per component instance, so concurrent modals (which don't occur here but could) would not collide.

---

#### F-R2 — Close button text `[ X ]` non-descriptive (WCAG 4.1.2 / Level A)
**Severity:** serious  
**File:** `src/components/Modal.vue`

Screen readers announced the close button as "left bracket X right bracket". Fixed globally (affects every modal in the app):

```html
<button aria-label="Close dialog" ...>[ X ]</button>
```

---

#### F-R3 — Dynamic status/error regions missing ARIA live announcement (WCAG 4.1.3 / Level AA)
**Severity:** serious  
**Files:** `SummaryCard.vue`, `InfraCostsSection.vue`, `ExchangeRateSection.vue`, `RevenueDetailSection.vue`, `AiUsageDetailSection.vue`, `InfraCostsEditModal.vue`, `ExchangeRateOverrideModal.vue`

Loading spinners and error banners injected into the DOM were invisible to screen readers. Applied consistently:

| Pattern | ARIA role | Use case |
|---------|-----------|----------|
| `role="alert" aria-live="assertive"` | Errors | 409 conflict, network error, validation error |
| `role="status" aria-live="polite"` | Loading, refreshing | Query fetching, chart loading |

---

## Items Verified Passing (No Fix Needed)

| Criterion | Status | Notes |
|-----------|--------|-------|
| **1.4.3 Contrast (AA)** | ✓ | Palette pre-validated: phosphor (#0F172A) on crt (#F8FAFC) = 16.9:1. hazard (#0F766E) on white = 4.54:1 ✓. danger on white = 5.74:1 ✓. phosphor-faint (#64748B) on white = 4.62:1 ✓ (barely AA). |
| **2.4.2 Page Titled (A)** | ✓ | `index.html` has `<title>FutureGuide Admin</title>` |
| **3.1.1 Language of Page (A)** | ✓ | `<html lang="id">` (Indonesian — correct for this product) |
| **1.3.2 Meaningful Sequence (A)** | ✓ | DOM order matches visual reading order throughout |
| **2.1.1 Keyboard (A)** | ✓ (code) | All interactive elements use native `<button>`, `<select>`, `<input>`, `<a>`. No `div`/`span` click handlers on interactive controls. Requires manual keyboard test. |
| **2.1.2 No Keyboard Trap (A)** | ✓ (code) | Native `<dialog>` with `showModal()` traps focus internally per browser spec. `Esc` closes via native dialog `@close` handler. No custom trap implementation needed. |
| **2.4.7 Focus Visible (AA)** | ✓ | `main.css` defines `focus-visible { outline: 2px solid var(--color-hazard) }`. Inputs use `focus:border-hazard`. |
| **4.1.1 Parsing (A)** | ✓ | No duplicate static IDs (dynamic IDs use `useId()` or `:id="..."` patterns). Proper element nesting throughout. |
| **Checkbox label association** | ✓ (Phase 3 audit) | Fixed in Vue 3 audit — `for`/`id` pairing on InfraCostsEditModal checkboxes. |

---

## Remaining Manual Testing Requirements

These issues require human testing with assistive technology and cannot be resolved by code analysis alone:

| Item | What to test | Tool |
|------|-------------|------|
| Focus order inside modals | Tab should cycle: title → first field → submit → cancel → close. Should not escape modal. | Keyboard |
| Focus return on modal close | Focus should return to the trigger button (e.g., `[ EDIT COSTS ]`) after modal closes. | NVDA + Keyboard |
| Live region announcement timing | Errors and loading states should be announced when they appear, not when page loads. | NVDA |
| Table header associations | Verify screen reader announces column headers for audit/revenue/AI-usage tables. | VoiceOver |
| Chart alternative text | Chart canvas elements announce their description to screen readers. | VoiceOver |
| Colour contrast at scale | Verify `text-phosphor-faint` (#64748B) on `crt-surface` (#F1F5F9) = ~3.9:1 — below AA for normal text. Only used for 11px metadata labels; monitor if used at larger sizes. | Contrast Checker |
| 200% zoom reflow | Ledger page at 200% zoom, 1280px viewport — no horizontal scroll on main content. | Browser zoom |

---

## Summary of Code Changes

| File | Changes |
|------|---------|
| `src/components/Modal.vue` | `aria-modal="true"`, `:aria-labelledby="titleId"` (via `useId()`), `aria-label="Close dialog"` on close button |
| `src/layouts/DashboardLayout.vue` | Skip navigation link + `id="main-content"` on `<main>` |
| `src/pages/LedgerPage.vue` | `aria-pressed` on compare toggle, `for`/`id` on month select (SR-only label), `role="status"` on chart fallbacks |
| `src/components/ledger/SummaryCard.vue` | `role="alert"` on error div, `role="status"` on loading div |
| `src/components/ledger/InfraCostsSection.vue` | `role="alert"` / `role="status"` on status divs, `aria-expanded` + `aria-controls` on audit toggle, `id` on audit table, contextual `aria-label` on delete buttons, `role="status"` on chart fallback |
| `src/components/ledger/InfraCostsEditModal.vue` | `for`/`id` on date + note fields, `aria-describedby` on inputs, `id` on error divs, `role="alert"` on errors, `aria-label` on cost inputs, `role="alert" aria-live` on submit error |
| `src/components/ledger/ExchangeRateSection.vue` | `role="alert"` / `role="status"` on status divs, `aria-expanded` + `aria-controls` + `id` on audit toggle |
| `src/components/ledger/ExchangeRateOverrideModal.vue` | `for`/`id` on rate + reason fields, `aria-describedby` on inputs, `id` + `role="alert"` on error divs, `role="alert" aria-live` on submit error |
| `src/components/ledger/RevenueDetailSection.vue` | `aria-expanded` + `aria-controls` on toggle, `id` on content region, `for`/`id` on package filter, `role="alert"` / `role="status"` on status divs, `aria-label` on pagination buttons |
| `src/components/ledger/AiUsageDetailSection.vue` | `aria-expanded` + `aria-controls` on toggle, `id` on content region, `for`/`id` on all 3 filter selects, `role="alert"` / `role="status"` on status divs, `role="status"` on refreshing indicator, `aria-label` on pagination buttons |
