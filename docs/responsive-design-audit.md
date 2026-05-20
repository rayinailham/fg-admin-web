# Responsive Design Audit — Phase 8

**Scope:** All admin dashboard pages except `LedgerPage` (already audited & fixed in Phase 7d).
**Target viewports:** mobile 375px, tablet 768px, desktop 1024px+.
**Approach:** mobile-first; preserve Calm Professional visual archetype; only adjust layout, density, and breakpoint behavior — no visual style changes.

---

## Executive Summary

The dashboard was originally designed desktop-first with a fixed 224 px sidebar, fixed 14 px body font, and several places where input fields sit at 12 px with 1.5 px vertical padding (≈ 24 px tall). On a real phone (375 px) this produces:

1. **Forced horizontal scroll on every page** — fixed sidebar (`w-56`) plus `p-6` main padding pushes minimum width to ≈ 480 px.
2. **iOS zoom-on-focus** — every `<input>` / `<select>` / `<textarea>` is 12 px which triggers Safari's auto-zoom.
3. **Sub-44 px touch targets** — pill buttons at `px-2 py-0.5` (≈ 22 px tall) and pagination links are too small.
4. **Filter form crammed** — `grid-cols-2` on a 375 px viewport leaves ≈ 167 px per column; date pickers and selects clip.
5. **Chart panes overflow** — fixed `h-40` charts inside `lg:grid-cols-2` work, but stat-card grid `grid-cols-2 lg:grid-cols-4` leaves only 156 px per card on phone, truncating numeric values.
6. **Tables work** — `DataTable.vue` already wraps in `overflow-x-auto`, so horizontal scroll is contained per-table (correct behaviour).
7. **Modals already responsive** — `Modal.vue` uses `max-w-[calc(100vw-1rem)] sm:max-w-lg`, fine.

The fixes below all use Tailwind utility classes plus a small global CSS rule for input font-size. No custom media queries were introduced; container queries were not needed because viewport breakpoints already match the natural component boundaries.

---

## Global Patterns Applied

| Pattern | Where | Why |
|---|---|---|
| `text-base` (16 px) on form controls | Every `<input>`, `<select>`, `<textarea>` via global CSS rule | Prevents iOS Safari zoom on focus |
| `min-h-[44px]` on primary form controls and action buttons | Inputs, primary buttons | WCAG 2.5.5 / Apple HIG touch target |
| `px-3 sm:px-6 py-4 sm:py-6` on `<main>` | DashboardLayout | Tighter padding on mobile |
| `grid-cols-1 sm:grid-cols-2 lg:grid-cols-N` | Stat / metric grids | Stack on phone, expand on tablet+ |
| `flex-col sm:flex-row` on page headers | Title + action button rows | Avoid title clipping when an action button sits beside it |
| Hamburger sidebar (`fixed inset-y-0` + `translate-x-*`) | DashboardLayout + Sidebar | Replace permanent sidebar on `<lg` |
| `hidden sm:table-cell` on non-essential columns | DataTable + per-page column defs | Hide low-priority columns on phone |
| Form button rows: `flex-col sm:flex-row` + `w-full sm:w-auto` | All modal forms, filter forms | Full-width primary CTA on phone |
| `overflow-x-auto` wrapper on multi-column compare grids | AssessmentComparePage 3-column compare | Allow horizontal scroll for 3-up comparison |

---

## Page-by-Page Findings

### 1. AuthLayout (wrapper for Login & Change Password)
- **Severity:** medium
- **Issues found:** uses `flex items-center justify-center` with no padding. On a 320 px phone the card sits flush against the edges.
- **Fix applied:** added `px-4 py-8` to the centering wrapper so cards keep breathing room on small phones.

### 2. LoginPage
- **Severity:** high
- **Issues:** card has fixed `w-full max-w-sm`. Inputs at `text-[14px]` triggered iOS zoom. Submit button OK (`w-full`).
- **Fix applied:** form inputs lifted to `text-base min-h-[44px]`; password/email labels widened spacing slightly; card now has `mx-auto` and tightened padding (`p-6 sm:p-8`) so it fills 375 px screens cleanly without being edge-flush.

### 3. ChangePasswordPage
- **Severity:** high
- **Issues:** same as Login — `text-xs` on inputs (12 px → iOS zoom), button is `w-full` (good).
- **Fix applied:** inputs raised to `text-base min-h-[44px]`; helper text and label sizes preserved; card `p-6 sm:p-8`.

### 4. DashboardLayout
- **Severity:** critical
- **Issues:** `flex` row layout with permanent `w-56` sidebar. Below 1024 px, content is cramped; below 600 px the page barely renders. `<main>` has `p-6` (24 px) which is heavy on mobile.
- **Fix applied:**
  - Sidebar becomes `fixed` slide-in drawer below `lg` breakpoint. Backdrop overlay added.
  - Topbar gets a hamburger button (visible `lg:hidden`).
  - `<main>` padding stepped: `p-3 sm:p-4 lg:p-6`.
  - Sidebar drawer auto-closes on navigation.

### 5. Sidebar
- **Severity:** critical
- **Issues:** `sticky h-screen w-56` permanently consumes width; no close affordance.
- **Fix applied:** dual mode — `fixed inset-y-0 -translate-x-full lg:translate-x-0 lg:static`. New `open` prop and `close` event. Close button visible only on mobile. Width unchanged on desktop.

### 6. Topbar
- **Severity:** medium
- **Issues:** uses `px-6` — too tight on phone alongside time string + logout button. No hamburger trigger.
- **Fix applied:** `px-3 sm:px-6`; hamburger button left-aligned visible `lg:hidden`; date string truncated on phone (`hidden sm:block`); logout button uses tighter padding on phone.

### 7. OverviewPage
- **Severity:** high
- **Issues:**
  - Stat grid `grid-cols-2 lg:grid-cols-4` → 156 px columns on phone (numbers cramped)
  - Chart controls `flex flex-wrap gap-2` work but fixed `h-40` is short on landscape
  - School ranking grid uses `grid-cols-1 lg:grid-cols-2` — fine
- **Fixes applied:** stat grid → `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`; chart heights now `h-48 sm:h-56 lg:h-64`; combined-chart legend wraps; range buttons get `min-h-[36px]` for tappability; school ranking row text remains, but gap reduced on small screens; school name uses `truncate` so long names don't push count off-screen.

### 8. MonitoringPage
- **Severity:** medium
- **Issues:**
  - Header uses `flex items-start justify-between` — rate limit + last refresh + button overflow on phone
  - Postgres / Redis / Services in `lg:grid-cols-2` — already responsive, fine
  - Queue `grid-cols-2 lg:grid-cols-4` — works
- **Fixes applied:** header → `flex-col sm:flex-row gap-3`; refresh metadata wrapping `flex-wrap`; superadmin actions buttons get `w-full sm:w-auto`; status badge / latency cluster wraps.

### 9. UsersPage (List)
- **Severity:** high
- **Issues:**
  - Filter form `grid-cols-2 lg:grid-cols-4` — date pickers clip on phone
  - Apply / Clear inline → fine but needs full-width on mobile
  - Table → already horizontal-scroll via DataTable wrapper, **correct**
- **Fixes applied:** filters → `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`; action button row `w-full sm:w-auto`; column hiding markup added at the column-definition level (`hideOnMobile: true` flag, see DataTable change).

### 10. UserDetailPage
- **Severity:** high
- **Issues:**
  - Header (back button + title + suspended badge) uses `flex items-start justify-between` — clips badge on phone
  - Actions panel has up to 7 buttons in `flex-wrap` — works but each button hits 22 px height
  - Profile + Stats `lg:grid-cols-2` — fine
  - Three DataTables — fine (horizontal scroll)
- **Fixes applied:** header `flex-col sm:flex-row gap-3`; action buttons `min-h-[36px]` + adequate padding; transaction filter chips wrap better; pagination buttons `min-h-[36px]`.

### 11. AssessmentsPage (List)
- **Severity:** high
- **Issues:** same as UsersPage filters; date_from/date_to fields clip; "Compare" button next to title clips.
- **Fixes applied:** title row `flex-col sm:flex-row`; filter grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`; button row full-width on mobile.

### 12. AssessmentDetailPage
- **Severity:** high
- **Issues:**
  - Header status badge can wrap awkwardly with title
  - Scores grid `lg:grid-cols-3` already responsive
  - Answer accordion table uses fixed widths inside a scroll container — fine
  - Long career-pathing role cards work
  - VIA-IS domain label `w-16 truncate` — OK
- **Fixes applied:** header `flex-col sm:flex-row gap-3`; status badges wrap on phone; answers table wrapped in `overflow-x-auto`; long score-domain labels (`w-4 sm:w-6`) accommodate digit padding.

### 13. AssessmentChatPage
- **Severity:** medium
- **Issues:** session info `grid-cols-2 lg:grid-cols-4` → values cramped on phone (UUID + label).
- **Fixes applied:** info `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`; message bubbles already use `whitespace-pre-wrap` (good); session ID `break-all` on mobile so UUID doesn't overflow.

### 14. AssessmentComparePage
- **Severity:** high
- **Issues:**
  - 2 / 3-column compare grid is cramped at 3-up below 1024 px
  - Multi-column score comparison sections use `grid-cols-2` / `grid-cols-3` unconditionally — overflow on phone
- **Fixes applied:** compare grids switch to `grid-cols-1 sm:grid-cols-2 lg:grid-cols-${cols}`; row of buttons wraps; selected-slots list spans full width on mobile; selection table benefits from existing `overflow-x-auto`. (This page was complex; fix preserves the 2-up vs 3-up logic on desktop.)

### 15. PromptsPage (List)
- **Severity:** medium
- **Issues:** card list — `flex-wrap` headers, but cache/vars/updated row uses `gap-4` and overflows on small phones.
- **Fixes applied:** meta row `flex flex-wrap gap-x-4 gap-y-1`; status + version pills wrap below name on phone.

### 16. PromptDetailPage
- **Severity:** high
- **Issues:**
  - Header `flex items-start justify-between` — version + active badge clips
  - Actions row of 4 buttons works (flex-wrap) but small targets
  - Edit modal textarea `rows="12"` good, but inputs 12 px → iOS zoom
  - Content `<pre>` already has `overflow-x-auto`
  - Version history cards use `flex justify-between` → date wraps
- **Fixes applied:** header stacks; modal inputs lifted to 16 px; textarea retains 12 rows but min-height responsive; version cards use `flex-wrap`.

### 17. AbTestsPage (List)
- **Severity:** medium
- **Issues:** "[ NEW TEST ]" button next to title clips on phone; status filter form is `flex items-end gap-3` — clips.
- **Fixes applied:** title row `flex-col sm:flex-row gap-3`; filter row wraps; new-test button `w-full sm:w-auto`.

### 18. AbTestDetailPage
- **Severity:** high
- **Issues:**
  - Header status + winner badge clip
  - Usage / prompt / result comparison `lg:grid-cols-2` — already responsive
  - Verdict modal: `<select>` and `<textarea>` at 12 px → zoom
- **Fixes applied:** header stacks; modal form uses 16 px controls; winner badge wraps.

### 19. AbTestNewPage
- **Severity:** medium
- **Issues:** form already vertical; version A/B grid `grid-cols-2` works on phone (only 2 small numeric inputs).
- **Fixes applied:** all inputs 16 px / `min-h-[44px]`; submit/cancel row `flex-col sm:flex-row`; form buttons full-width on phone.

### 20. ConfigPage
- **Severity:** high
- **Issues:**
  - Header reload button next to title clips
  - Tab bar `flex` (not `flex-wrap`) clips when there are 5 categories on phone
  - Each entry: name on left, two action buttons on right with `flex items-start justify-between` — actions wrap below on phone? Actually they don't — they just push name out. Needs vertical stacking.
- **Fixes applied:** header `flex-col sm:flex-row`; tab bar `flex flex-wrap` + `overflow-x-auto` fallback (rely on wrap; tabs auto-wrap to second line); entry top row `flex-col sm:flex-row gap-2`; audit/edit buttons `min-h-[32px]`.

### 21. AdminsPage
- **Severity:** high
- **Issues:**
  - Header has 2 buttons next to title — clips
  - Each admin card has: name + email on left, role + must-change pill on right + 3 action buttons below — pills clip badge on right
  - Modals all use 12 px inputs
- **Fixes applied:** header `flex-col sm:flex-row gap-3` + button group full-width on phone; admin card top row `flex-col sm:flex-row`; status pills wrap; action buttons `min-h-[32px]`; modals lift to 16 px controls.

### 22. DataTable (shared)
- **Severity:** medium
- **Issues:**
  - Pagination buttons `text-[12px]` and no min height — small targets
  - No mechanism to hide columns on mobile
- **Fixes applied:**
  - Pagination buttons get `min-h-[36px]` and `px-3` to be tappable
  - New `hideOnMobile?: boolean` field on column → renders `hidden sm:table-cell` on `<th>` and `<td>`
  - Existing `overflow-x-auto` wrapper kept (the right pattern)

### 23. Modal (shared)
- Already responsive (`max-w-[calc(100vw-1rem)] sm:max-w-lg`). Verified close button is 12 px text but sits in a clearly-tappable area; inflated to `min-h-[32px]` with `px-2` padding.

---

## Patterns to Avoid (now cleaned up)

- ❌ `text-xs` (12 px) on form controls → use global rule lifting controls to 16 px
- ❌ `flex items-start justify-between` for page headers when both sides may grow → use `flex-col sm:flex-row`
- ❌ `grid-cols-2` as base for stat grids → start with `grid-cols-1`
- ❌ Buttons under 44 px tall on mobile primary actions → enforce `min-h-[44px]` for primary, `min-h-[36px]` for secondary

---

## Verification

- `npm run build` — passes (TypeScript strict, no warnings)
- Manual resize test in DevTools: 320 px → 375 px → 768 px → 1024 px → 1440 px transitions cleanly with no horizontal scroll on body (only intra-table scroll)
- All form controls verified at 16 px font-size in DevTools `Computed` tab
- Hamburger drawer opens/closes via button + backdrop
- All `<select>` controls (incl. native iOS picker) tested at 16 px

---

## Out of Scope

- **LedgerPage** + ledger components — already responsive (Phase 7d)
- Visual style changes (palette, borders, fonts) — preserved
- Container queries — not needed; viewport breakpoints align with component boundaries
- Dark mode — N/A (not implemented project-wide)
