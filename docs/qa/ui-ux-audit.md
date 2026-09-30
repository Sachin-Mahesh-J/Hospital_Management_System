# HMS UI/UX Audit (Milestone: Interface Modernization)

Status: Source-backed audit of the current frontend (pre-redesign).  
Scope: Frontend architecture, AppShell, theme, pages, tables, forms, dialogs, dashboard, reports, and related APIs.  
Method: Code inspection of `frontend/src` plus backend report/dashboard contracts. This document does not invent defects.

---

## Architecture snapshot

| Area | Current implementation |
| --- | --- |
| Shell | `frontend/src/app/AppShell.tsx`: static top `AppBar` + horizontal `Stack` of text `Button` links + `Container maxWidth="lg"` |
| Theme | `frontend/src/app/theme.ts`: primary `#075985`, background `#f8fafc`, Inter family declared but **not loaded** in `index.html` |
| Routing | `frontend/src/app/routes.tsx`: permission-guarded feature routes; documents live on patient detail, not a standalone route |
| Shared UI | `Page`, `LoadingState`, `ErrorState`, `EmptyState`, `NotificationProvider` only |
| Icons | `@mui/icons-material` is a dependency and is **unused** |
| Charts | No chart library; dashboard and reports are scalar cards + tables |
| Auth UI | `Can`, `PermissionRoute`, `AnyPermissionRoute`; backend remains authoritative |

Navigation is a **flat list of 18+ modules** (Administrator sees nearly all of them), plus Reports and Change password, plus username and Sign out in the same toolbar.

---

## Critical usability problems

### C1. Horizontal navigation overflow

**Evidence:** `AppShell.tsx` lines 135–182. `Toolbar` contains HMS title, a non-wrapping `Stack direction="row"` of nav `Button`s, then username + Sign out with `ml: 'auto'`. There is no `flexWrap`, no overflow menu, no drawer, and no mobile hamburger.

**Root cause:** Horizontal primary navigation with one control per module. Administrator navigation is the widest because that role has the most permissions.

**Impact:** At common laptop widths (1366×768, 1280×720) and below, later items (Audit, Reports, Change password) and **Sign out** can sit outside the viewport. Users must scroll the page or toolbar horizontally to reach modules. This is a first-class accessibility and operations failure.

**Not isolated:** Any role with many permissions is affected. Narrower roles (for example Laboratory Staff) overflow less, but the architecture is still a single horizontal bar.

### C2. Sign out and account actions can leave the viewport

**Evidence:** Sign out is the last control in the same overflowing toolbar (`AppShell.tsx` 167–179). Change password is a nav item, not a persistent account control.

**Impact:** Signing out must never depend on discovering a horizontally scrolled control.

### C3. Calendar appointment text is clipped

**Evidence:** `AppointmentCalendarPage.tsx` lines 101–122 (`overflow: 'hidden'` on appointment blocks) and 146 (`minWidth: 160` per day column). Week view wraps columns in `Paper sx={{ overflow: 'auto' }}`.

**Root cause:** Absolutely positioned blocks with hidden overflow; seven `minWidth: 160` columns force horizontal scroll inside the calendar, not the page shell. Long patient/doctor labels are cut with no tooltip of the full text.

### C4. Main content width is capped while tables are wide

**Evidence:** AppShell `Container maxWidth="lg"` (~1200px). List tables (patients, appointments, audit, billing) have 6–8+ columns with no sticky first column and no explicit table-only horizontal scroll strategy.

**Root cause:** Page-level width constraint plus unconstrained table layout. Wide tables either compress cells until text collides or overflow the container.

### C5. Dashboard is operationally thin

**Evidence:** `HomePage.tsx` + `DashboardMetrics.tsx`. Authorized users see five optional count cards (`minWidth: 220`) and an API health check. Primary page action is **Check API**. No alerts section, no charts, no permission-aware quick actions, no hospital-date context beyond implicit metrics.

**Data truth:** `GET /api/v1/dashboard` returns only scalars: `hospitalDate`, `currency`, optional `totalPatients.count`, `todaysAppointments.count`, `revenueSummary.{totalAmount,currency,paymentCount}`, `laboratoryRequests.count`, `pharmacyAlerts.{lowStockMedicineCount,nearExpiryBatchCount}`. D-027 explicitly deferred charts.

### C6. No grouped navigation / no module help

**Evidence:** Flat `navigation` array in `AppShell.tsx`. Labels only (Home, Patients, Movements, …). No icons, no descriptions, no grouping of Patient Care vs Pharmacy vs Administration.

**Impact:** Users must already know what “Movements” or “Leave” means. Help is not available from the shell.

---

## High-priority problems

### H1. Inconsistent visual hierarchy

`Page` provides an `h4` title and optional description, but:

- Theme does not define a type scale, radius, or component variants.
- Status values render as raw strings (`active`, `scheduled`) with no chips.
- Detail pages often return bare `LoadingState` / `ErrorState` **without** the page header.
- Reports home is a vertical stack of full-width cards; list pages are tables; dashboard is tiles. There is no shared metric/card language beyond MUI defaults.

### H2. Filter toolbars use fixed `minWidth`

Many list/report filters set `minWidth: 180–220` on `FormControl` (`PatientListPage`, `AppointmentListPage`, `UserListPage`, `AttendanceListPage`, report pages, etc.). Several inner stacks stay `direction="row"` at all breakpoints (patient search row). Combined widths exceed the `lg` container before wrapping.

### H3. Forms are mostly unsectioned

`PatientForm`, `MedicineForm`, `EmployeeForm`, `AppointmentForm`, and similar use a single `Stack` of fields. Related fields sit in the same row (DOB precision + date + sex). There is little helper text for consequential fields (patient status, medicine deactivation effects live only on list copy).

### H4. Empty states often omit a permitted action

List empty states exist (`EmptyState`) but typically say “or register a patient” without rendering the create button inside the empty state. Users who have `patient.create` still have the header action; users who do not still see copy implying they can create.

### H5. Consequential actions without confirmation

Dialogs exist for cancel appointment, void invoice, reverse payment, cancel prescription, reverse dispense.

**One-click mutations (no confirm):**

| Action | Location |
| --- | --- |
| Deactivate / reactivate medicine | `MedicineDetailPage.tsx` |
| Deactivate / reactivate user | `UserListPage.tsx` |
| Approve / reject / cancel leave | `LeaveListPage.tsx` |
| Soft-delete patient document | `PatientDocumentsPanel.tsx` |
| Finalize medical record | `MedicalRecordDetailPage.tsx` |
| Issue invoice | `InvoiceDetailPage.tsx` |
| Collect laboratory sample | `LaboratoryDetailPage.tsx` |

Issue invoice and sample collection are workflow steps; deactivate, void-class, and finalize are the highest-risk gaps.

### H6. Reports are tables without using summary data that already exists

Revenue `summary.byMethod` and pharmacy `summary.{lowStock,nearExpiry,expired}` are already returned by the API and rendered as extra count cards. They are not visualized. Appointment and laboratory reports are **paginated rows only** — there is no status summary, so a status pie from the current page would be false analytics.

### H7. Dashboard loads two independent statuses

Home fetches API health with local state **and** dashboard metrics via React Query. Two loading regions can appear. “Check API” is not an operational action.

### H8. Accessibility gaps

- No Inter font load; declared family falls back to Segoe UI / Arial.
- Almost no `aria-label` on icon-like or dense action clusters (today they are text buttons, which is better than unlabeled icons).
- Detail loading states have no page title for screen-reader orientation.
- Intermittent snackbar has no explicit live-region configuration beyond MUI defaults.
- Calendar blocks are links with clipped text and no accessible name beyond the truncated content.

### H9. Select menus are not themed for long labels

`Autocomplete` is unused. `Select` uses defaults (portal, so parent `overflow` usually does not clip the menu). Remaining risk: selected values and `MenuItem` text do not wrap; filter `minWidth` plus dense toolbars hide part of the closed select. Date/time fields in appointment filters do not `fullWidth` on small screens.

---

## Medium / low priority

### M1. No design tokens beyond palette + font family

No standardized radius, elevation, table header treatment, or button hierarchy (`contained` vs `outlined` vs `text` is ad hoc).

### M2. Change password lives in primary nav

It competes with clinical modules. It belongs in an account menu.

### M3. “Movements” label is jargon

The route is stock movements (`/pharmacy/movements`). The label does not say so.

### M4. Icons unused

Meaning is carried only by text. A sidebar will need icons, but they must not replace labels.

### M5. Notification queue is single-slot

`NotificationProvider` replaces the current snackbar. Fine for this milestone; do not add a second notification system.

### M6. Calendar week view is dense by design

Hour grid uses fixed `HOUR_HEIGHT_PX`. Acceptable if the **page shell** does not scroll horizontally and appointment titles are available via tooltip/focus.

### M7. Patient / doctor dropdowns capped at 100 rows

Appointment filters and medical-record patient select load `pageSize: 100`. This is an existing data UX limit, not a visual bug. Do not silently fetch unbounded lists for a dashboard widget.

---

## Screen-by-screen (current state)

| Screen | Observed problem | Severity |
| --- | --- | --- |
| AppShell | Horizontal overflow; ungated density; Sign out at end of bar | Critical |
| Login | Functional; outside shell; no shared visual system with app | Low |
| Dashboard / Home | KPI tiles only; Check API as primary action; no alerts/quick actions | Critical |
| Patients | Usable list; filter minWidth; empty state has no gated action | High |
| Patient form | Ungrouped fields | High |
| Appointments | Dense filters; status as text | High |
| Calendar | Clipped labels; column minWidth scroll | Critical |
| Medical records | Finalize without confirm; form patient list cap | High |
| Prescriptions | Create page omits loading/error for medicines query | High |
| Laboratory | Sample collect one-click; list otherwise consistent | Medium |
| Medicines | Deactivate one-click; empty copy vs permission | High |
| Inventory / Movements | Consistent lists; jargon label | Medium |
| Billing | Void/reverse have dialogs; issue is one-click | Medium |
| Admissions | Honest “no discharge UI” copy | Low |
| Attendance / Leave | Leave approve/reject/cancel one-click | High |
| Users | Deactivate one-click; action column crowded | High |
| Audit | Many filters; wide table | Medium |
| Reports home | Card list is clear but visually thin | Medium |
| Report pages | Good loading/empty/error/print; no charts from real summaries | High |
| Documents panel | Delete one-click | High |
| Doctor schedules | Inline table; no confirm | Low |

---

## Dashboard / reporting data: what exists vs what must not be faked

### Available now (safe to visualize)

| Source | Fields | Honest visualization |
| --- | --- | --- |
| `GET /api/v1/dashboard` | Five D-027 metrics + `hospitalDate` + `currency` | KPI cards; pharmacy two-count alert breakdown |
| `GET /api/v1/reports/revenue` `meta.summary` | `totalAmount`, `paymentCount`, `byMethod[]` | Method distribution chart **on the revenue report** (already scoped to the selected date range) |
| `GET /api/v1/reports/pharmacy` `meta.summary` | low-stock, near-expiry, expired counts | Three-category chart **on the pharmacy report** |

Do **not** fetch paginated report rows on the dashboard solely to draw a chart. Do **not** treat the current page of appointments/lab rows as a status distribution.

### Not available (do not manufacture)

| Desired chart | Why it cannot be built | Smallest future backend addition (not in this UI milestone unless separately approved) |
| --- | --- | --- |
| Appointments by status (full range) | Appointment report has rows + pagination, no `summary.statusCounts` | Add `meta.summary` with counts by status for the same filters |
| Appointments over time | No daily/weekly series | Optional `meta.summary.byDate[]` |
| Laboratory by status / over time | Same as appointments | `meta.summary` on laboratory report |
| Patient registrations over time | Patient report is a paginated list with `createdAt` per row | Monthly counts endpoint or summary |
| Revenue over time | Summary is totals + method, not by day | `byDate` on existing aggregate |
| Dashboard payment-method pie | Dashboard `revenueSummary` omits `byMethod` (report aggregate already computes it) | Optionally include `byMethod` on dashboard DTO |

CSV/PDF report export remains deferred per D-027. Browser print already exists.

---

## Root-cause summary

1. **Navigation architecture** — one horizontal toolbar cannot hold Administrator’s module set.
2. **Flex overflow** — toolbar `Stack` row without wrap; main `Container` not `minWidth: 0` in a flex shell (will matter after a sidebar).
3. **Fixed min-widths** on filters and metric cards.
4. **Absolute positioning + overflow hidden** on calendar blocks.
5. **Theme is a palette stub** — no table/dialog/select defaults, font not loaded.
6. **Dashboard contract is scalar** — UI over-promised analytics without using even the summaries reports already return.
7. **Help and grouping absent** — labels only.

---

## Constraints for the redesign (do not violate)

- Do not change authentication, authorization, validation, audit, or domain workflows.
- Do not add routes that do not exist. **Patient documents is not a top-level route**; it stays on patient detail.
- Navigation remains permission-aware (`Can` / `hasAnyPermission`).
- Do not invent chart values.
- Keep the existing snackbar notification mechanism.
- Do not add CSV/PDF report export.
- Backend changes, if any, must be identified separately; this audit recommends **frontend-only** visualization of existing summaries.

---

## Planned UX direction (implementation follows this audit)

1. Left sidebar / drawer (expanded, collapsed+tooltip, temporary on small screens).
2. Grouped, permission-filtered modules with contextual help.
3. Top bar: menu toggle, page title, account menu, **always-reachable Sign out**.
4. Design-system components only where repeated: `Page` header, `ContextHelp`, `StatusChip`, `ConfirmDialog`, `MetricCard`, category chart, filter bar.
5. Dashboard: D-027 KPIs, pharmacy alerts, permission-aware quick actions, real category chart only when dashboard already has counts.
6. Reports: keep six categories; add charts only from `summary` payloads.
7. Tables scroll inside their container; the application shell never requires horizontal scrolling for primary navigation.

---

## Post-implementation verification (this milestone)

| Screen | Previous problem | Change | Verification |
| --- | --- | --- | --- |
| AppShell | Horizontal nav overflow | Grouped left sidebar, collapsible, temporary drawer on small screens; Sign out in top bar | Unit tests PASS; login page no page-level overflow at 1280 and 375 |
| Dashboard | Bare KPI tiles + Check API as primary | Metric cards, pharmacy alert chart from real counts, permission-aware quick actions, system status secondary | `reports.test.tsx` PASS |
| Reports home | Thin card stack | Responsive report cards | Tests PASS |
| Revenue report | Method totals as extra cards only | Category chart from `summary.byMethod` | Source-backed; tests not chart-specific |
| Pharmacy report | Count cards only | Category chart from summary counts | Source-backed |
| Patients | Filter minWidth; empty copy without action | FilterBar wrap; StatusChip; empty-state create when permitted; form sections | Tests PASS |
| Appointments | Dense filters; text status | Wrapping filters; StatusChip; form sections | Tests PASS |
| Calendar | Clipped labels; month grid overflow | Tooltip/aria-label on blocks; month grid scrolls inside paper | Tests PASS |
| Medicines | One-click deactivate; weak empty state | Confirm dialog; StatusChip; empty create action | Tests PASS |
| Users | One-click deactivate | Confirm dialog; StatusChip | Tests PASS |
| Leave | One-click approve/reject/cancel | Confirm dialog; StatusChip | Tests PASS |
| Medical records | One-click finalize | Confirm dialog | Tests updated PASS |
| Documents | One-click delete | Confirm dialog | Tests PASS |
| Login | Isolated form | Same contract; Inter font loaded | Browser PASS at 1280; no overflow at 375 |

Authenticated Administrator visual QA across every desktop size still needs a local sign-in in the tester’s browser. Cursor browser QA did not use stored credentials.
