# M14 Requirements-to-Implementation Audit

Status: Audit complete. D-027 approved. Milestone 14 implemented as documented in
`docs/development/reports-and-dashboard.md`.
Date: 2026-09-28  
Primary requirements source: `docs/requirements/requirements-analysis.md` (approved
baseline derived from `Hospital_system.pdf`)

`Hospital_system.pdf` is **not present** in the workspace. This audit does not
reconstruct missing PDF wording. It uses the approved requirements analysis, decision
register, architecture/security/database documents, and the current repository.

This milestone is a decision gate. No APIs, schema, permissions, screens, or tests for
unimplemented functionality were added.

## Audit status

```text
M14 Audit — Complete
Implementation — Complete (D-027)
```

## Recommended next milestone

**Reports and Dashboard**, as a read model over existing operational data.

This is the remaining current-scope PDF functional area whose upstream modules exist.
It is **not sufficiently specified** for implementation. Work must not start until
**D-027** is approved.

## Source-of-truth notes

1. Code, Prisma schema, and migrations were treated as implementation evidence.
2. Schema presence alone was not treated as implemented functionality.
3. Approved requirements and decisions were treated as scope. Common hospital-software
   features that are not in those documents were not added.

---

## 1. Completed product milestones (repository evidence)

| Milestone | Claim | Evidence | Audit result |
| --- | --- | --- | --- |
| M0 | Requirements and architecture | `docs/requirements/`, `docs/architecture/`, `docs/security/`, `docs/database/` | Implemented as documentation. Architecture status line still omits admissions in one place; otherwise current. |
| M1 | Project initialization | Root npm workspace, `frontend/`, `backend/`, quality scripts | Implemented. |
| M3 | Physical PostgreSQL schema | `backend/prisma/schema.prisma`; initial migration `20260919160000_initial_physical_schema`; M13 migration `20260928233000_admissions_one_active_per_patient` | Implemented. |
| M4 | Core infrastructure | Health, env, logger, errors, OpenAPI, request IDs, pagination | Implemented. Home page is an API health check, not the PDF dashboard. |
| M5 | Authentication and authorization | Auth routes, JWT/refresh, RBAC catalog, bootstrap-admin, CSRF/CORS | Authentication and permission enforcement implemented. **No application API exists to create users or assign roles** beyond `bootstrap-admin`. That is a concrete gap versus “Administrator manages users,” but M5 was delivered as login/RBAC/bootstrap rather than a user-admin module. |
| M6 | Patient management | Patient API, UI, tests, `docs/development/patient-management.md` | Implemented for demographics/search/status. Document upload remains deferred. |
| M7 | Departments, staff, doctors, schedules | Department/employee/doctor/schedule APIs and UI | Implemented. Attendance and leave remain unimplemented despite existing tables. |
| M8 | Appointment management | Appointment API, UI, conflict tests, D-021 | Implemented as a filtered list, not a calendar widget. Booking/cancel/reschedule/status exist. |
| M9 | Medical records and prescriptions | Clinical APIs, UI, D-022 | Implemented, including medical-report children. |
| M10 | Laboratory | Lab APIs, on-screen print report, D-023 | Implemented within D-023. Catalog write, cancel, finalize, and result correction remain deferred. |
| M11 | Pharmacy | Inventory, receive, adjust, dispense, reverse, D-024 | Implemented within D-024. Near-expiry/low-stock **alerts** and catalog write remain deferred. |
| M12 | Billing and payments | Invoices, payments, receipts, D-025 | Implemented for consultation, laboratory, and pharmacy charges. Admission billing remains deferred. |
| M13 | Admissions under D-026 | Admission API/UI/tests; partial unique index migration | Implemented. Discharge and cancel APIs exist and are ungranted by policy. |

Do not reimplement these modules.

---

## 2. Requirements-to-implementation matrix

Status meanings used below:

- **Implemented** — backend API, authorization, validation, frontend (where UI is
  required), and tests exist for the approved slice.
- **Partial** — some layers or an approved subset exist; named PDF capability is not
  complete.
- **Missing** — required by current-scope documentation; not implemented.
- **Deferred** — explicitly deferred by an approved decision or module document.
- **Not specified** — named or implied, but business rules are insufficient to
  implement without a new decision.

| Requirement | Source | Current implementation | Status | Evidence | Decision needed? |
| --- | --- | --- | --- | --- | --- |
| Login / logout | PDF user management; D-003 | `/api/v1/auth/login`, `refresh`, `logout`; Login page | Implemented | `auth.routes.ts`, `LoginPage.tsx`, `backend/test/database/auth.test.ts` | No |
| Authenticated password change | PDF password management | `/api/v1/auth/change-password`; Change password page | Implemented | `auth.routes.ts`, `ChangePasswordPage` | No |
| Forgotten-password / admin reset | PDF password management; decision register | None | Not specified | Decision register: identity verification beyond authenticated change and administrator reset is unresolved | Yes |
| Roles and RBAC enforcement | PDF roles; D-005 | Seven system roles, permission catalog, middleware | Implemented | `roleCatalog.ts`, `accessControl.ts` | No |
| Operational user create / role assign | PDF user management; Administrator “manage users” | Bootstrap script only; employee can link an existing `userId` | Partial / discrepancy | `bootstrap-admin.ts`; no `/users` routes in `app.ts` | Yes — whether a user-admin API is in scope |
| Patient register / update / search | PDF 3.2; D-012 | Patient CRUD-without-delete | Implemented | `patient.routes.ts`, patient UI, `patients.test.ts` | No (display-format/duplicates remain open and non-blocking) |
| View medical history | PDF 3.2 / 3.5 | Patient detail lists medical records when `medical_record.read` is present | Implemented | `PatientDetailPage.tsx`, medical-record APIs | No |
| Upload patient documents | PDF 3.2; ADR-004; M6 deferred | `patient_documents` table only; UI states upload is deferred | Deferred | Schema model `PatientDocument`; no module; no `document.*` permissions; patient UI alert | Yes — see documents gate below |
| Add / update doctors; assign department | PDF 3.3 | Doctor profiles linked to employees/departments | Implemented | doctor/employee APIs and UI | No |
| Manage doctor schedules | PDF 3.3 | Explicit intervals; no recurrence/overlap policy | Partial | `schedule.service.ts`; organization doc lists recurrence/breaks/overlap as unresolved | No for M14 (already an open M7 remainder) |
| Book / cancel / reschedule; track status; select doctor | PDF 3.4; D-013; D-021 | Full appointment write API and list UI | Implemented | appointment module + tests | No |
| Calendar-oriented appointment interface | PDF UI | Date-range filtered table; no calendar widget | Partial | `AppointmentListPage.tsx` | Yes — whether a calendar widget is still required |
| Diagnoses, treatments, prescriptions, treatment history | PDF 3.5; D-014; D-022 | Medical records + prescriptions | Implemented | medical-record and prescription modules | No |
| Produce medical reports | PDF 3.5 | `medical_reports` children on a record | Implemented | `MedicalReport` model and UI | No (this is not analytics) |
| Lab requests, sample collection, result entry | PDF 3.6; D-023 | Implemented slice | Implemented | laboratory module | No |
| Generate laboratory reports | PDF 3.6; D-023 L-018 | On-screen assembled request report + browser print | Implemented for the approved per-request report | `LaboratoryReportPage.tsx`; no stored PDF | No for per-request reports. Analytics lab reports are a separate PDF 3.10 item. |
| Medicine inventory, stock, dispensing, expiry check at dispense | PDF 3.7; D-015; D-020; D-024 | Receiving, adjustments, movements, dispense, reverse; expired batches cannot be dispensed | Implemented within D-024 | pharmacy module | No |
| Monitor medicine expiry / pharmacy alerts | PDF 3.7 / dashboard | Expiry stored and used at dispense; inventory sortable by expiry; no alert feed | Partial | `isBatchExpired`; D-024: no expiry job or near-expiry alerts; `low_stock_threshold` unused by application code | Yes if dashboard pharmacy alerts are in M14 |
| Consultation / lab / pharmacy charges; invoices; payments; printable receipts | PDF 3.8; D-016; D-025 | Implemented | Implemented | billing module | No |
| Admission charges | PDF 3.8; D-025 | Schema `invoice_items.admission_id` exists; billing rejects admission items | Deferred | D-025; `billing.schemas.test.ts` rejects admission items | No — remain deferred |
| Inpatient admissions | PDF inpatient; D-009; D-026 | Minimal admission lifecycle | Implemented | admissions module + M13 migration | No |
| Ward / bed / transfer | Not specified; D-009 | No tables | Deferred / not applicable | D-009, D-026 | No |
| Register employees; assign departments | PDF 3.9 | Employee API and UI | Implemented | employees module | No |
| Record attendance | PDF 3.9; D-019 | `attendance_records` table only | Missing / not specified | No attendance permission, route, or UI. Capture method unresolved. | Yes before any attendance milestone |
| Maintain leave records | PDF 3.9; D-019 | `leave_records` table only | Missing / not specified | Leave types, allowances, overlap, approval policy unresolved | Yes before any leave milestone |
| Patient / appointment / revenue / pharmacy / laboratory / staff reports | PDF 3.10 | No report module, routes, permissions, or screens | Missing / not specified | `app.ts` has no reports router; Home page is health-only; exact columns/filters/exports unresolved | **Yes — D-027** |
| Dashboard: total patients, today’s appointments, revenue summary, laboratory requests, pharmacy alerts | PDF dashboard | Not implemented | Missing / not specified | `HomePage.tsx` health check; revenue recognition and pharmacy-alert rules unresolved | **Yes — D-027** |
| Login / patient / appointment / billing screens | PDF required UI | Present for those modules | Implemented | frontend routes | No |
| Secure login, hashing, RBAC, session timeout | PDF security; ADR-003 | Implemented | Implemented | auth + security architecture | No |
| Audit logs | PDF security | Append-only writes; no read/export API | Partial | `audit.service.ts` write-only; Administrator “view audit records” has no permission or UI | Yes before an audit-viewer milestone |
| Responsive UI; loading/error/empty/notification states | PDF usability | Shared `StateViews` and notifications exist on implemented screens; main nav is a single horizontal toolbar | Partial | `AppShell.tsx`, `StateViews.tsx`; no dedicated mobile nav | No for M14 |
| Daily/weekly backups, HA, DR | PDF reliability | Not implemented; provider runbooks pending | Deferred / operational | Decision register operational targets | No for M14 |
| Cloud deployment (Vercel/Render/Supabase) | D-001; ADR-005 | Target architecture accepted; not deployed | Planned | ADR-005; workflow step 20 | No for M14 |
| Mobile app, patient portal, SMS/email, telemedicine, insurance, AI, biometrics | PDF future enhancements | None | Deferred | Requirements analysis explicit deferral | No |

---

## 3. Remaining current-scope requirements

Only items supported by approved project documentation:

1. **Reports and dashboard** (PDF 3.10 and dashboard UI) — recommended M14 candidate; blocked on D-027.
2. **Attendance and leave** (PDF 3.9) — schema exists; application policy incomplete (D-019 remainder).
3. **Patient document upload** (PDF 3.2) — ADR-004 storage architecture accepted; operational/security policies incomplete; M6 explicitly deferred implementation.
4. **Operational user administration** (create users, assign roles, administrator password reset) — baseline says Administrator manages users; only bootstrap exists.
5. **Audit-record viewing/export** — baseline says Administrator views audit records; writes exist, reads do not.
6. **Appointment calendar widget** — PDF UI names a calendar-oriented interface; current UI is a filtered table.
7. **Cloud deployment and reliability runbooks** — D-001 current target; workflow steps 18–20; not started.
8. **Admission billing** — named in PDF 3.8; **explicitly deferred by D-025**. Not M14.

Partial leftovers inside completed modules (not M14 unless a later decision reopens them): ungranted admission discharge/cancel (D-026), doctor/nurse appointment ownership filters, lab cancel/finalize/correct, pharmacy catalog write, tax/discount, stored PDF receipts, schedule recurrence.

---

## 4. Explicitly deferred items — verified current status

| Item | Still deferred? | Evidence |
| --- | --- | --- |
| Patient documents (implementation) | Yes | M6 patient doc; no API; UI still says deferred. ADR-004 **is accepted** for architecture. Remaining blockers are size/MIME/category/retention/malware/permissions, not “whether Supabase Storage is the store.” |
| Admission billing | Yes | D-025; M13 did not change billing; invoice admission category unused |
| Insurance | Yes | PDF future enhancement; D-025 restates insurance deferred |
| Notifications / SMS / email | Yes | PDF future enhancement; M13 deferred list |
| Mobile application | Yes | PDF future enhancement |
| Patient portal | Yes | PDF future enhancement |
| Telemedicine | Yes | PDF future enhancement |
| AI decision support | Yes | PDF future enhancement |
| Biometrics | Yes | PDF future enhancement |
| External integrations | Yes | Not in current-scope requirements |
| Advanced analytics / warehouse | Yes | Architecture: no materialized views/warehouse without measured evidence |
| Bed / ward / transfer | Yes | D-009 / D-026 |
| Reports and dashboard (application) | Yes until D-027 | Named current-scope requirement; not implemented |
| Attendance / leave (application) | Yes until remaining D-019 items | Tables exist; no API |

Do not implement PDF future enhancements unless scope is explicitly changed.

---

## 5. Database inspection (no schema changes made)

Migrations:

- `20260919160000_initial_physical_schema`
- `20260928233000_admissions_one_active_per_patient` (partial unique index on active admissions)

### Tables with no application API

| Table | Purpose | Notes |
| --- | --- | --- |
| `patient_documents` | Document metadata for ADR-004 | No repository/service/routes |
| `attendance_records` | D-019 attendance | No API; unique per employee/work date |
| `leave_records` | D-019 leave | No API |

`audit_logs` has a write service only.

### Fields / relationships unused by current application policy

| Item | Why it exists | Current use |
| --- | --- | --- |
| `invoice_items.admission_id` / category `admission` | PDF admission charges | Deferred by D-025; billing rejects admission lines |
| `invoices.due_at`, `discount_amount`, `tax_amount` | D-016 structural | Tax/discount remain zero; no due-date policy |
| Payment status `void` | D-017 set | Unused; effective states `recorded` / `reversed` |
| `lab_results.finalized_*`, `supersedes_lab_result_id` | D-014 storage | D-023 deferred finalize/correct |
| `lab_request_items.price_snapshot` | Billing snapshot | D-023 left null; M12 uses catalog price at invoice time |
| `medicines.low_stock_threshold` | Dashboard/pharmacy alerts | No application read/write beyond schema default |
| User → attendance / leave / documents relations | Physical design | Unused at runtime |

### Schema limitations for remaining requirements

- **Reports / dashboard:** no report tables by design. Existing date/status indexes on patients, appointments, invoices, lab requests, batches, employees are intended for bounded queries. **No migration is required** to start a read-model reports module.
- **Documents:** metadata table exists. Object storage is outside PostgreSQL. Implementation would not need a new domain table unless policy adds one; it would need storage credentials, validation, and permissions.
- **Attendance / leave:** tables exist. A later workflow might still need check constraints or leave-type reference data **after** policy approval. Do not migrate speculatively.
- **Admission billing:** `admission_id` on invoice items already exists. A later billing change would be policy/API, not necessarily a new table.

---

## 6. Permissions inspection (no permissions added)

There are no `report.*`, `dashboard.*`, `document.*`, `attendance.*`, `leave.*`,
`audit.read`, or `user.*` permission codes in `auth.constants.ts` / `roleCatalog.ts`.

Existing codes cover identity, patients, organization, appointments, clinical,
laboratory, pharmacy, billing, and admissions only.

Approved baseline role text that is **not** represented as permission codes:

- Administrator: “View system reports and audit records.”
- Accountant: “revenue reports.”

Laboratory staff “generate laboratory reports” is already implemented as
`lab_request.read` on the per-request print view (D-023). That is not a PDF 3.10
analytics report permission.

**A future reports module cannot reuse existing permissions without a new approved
matrix.** Using `patient.read` / `invoice.read` / `inventory.read` as report access
would leak data across roles (for example Accountant has invoice access but not
patient clinical data; Pharmacist has inventory access but not revenue).

Admission `update` / `discharge` / `cancel` exist as codes and remain ungranted
(D-026). That is policy, not an M14 defect.

---

## 7. Frontend inspection

Routes exist for login, home, password change, patients, departments, employees,
doctors, appointments, admissions, medical records, prescriptions, laboratory
(including report), pharmacy inventory/receive/adjust/movements, and billing
invoices/receipts. All are permission-gated except Home and login.

Visibly missing versus current-scope requirements:

- Dashboard metrics on Home (`HomePage.tsx` is API health only)
- Reports navigation and screens
- Document upload/list on patient detail (explicit deferred message)
- Attendance / leave screens
- User administration screens
- Audit log viewer
- Calendar widget

Implemented feature screens generally use loading/error/empty helpers. Role
visibility uses `Can` / `PermissionRoute`. Main navigation is a single horizontal
button row with no drawer/collapse; that is a responsive risk, not a new module.

---

## 8. Backend inspection

Mounted routers in `app.ts`: health, auth, patients, departments, employees, doctors,
appointments, admissions, medical-records, prescriptions, medicines, lab, pharmacy,
billing lookups, invoices, payments. OpenAPI is implemented-contract only (`0.10.0`).

Missing backend for remaining current-scope items: reports/dashboard query endpoints,
document upload orchestration, attendance/leave, user provisioning, audit read.

Present but intentionally incomplete: admission discharge/cancel (ungranted);
billing admission category (rejected); lab/pharmacy deferred workflows documented in
D-023/D-024.

Audit writes occur on material module actions. Transactions and `FOR UPDATE` / unique
conflicts are used in appointments, clinical, lab, pharmacy, billing, and admissions.

---

## 9. Testing coverage (gaps only; no tests added)

| Area | Present | Missing for remaining work |
| --- | --- | --- |
| Auth | API DB tests, crypto, login frontend | User-admin API tests (no API) |
| Patients / org / appointments / clinical / lab / pharmacy / billing / admissions | Schema tests, API DB tests (RBAC + workflows), Zod tests, frontend tests | — |
| Appointments concurrency | Exclusion constraints + conflict mapping | — |
| Admissions concurrency | One-active and lifecycle races | — |
| Reports / dashboard | None | API, RBAC, date-boundary, aggregation, frontend |
| Documents | Schema table exists in initial migration | Upload/auth/type/size tests |
| Attendance / leave | None | — |
| Audit read | Write assertions in module tests | Read/export RBAC tests |
| Frontend dashboard | None | Role-visibility of metrics |

---

## 10. Why Reports and Dashboard is the M14 candidate

Selection rules used: explicit approved requirements, current project scope,
dependencies on completed modules, existing decisions, and whether rules are specified
enough to code.

Reports and Dashboard is the only remaining **named current-scope functional area**
that:

1. is required by the approved PDF baseline (not a future enhancement);
2. is designed as queries over data that M6–M13 already persist;
3. needs no schema invention (logical model: no report tables);
4. is listed after operational modules in `docs/development/development-workflow.md`
   (step 17).

It is **not** ready to implement. Exact columns, filters, date periods, exports,
revenue recognition, pharmacy-alert rules, and role visibility are unresolved in the
decision register.

Attendance/leave is also current-scope and appears as workflow step 16, but capture
method, leave types, allowances, overlap, and approval policy are unresolved (D-019).
Those tables being empty is not a blocker for employee-only staff reports; whether
staff reports include attendance is itself a reports decision.

Patient documents remain blocked on upload-size/type/retention/malware policy despite
ADR-004.

Admission billing remains deferred by D-025.

**Implementation of M14 must not start until D-027 is approved.**
