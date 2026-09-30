# HMS Manual QA Test Plan (Local, Pre-M17)

Status: Ready for execution  
Scope: Manual QA and inspection only. This document does not change application code, schema, permissions, environment files, or deployed systems.  
Primary sources: current `frontend/`, `backend/`, `backend/prisma/schema.prisma`, `backend/src/docs/openApi.ts`, `backend/src/auth/roleCatalog.ts`, and approved docs under `docs/`.  
`Hospital_system.pdf` is **not** in the workspace and was not reconstructed.

## How to use this document

1. Execute tests in phase order unless a later phase is blocked.
2. Record every case in `docs/qa/manual-qa-results.md`.
3. Do **not** mark PASS because a unit test, TypeScript compile, or route exists.
4. Verdicts:

| Verdict | Meaning |
| --- | --- |
| `PASS` | You manually verified the workflow and it behaved as specified here |
| `FAIL` | You manually tested it and it is incorrect |
| `BLOCKED` | You cannot test it because of another issue or missing prerequisite |
| `NOT TESTED` | Not yet executed |
| `N/A` | The capability is not implemented, is approved-deferred, or does not apply to that role |

5. Record format for every case:

```text
Case ID:
URL / endpoint:
Role / account:
Expected result:
Actual result:
Verdict: PASS | FAIL | BLOCKED | NOT TESTED | N/A
Notes / evidence:
```

6. Approved deferred functionality is **not a bug**. Mark those checks `N/A` and note `DEFERRED`.
7. Do not delete audit rows after testing unless the project owner later instructs it.

---

## Inspection notes that affect testing

These are implementation facts, not assumed product behavior.

| Fact | Evidence | Tester impact |
| --- | --- | --- |
| Login uses **username**, not email | `LoginPage.tsx`, `POST /api/v1/auth/login` | There is no email-login path |
| Users have **no email field** | `users` model; `user.schemas.ts` | Duplicate-email user tests are N/A |
| Access token is **in-memory only** | `frontend/src/api/client.ts` | `localStorage` / `sessionStorage` must not contain the JWT |
| Refresh cookie is HttpOnly, path `/api/v1/auth`, name `hms_refresh` (default) | `auth.constants.ts`, `refreshCookie.ts` | Inspect in DevTools → Application → Cookies |
| Local cookie is **not** `Secure`; SameSite is `Lax` | `refreshCookie.ts` | Expected locally; production uses `Secure; SameSite=None` |
| Cookie-auth POSTs need `X-HMS-CSRF: 1` and allowlisted `Origin` | `csrfProtection.ts` | Swagger login/refresh/logout must send the header |
| Lockout: **5** failed logins → **15 minutes** | `FAILED_LOGIN_LIMIT`, `TEMPORARY_LOCK_MS` | Use a dedicated lockout account |
| Rate limit: login **20 / 15 min**, refresh **60**, change-password **10** | `auth.routes.ts` | Only auth routes are rate-limited |
| Health check is **liveness only** (no DB probe) | `health.service.ts` | `200` does not prove Prisma is healthy |
| Patient / employee / admission / invoice / payment numbers are server-generated | `P-<uuid>`, `E-<uuid>`, `ADM-<uuid>`, `INV-<uuid>`, `PAY-<uuid>` | Client must not be able to set them |
| Appointment calendar has **no dedicated API** | Uses `GET /api/v1/appointments` with `startsAtFrom` / `startsAtTo` | Calendar is a UI over the list endpoint |
| `admission.update` / `discharge` / `cancel` exist but **no role is granted** | `roleCatalog.ts`, OpenAPI, D-026 | Expect **403**. This is approved, not a defect |
| Medicine and lab catalogs are **read-only** | D-023, D-024 | If catalogs are empty, Phases 13–16 are BLOCKED |
| Local `DOCUMENT_STORAGE_DRIVER=memory` returns fake signed URLs | `documentStorage.ts` | Browser cannot open a real file unless local env uses Supabase. Do not change `.env` unless the owner asks |
| Administrator has **no** `admission.*` | `roleCatalog.ts` | Admin cannot open `/admissions` |
| Doctor / Nurse have **no** `appointment.*` | D-021 / D-033 | They cannot see Appointments or Calendar |
| Doctor author, lab collector, pharmacist dispenser require a **linked active employee** | module docs | Unlinked clinical users get conflict/validation errors |
| Leave cancel is **owner-only**, even for Administrator | `leave.service.ts` `cancelLeave` | Admin UI may still show Cancel (M16-05). API must return 403 |
| Audit export rejects **> 5000** rows with `AUDIT_EXPORT_TOO_LARGE` | `audit.service.ts` | 5000 is allowed; 5001 is 400 |
| One role per user is now a unique constraint | `uq_user_roles_user_id` | Inspect in Phase 27 |
| Pagination `pageSize` max is **100** | shared query schemas | `pageSize=101` must be 400 |
| Report / audit / leave range max is **366** days | report/audit/leave schemas | Inverted or oversized ranges must be 400 |

---

## Local URLs

| Surface | URL |
| --- | --- |
| Frontend | `http://localhost:5173` |
| Login | `http://localhost:5173/login` |
| API | `http://localhost:5000` |
| Health | `http://localhost:5000/api/v1/health` |
| Swagger UI | `http://localhost:5000/api/docs` |
| OpenAPI JSON | `http://localhost:5000/api/v1/openapi.json` |
| Database | local PostgreSQL `hms_development` (default port `5432`) |

Start (from repo root, after env files already exist):

```text
npm run dev
```

Do not copy, edit, or commit `.env` as part of this QA pass.

---

# Feature inventory

Status values:

- **IMPLEMENTED** — present in routes + service + UI (unless noted API-only)
- **IMPLEMENTED / UNGRANTED** — route exists; no current role has the permission
- **DEFERRED** — approved out of scope (do not fail)
- **NOT IMPLEMENTED** — no route/UI
- **REQUIREMENTS ONLY** — documented target, not an application feature

## Authentication and identity

| Module | Feature | Frontend route | Backend | Method | Permission | Roles | Business rules | Success | Validation / error |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Auth | Login | `/login` | `/api/v1/auth/login` | POST | none (CSRF) | public | Active user; 5 failures lock 15 min; dummy hash on unknown user | 200 `{ data: { accessToken, user } }` + refresh cookie | 401 `INVALID_CREDENTIALS`; 429 `AUTH_RATE_LIMITED`; 403 CSRF/origin |
| Auth | Refresh | (automatic) | `/api/v1/auth/refresh` | POST | none (CSRF + cookie) | session | Rotate refresh; idle 30 min; absolute 7 days; reuse revokes chain | 200 `{ data: { accessToken } }` | 401 `INVALID_REFRESH_SESSION` |
| Auth | Logout | AppBar Sign out | `/api/v1/auth/logout` | POST | none (CSRF + cookie) | session | Revoke session; clear cookie | 204 | — |
| Auth | Current user | (bootstrap) | `/api/v1/auth/me` | GET | `identity.self.read` | all roles | Returns roles + permissions | 200 | 401 / 403 |
| Auth | Change password | `/change-password` | `/api/v1/auth/change-password` | POST | `identity.password.change` | all roles | Policy 12–128, letter+number, ≥4 distinct chars, blocklist; revokes all sessions | 204 | 400 `CURRENT_PASSWORD_INVALID` / policy |
| Health | Liveness | Home “Check API” | `/api/v1/health` | GET | none | public | No DB check | 200 `{ status:'ok', service:'hms-api', timestamp }` | 400 on unexpected query |
| Docs | Swagger | n/a | `/api/docs` | GET | none | public | Helmet CSP disabled on this path | 200 HTML | — |
| Docs | OpenAPI JSON | n/a | `/api/v1/openapi.json` | GET | none | public | Spec version in `openApi.ts` | 200 JSON | — |

**DEFERRED:** forgotten-password email, public registration, biometric auth, patient portal.

## User administration

| Module | Feature | Frontend | Backend | Method | Permission | Roles | Rules | Success | Error |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Users | List / search | `/users` | `/api/v1/users` | GET | `user.read` | administrator | page, search, status, roleCode | 200 paginated | 401/403 |
| Users | Create | `/users` dialog | `/api/v1/users` | POST | `user.create` | administrator | username + password + one catalog role; optional employee link | 201 | 409 duplicate username; 400 policy/role |
| Users | Update | `/users` dialog | `/api/v1/users/{id}` | PATCH | `user.update` | administrator | username and/or employeeId | 200 | 409 username or employee already linked |
| Users | Get | (dialog) | `/api/v1/users/{id}` | GET | `user.read` | administrator | — | 200 | 404 |
| Users | Change role | `/users` dialog | `/api/v1/users/{id}/role` | POST | `user.role.update` | administrator | No self-change; protect last active admin | 200 | 409 |
| Users | Deactivate | `/users` | `/api/v1/users/{id}/deactivate` | POST | `user.deactivate` | administrator | No self-deactivate; last admin protected; sessions revoked | 200 | 409 |
| Users | Reactivate | `/users` | `/api/v1/users/{id}/reactivate` | POST | `user.deactivate` | administrator | status `disabled` → `active` | 200 | 404 |
| Users | Password reset | `/users` dialog | `/api/v1/users/{id}/password-reset` | POST | `user.password.reset` | administrator | Admin supplies `newPassword`; **204 empty body**; not self; sessions revoked | 204 | 409 self; 400 policy |

**NOT IMPLEMENTED:** user email, user delete, forgotten-password.

## Organization

| Module | Feature | Frontend | Backend | Method | Permission | Roles | Rules | Success | Error |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Departments | List/search | `/departments` | `/api/v1/departments` | GET | `department.read` | admin, receptionist | — | 200 | 401/403 |
| Departments | Create | `/departments/new` | `/api/v1/departments` | POST | `department.create` | admin | unique code/name | 201 | 409 |
| Departments | Detail | `/departments/:id` | `/api/v1/departments/{id}` | GET | `department.read` | admin, receptionist | — | 200 | 404 |
| Departments | Update / deactivate | `/departments/:id/edit` | `/api/v1/departments/{id}` | PATCH | `department.update` | admin | status change | 200 | 400/409 |
| Employees | List/search/filter | `/employees` | `/api/v1/employees` | GET | `employee.read` | admin | — | 200 | 403 others |
| Employees | Register | `/employees/new` | `/api/v1/employees` | POST | `employee.create` | admin | number `E-<uuid>`; department; optional user link | 201 | 409 user already linked |
| Employees | Detail | `/employees/:id` | `/api/v1/employees/{id}` | GET | `employee.read` | admin | — | 200 | 404 |
| Employees | Update / status | `/employees/:id/edit` | `/api/v1/employees/{id}` | PATCH | `employee.update` | admin | active / inactive / terminated | 200 | 400 |
| Doctors | List | `/doctors` | `/api/v1/doctors` | GET | `doctor.read` | admin, receptionist, doctor | — | 200 | 403 |
| Doctors | Create | `/doctors/new` | `/api/v1/doctors` | POST | `doctor.create` | admin | existing employee; unique license | 201 | 409 license |
| Doctors | Detail | `/doctors/:id` | `/api/v1/doctors/{id}` | GET | `doctor.read` | as read | — | 200 | 404 |
| Doctors | Update / inactive | `/doctors/:id/edit` | `/api/v1/doctors/{id}` | PATCH | `doctor.update` | admin | — | 200 | 409 |
| Schedules | List/create/update | doctor detail panel | `/api/v1/doctors/{id}/schedules` GET/POST; `.../schedules/{sid}` PATCH | `doctor_schedule.*` | read: admin, receptionist, doctor; write: admin | statuses available / unavailable / cancelled; `endsAt > startsAt` | 200/201 | 400 |

**DEFERRED:** schedule recurrence, breaks, holidays, overlap policy, templates.

## Patients and documents

| Module | Feature | Frontend | Backend | Method | Permission | Roles | Rules | Success | Error |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Patients | List/search/filter/page | `/patients` | `/api/v1/patients` | GET | `patient.read` | admin, receptionist, doctor, nurse | search number/name/phone/email; status | 200 | 403 |
| Patients | Register | `/patients/new` | `/api/v1/patients` | POST | `patient.create` | admin, receptionist | number `P-<uuid>`; required first/last/DOB precision | 201 | 400 DOB/precision |
| Patients | Detail | `/patients/:id` | `/api/v1/patients/{id}` | GET | `patient.read` | as read | — | 200 | 404 |
| Patients | Edit / status | `/patients/:id/edit` | `/api/v1/patients/{id}` | PATCH | `patient.update` | admin, receptionist | status `active\|inactive\|deceased` | 200 | 400 |
| Documents | List | patient detail panel | `/api/v1/patients/{id}/documents` | GET | `patient_document.read` | admin, receptionist, doctor, nurse | excludes soft-deleted | 200 | 403/404 |
| Documents | Upload | panel dialog | same | POST multipart | `patient_document.create` | same | ≤10 MB; magic PDF/JPEG/PNG; categories listed below | 201 | 400 type/size |
| Documents | Get | panel | `.../documents/{docId}` | GET | read | same | metadata; no objectKey/checksum | 200 | 404 deleted |
| Documents | Update metadata | panel dialog | PATCH | `patient_document.update` | same | file bytes immutable | 200 | 400 |
| Documents | Soft delete | panel | DELETE | `patient_document.delete` | same | object retained | 200 | 404 |
| Documents | Signed access | Open | `.../documents/{docId}/access` | POST | read | same | TTL 30–900s default 300 | 200 `{ url, expiresAt }` | 404/503 |

Document categories: `medical_report`, `laboratory_report`, `prescription`, `referral`, `other`.  
**DEFERRED:** malware scan, quarantine, retention jobs.  
**Local limitation:** memory driver signed URLs are `https://storage.test.invalid/...` and will not download a real file.

## Appointments and calendar

| Module | Feature | Frontend | Backend | Method | Permission | Roles | Rules | Success | Error |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Appointments | List | `/appointments` | `/api/v1/appointments` | GET | `appointment.read` | admin, receptionist | filters include `startsAtFrom`/`startsAtTo` | 200 | 403 |
| Appointments | Book | `/appointments/new` | POST | `appointment.create` | admin, receptionist | active doctor+employee; interval inside `available` schedule; no overlap; approved leave blocks | 201 | 409 conflict/leave |
| Appointments | Detail | `/appointments/:id` | GET | read | same | `overlapsApprovedLeave` flag | 200 | 404 |
| Appointments | Edit reason | `/appointments/:id/edit` | PATCH | `appointment.update` | same | **reason only** | 200 | 400 |
| Appointments | Cancel | detail dialog | POST `.../cancel` | `appointment.cancel` | same | only `scheduled`/`checked_in`; reason required | 200 | 409 |
| Appointments | Reschedule | detail | POST `.../reschedule` | `appointment.reschedule` | same | only scheduled/checked_in; original cancelled reason `Rescheduled`; successor linked | 200 | 409 |
| Appointments | Status | detail | PATCH `.../status` | `appointment.status.update` | same | scheduled→checked_in\|no_show; checked_in→completed | 200 | 409 invalid transition |
| Calendar | Day/week/month | `/appointments/calendar` | same GET list | `appointment.read` | admin, receptionist | no drag/drop; slot click → new booking; leave highlight | UI | 403 others |

Statuses: `scheduled`, `checked_in`, `completed`, `cancelled`, `no_show`.  
**DEFERRED:** doctor/nurse owned-appointment scope, drag/drop, recurrence, holidays.

## Clinical

| Module | Feature | Frontend | Backend | Method | Permission | Roles | Rules | Success | Error |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Medical records | List | `/medical-records` | `/api/v1/medical-records` | GET | `medical_record.read` | admin, doctor, nurse | list omits clinical bodies | 200 | 403 |
| Medical records | Create draft | `/medical-records/new` | POST | `medical_record.create` | **doctor only** | author from linked employee, not client; at most one of appointment/admission | 201 | 409 unlinked / mismatch |
| Medical records | Detail | `/medical-records/:id` | GET | read | admin, doctor, nurse | — | 200 | 404 |
| Medical records | Edit draft | `.../edit` | PATCH | `medical_record.update` | doctor | draft only | 200 | 409 if final |
| Medical records | Finalize | detail | POST `.../finalize` | `medical_record.finalize` | doctor | final immutable | 200 | 409 |
| Medical records | Amend | `.../amend` | POST `.../amend` | `medical_record.amend` | doctor | successor linked; predecessor remains | 201/200 | 409 |
| Prescriptions | List/detail | `/prescriptions`, `/prescriptions/:id` | GET list/id | `prescription.read` | admin, doctor, nurse, pharmacist | — | 200 | 403 |
| Prescriptions | Create | `/medical-records/:id/prescriptions/new` | POST `/api/v1/prescriptions` | `prescription.create` | doctor | finalized record; active medicine; doctor identity server-side | 201 | 409 draft/inactive medicine |
| Prescriptions | Cancel | detail dialog | POST `.../cancel` | `prescription.cancel` | doctor | reason; not after full dispense per service rules | 200 | 409 |
| Prescriptions | Dispense | detail | POST `.../items/{itemId}/dispense` | `prescription.dispense` | pharmacist | remaining qty; no expired batch; no over-dispense; actor = linked employee | 200/201 | 409 |
| Prescriptions | Reverse | detail dialog | POST `.../dispenses/{id}/reverse` | `prescription.reverse` | admin, pharmacist | full reverse only; second reverse rejected | 200 | 409 |
| Medicines | List / manage catalogue | `/medicines` | `GET/POST /api/v1/medicines`, `GET/PATCH /api/v1/medicines/{id}`, deactivate/reactivate | `medicine.read` / create / update / deactivate / reactivate | admin write; doctor and pharmacist read | New prescription/receive use `status=active`; inactive not selectable | 200/201 | 403 other roles |
| Lab tests | Catalog read | lab create | `GET /api/v1/lab/tests` | `lab_test.read` | **doctor only** | no write API | 200 | 403 |
| Lab requests | List/detail | `/laboratory`, `/laboratory/:id` | GET | `lab_request.read` | admin, doctor, nurse, lab | — | 200 | 403 |
| Lab requests | Create | `/laboratory/new` | POST | `lab_request.create` | doctor | requesting doctor from identity; optional same-patient medical record | 201 | 409 unlinked |
| Lab sample | Collect | detail | POST `.../items/{id}/sample` | `lab_sample.collect` | laboratory_staff | collector = linked employee | 200 | 409 |
| Lab result | Enter | detail | POST `.../items/{id}/results` | `lab_result.enter` | laboratory_staff | after sample; resultValue required | 200 | 409 |
| Lab report | Print | `/laboratory/:id/report` | assembled in UI | `lab_request.read` | readers | browser print; not stored PDF | print | — |

Lab request aggregate: `requested` / `sample_collected` / `in_progress` / `completed`. Item cancel and catalog write are **DEFERRED**.

## Pharmacy

| Module | Feature | Frontend | Backend | Method | Permission | Roles | Rules | Success | Error |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Inventory | List | `/pharmacy/inventory` | `GET /api/v1/pharmacy/inventory` | `inventory.read` | admin, pharmacist | derived stock | 200 | 403 |
| Receive | Receive batch | `/pharmacy/inventory/receive` | `POST /api/v1/pharmacy/receipts` | `stock.receive` | **pharmacist only** | unique (medicine, batch); inactive medicine rejected | 201 | 409 |
| Adjust | +/- qty | `/pharmacy/inventory/adjust` | `POST /api/v1/pharmacy/adjustments` | `stock.adjust` | admin, pharmacist | reason required; cannot go below zero | 201 | 409 |
| Movements | List | `/pharmacy/movements` | `GET /api/v1/pharmacy/movements` | `stock.movement.read` | admin, pharmacist | append-only | 200 | 403 |

**DEFERRED:** expiry jobs, notifications. Catalogue write is D-036.

## Billing

| Module | Feature | Frontend | Backend | Method | Permission | Roles | Rules | Success | Error |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Billing lookup | Patients | invoice create | `GET /api/v1/billing/patients` | `invoice.read` | accountant, admin | billing-safe; not `patient.read` | 200 | 403 |
| Billing lookup | Consultations / lab / dispenses | create form | `GET /api/v1/billing/patients/{id}/consultations` etc. | `invoice.read` | same | completed appt; completed lab with price; unreversed dispenses | 200 | — |
| Invoices | List | `/billing` | `GET /api/v1/invoices` | `invoice.read` | accountant, admin | — | 200 | 403 |
| Invoices | Create draft | `/billing/new` | POST | `invoice.create` | **accountant** | no admission lines; no duplicate charge | 201 | 409 |
| Invoices | Detail | `/billing/:id` | GET | read | accountant, admin | — | 200 | 404 |
| Invoices | Edit draft | detail | PATCH | `invoice.update` | accountant | draft only | 200 | 409 issued |
| Invoices | Issue | detail | POST `.../issue` | `invoice.issue` | accountant | issued immutable | 200 | 409 |
| Invoices | Void | dialog | POST `.../void` | `invoice.void` | accountant, admin | policy | 200 | 409 |
| Payments | Create | detail | POST `.../payments` | `payment.create` | accountant | cash\|card\|bank_transfer; no overpay | 201 | 409 |
| Payments | List | detail | GET `.../payments` | `payment.read` | accountant, admin | — | 200 | — |
| Payments | Reverse | dialog | POST `/api/v1/payments/{id}/reverse` | `payment.reverse` | accountant, admin | reason; recalculate invoice | 200 | 409 second reverse |
| Receipt | Print | `/billing/:invoiceId/payments/:paymentId` | payment read DTO | `payment.read` | accountant, admin | browser print | print | — |

Statuses: `draft` → `issued` → `partially_paid` → `paid`. Tax/discount are stored as zero.  
**DEFERRED:** admission charges, tax/discount UI, stored PDF, gateways, insurance.

## Admissions

| Module | Feature | Frontend | Backend | Method | Permission | Roles | Rules | Success | Error |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Admissions | List | `/admissions` | GET `/api/v1/admissions` | `admission.read` | receptionist, nurse | no ownership filter | 200 | 403 admin |
| Admissions | Create | `/admissions/new` | POST | `admission.create` | **receptionist** | one active per patient; reject deceased; number `ADM-<uuid>` | 201 | 409 |
| Admissions | Detail | `/admissions/:id` | GET | read | receptionist, nurse | UI has no discharge/cancel actions | 200 | 404 |
| Admissions | Update | **no UI** | PATCH `/api/v1/admissions/{id}` | `admission.update` | **none** | IMPLEMENTED / UNGRANTED | 403 | 403 |
| Admissions | Discharge | **no UI** | POST `.../discharge` | `admission.discharge` | **none** | IMPLEMENTED / UNGRANTED | 403 | 403 |
| Admissions | Cancel | **no UI** | POST `.../cancel` | `admission.cancel` | **none** | IMPLEMENTED / UNGRANTED | 403 | 403 |

**DEFERRED:** wards, beds, transfers, admission billing, granting discharge/cancel to a role.

## Operations (M16)

| Module | Feature | Frontend | Backend | Method | Permission | Roles | Rules | Success | Error |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Attendance | List | `/attendance` | GET `/api/v1/attendance` | `attendance.read` | admin, receptionist | historical inactive employees remain | 200 | 403 |
| Attendance | Create | dialog | POST | `attendance.create` | same | one row per employee/day; status present\|absent\|leave | 201 | 409 duplicate |
| Attendance | Update | dialog | PATCH | `attendance.update` | same | checkout requires check-in and later time | 200 | 400 |
| Leave | List | `/leave` | GET `/api/v1/leave` | `leave.read` | all roles | admin (approve) sees all; others see own employee | 200 | 403 |
| Leave | Create | dialog | POST | `leave.create` | all except unlinked | type ≤50; max 366 days; pending+approved overlap rejected | 201 | 409 overlap; 400 no employee |
| Leave | Edit pending | dialog | PATCH | `leave.update` | owner (scoped) | pending only | 200 | 409 |
| Leave | Approve/reject | buttons | POST `.../approve` `.../reject` | `leave.approve` | administrator | pending only | 200 | 409 |
| Leave | Cancel | button | POST `.../cancel` | `leave.cancel` | **owner only** | pending only; admin cancel of others → 403 | 200 / 403 | 403/409 |
| Audit | List | `/audit` | GET `/api/v1/audit` | `audit.read` | administrator | required date range ≤366 days; sanitized fields | 200 | 400/403 |
| Audit | Export CSV/PDF | buttons | GET `/api/v1/audit/export` | `audit.read` | administrator | ≤5000 rows; export audited | file | 400 `AUDIT_EXPORT_TOO_LARGE` |

**DEFERRED:** leave balances/accrual/payroll/notifications, biometrics, forgotten password, audit retention job, attendance/leave reports.

## Reports and dashboard

| Module | Feature | Frontend | Backend | Method | Permission | Roles | Rules | Success | Error |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dashboard | Metrics | `/` | `GET /api/v1/dashboard` | none on route; filtered by report perms | see matrix | unauthorized metrics **omitted**, not zeroed | 200 | 401 |
| Reports home | Cards | `/reports` | n/a | any `report.*` | admin, accountant, lab, pharmacist | — | UI | 403 others |
| Patient report | `/reports/patients` | GET `/api/v1/reports/patients` | `report.patient.read` | admin | range ≤366 | 200 | 400/403 |
| Appointment report | `/reports/appointments` | GET `.../appointments` | `report.appointment.read` | admin | — | 200 | 400/403 |
| Revenue report | `/reports/revenue` | GET `.../revenue` | `report.revenue.read` | admin, accountant | recorded payments, non-void | 200 | 400/403 |
| Pharmacy report | `/reports/pharmacy` | GET `.../pharmacy` | `report.pharmacy.read` | admin, pharmacist | low stock / near expiry | 200 | 400/403 |
| Laboratory report | `/reports/laboratory` | GET `.../laboratory` | `report.laboratory.read` | admin, lab | — | 200 | 400/403 |
| Staff report | `/reports/staff` | GET `.../staff` | `report.staff.read` | admin | — | 200 | 400/403 |

**DEFERRED:** CSV/PDF for analytics reports, attendance/leave reports, advanced analytics.

## Approved deferred / not implemented (do not fail)

| Item | Status |
| --- | --- |
| Mobile app, patient portal, SMS/email, telemedicine, insurance, AI, biometrics | DEFERRED (requirements) |
| Wards, beds, transfers | DEFERRED D-009 |
| Admission charges | DEFERRED D-025 |
| Tax/discount, stored PDF receipts, payment gateways | DEFERRED |
| Lab catalog write, cancel, PATCH, finalize, correct | DEFERRED D-023 |
| Medicine catalog write | IMPLEMENTED D-036 |
| Doctor/Nurse appointment ownership | DEFERRED D-021 |
| Calendar drag/drop, recurrence, holidays | DEFERRED D-033 |
| Leave balances, payroll, multi-level approval | DEFERRED D-029 |
| Forgotten-password email, user delete, public registration | DEFERRED D-031 |
| Malware scanning / quarantine / retention | DEFERRED D-030 |
| Audit retention job | DEFERRED D-032 |
| Cloud deploy, backups as implemented product, HA/DR | REQUIREMENTS ONLY / D-034 and D-035 PENDING |
| Granting `admission.update/discharge/cancel` to any role | DEFERRED D-026 |
| Health check of database/storage | NOT IMPLEMENTED (liveness only) |
| User email field | NOT IMPLEMENTED |

---

# Expected role → navigation matrix

Nav is permission-based grouped sidebar (`AppShell.tsx`). Change password is in the account menu, not the module list. Fill PASS/FAIL in results after testing each role.

| Nav item | Path | Admin | Doctor | Nurse | Receptionist | Lab | Pharmacist | Accountant |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dashboard | `/` | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Patients | `/patients` | Yes | Yes | Yes | Yes | No | No | No |
| Departments | `/departments` | Yes | No | No | Yes | No | No | No |
| Employees | `/employees` | Yes | No | No | No | No | No | No |
| Doctors | `/doctors` | Yes | Yes | No | Yes | No | No | No |
| Appointments | `/appointments` | Yes | No | No | Yes | No | No | No |
| Calendar | `/appointments/calendar` | Yes | No | No | Yes | No | No | No |
| Attendance | `/attendance` | Yes | No | No | Yes | No | No | No |
| Leave | `/leave` | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Admissions | `/admissions` | **No** | No | Yes | Yes | No | No | No |
| Medical records | `/medical-records` | Yes | Yes | Yes | No | No | No | No |
| Prescriptions | `/prescriptions` | Yes | Yes | Yes | No | No | Yes | No |
| Laboratory | `/laboratory` | Yes | Yes | Yes | No | Yes | No | No |
| Inventory | `/pharmacy/inventory` | Yes | No | No | No | No | Yes | No |
| Stock movements | `/pharmacy/movements` | Yes | No | No | No | No | Yes | No |
| Billing | `/billing` | Yes | No | No | No | No | No | Yes |
| Users | `/users` | Yes | No | No | No | No | No | No |
| Audit | `/audit` | Yes | No | No | No | No | No | No |
| Change password | `/change-password` | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Reports | `/reports` | Yes | No | No | No | Yes | Yes | Yes |

Direct URL to a guarded page without permission must show **“You are not authorized…”** inside the shell (no silent data). Matching API must return **403**.

### Expected dashboard cards

| Card | Admin | Doctor | Nurse | Receptionist | Lab | Pharmacist | Accountant |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Total patients | Yes | No | No | No | No | No | No |
| Today's appointments | Yes | No | No | No | No | No | No |
| Revenue | Yes | No | No | No | No | No | Yes |
| Laboratory requests | Yes | No | No | No | Yes | No | No |
| Pharmacy alerts | Yes | No | No | No | No | Yes | No |

Doctor / Nurse / Receptionist must see **no** M14 metric cards.

---

# Test accounts to create first

There is **no committed default password**. Bootstrap only creates the first administrator.

Recommended usernames (create in Phase 3 after bootstrap). Use a password that satisfies policy, for example `QaManualTest42x`. Record the real password only in your private notes, never in git.

| Username | Role | Employee required? | Purpose |
| --- | --- | --- | --- |
| `admin` | administrator | optional | Bootstrap; user admin; most read surfaces |
| `qa.admin2` | administrator | optional | Last-admin and self-demotion controls |
| `qa.reception` | receptionist | **yes** | Patients, appointments, admissions, attendance, own leave |
| `qa.doctor` | doctor | **yes** + doctor profile | Records, prescriptions, lab requests, documents, own leave |
| `qa.nurse` | nurse | **yes** | Read clinical + admissions + documents + own leave |
| `qa.lab` | laboratory_staff | **yes** | Sample, results, lab report, lab dashboard |
| `qa.pharm` | pharmacist | **yes** | Receive, dispense, reverse, pharmacy report |
| `qa.account` | accountant | **yes** (for leave only) | Invoices, payments, revenue |
| `qa.unlinked` | nurse or doctor | **no** | Prove leave/clinical writes fail without employee |
| `qa.disabled` | receptionist | no | Disabled-account login |
| `qa.lockout` | receptionist | no | Failed-login lock |

Password policy to use when creating accounts:

- 12–128 characters
- at least one letter and one number
- at least 4 distinct characters
- reject `password1234`, `qwerty123456`, `administrator1`, `letmein123456`

### Catalog prerequisite (inspect only)

Prescriptions, laboratory, and pharmacy **cannot** be tested if `medicines` and `lab_test_definitions` are empty. There is no application write API.

Before Phase 13:

```sql
SELECT code, generic_name, status FROM medicines ORDER BY code;
SELECT code, name, status, price, currency FROM lab_test_definitions ORDER BY code;
```

If empty, Phase 13–16, 20 (pharmacy/lab reports), and 23 are **BLOCKED** until the owner supplies local catalog rows. Do not invent a catalog-admin feature. Do not apply this as a schema/migration change.

---

# PHASE 0 — Environment verification

Execute before any feature testing.

| ID | Check | How | Expected |
| --- | --- | --- | --- |
| P0-01 | PostgreSQL running | Connect to local server | Accepts connections on the host/port in `DATABASE_URL` |
| P0-02 | Database name | Inspect connection | Dedicated `hms_development` (or your documented local name). Not production Supabase |
| P0-03 | Backend starts | `npm run dev -w backend` or combined `npm run dev` | Listens on port **5000**; no uncaught exception |
| P0-04 | Frontend starts | Vite | **5173**; compiles without blocking error |
| P0-05 | Prisma connects | Trigger any authenticated API after login, or observe backend logs | No `P1001` / authentication errors |
| P0-06 | Health | Browser or curl `GET http://localhost:5000/api/v1/health` | `200` `{ "status":"ok","service":"hms-api","timestamp":... }` |
| P0-07 | Health is not a DB check | Stop PostgreSQL briefly **only if you can restart it**, or skip if unsafe | Health may still return 200. Record observation. Do not leave DB down |
| P0-08 | Swagger UI | `http://localhost:5000/api/docs` | UI loads; lists `/api/v1/*` |
| P0-09 | OpenAPI JSON | `http://localhost:5000/api/v1/openapi.json` | JSON; paths match mounted routers in `app.ts` |
| P0-10 | CORS allowlist | From browser on 5173, login works | Disallowed origin would be 403 `ORIGIN_NOT_ALLOWED` (optional extra: curl with `Origin: http://evil.example`) |
| P0-11 | Backend console | Watch startup | No stack traces; request IDs appear after first call |
| P0-12 | Browser console on `/login` | DevTools → Console | No React crash |
| P0-13 | Frontend health panel | Sign in later; Home “Check API” | Uses `VITE_API_URL`, not a hardcoded host |
| P0-14 | Document driver awareness | Read existing `DOCUMENT_STORAGE_DRIVER` **without editing** | Note `memory` vs `supabase`. If `memory`, mark P8 download-byte tests BLOCKED for real file open |
| P0-15 | Bootstrap admin exists | Try `/login` with the bootstrap username | If missing, owner must run `bootstrap:admin` (you do not seed production data) |

---

# PHASE 1 — Authentication

Use `qa.lockout` and `qa.disabled` after they exist (create `qa.disabled` / `qa.lockout` in Phase 3, then return to P1-07–P1-11 if needed). Until then, use a disposable account created first.

### Login

| ID | Case | Steps | Expected |
| --- | --- | --- | --- |
| P1-01 | Valid credentials | `/login` with bootstrap admin | Redirect `/`; username in AppBar |
| P1-02 | Invalid username | Unknown username + any password | Controlled error; **same** failure class as bad password (`INVALID_CREDENTIALS`). No “user not found” |
| P1-03 | Invalid password | Valid username + wrong password | Same generic failure |
| P1-04 | Empty username | Submit empty username | Client and/or 400; no 500 |
| P1-05 | Empty password | Submit empty password | Client and/or 400 |
| P1-06 | Malformed body (API) | Swagger POST login `{ "username": 1 }` without CSRF | 400 or 403 CSRF — not a stack trace |
| P1-07 | Disabled account | Login as `qa.disabled` | Failure; audit may show `account_status`. No access token |
| P1-08 | Repeated failures | 5 wrong passwords on `qa.lockout` | After 5th, still generic credentials error; account locked 15 min |
| P1-09 | Locked account | Immediately try correct password | Still rejected |
| P1-10 | After lock period | Wait 15 minutes or inspect `locked_until` (do not update it) | Correct password succeeds |
| P1-11 | Login rate limit | 21 login POSTs in 15 min from one client | Eventually 429 `AUTH_RATE_LIMITED` |

### Session

| ID | Case | Steps | Expected |
| --- | --- | --- | --- |
| P1-12 | Access token issued | Network tab on login | JSON has `accessToken`; **not** in Set-Cookie |
| P1-13 | Refresh cookie | Application → Cookies for `localhost:5000` | `hms_refresh` HttpOnly; Path `/api/v1/auth`; Secure **unchecked** locally; SameSite Lax |
| P1-14 | Page refresh | F5 on `/` | Session restored via `POST /auth/refresh` then `GET /auth/me` |
| P1-15 | Another page | Navigate Patients → Home | Still authenticated; no re-login |
| P1-16 | Expired access token | Wait 15+ minutes idle **under 30 minutes** or wait for 401 then retry | Client refreshes; user stays signed in |
| P1-17 | Logout | Sign out | 204; cookie cleared; `/login` |
| P1-18 | Access after logout | Open `/patients` | Redirect login |
| P1-19 | Refresh after logout | POST `/api/v1/auth/refresh` with CSRF | 401 `INVALID_REFRESH_SESSION` |
| P1-20 | Idle refresh timeout | Idle **> 30 minutes** | Must sign in again |

### Password

| ID | Case | Steps | Expected |
| --- | --- | --- | --- |
| P1-21 | Wrong current password | `/change-password` | 400 `CURRENT_PASSWORD_INVALID` |
| P1-22 | Weak new password | `short`, `password1234`, `aaaaaaa1aaaa` | Policy rejection |
| P1-23 | Successful change | Valid current + policy-compliant new | 204; signed out / token cleared |
| P1-24 | Old password rejected | Login with old password | Fail |
| P1-25 | New password works | Login with new | Success |
| P1-26 | Other sessions | If a second browser was logged in, it must fail refresh after change | `INVALID_REFRESH_SESSION` |

### Security inspection (DevTools)

| ID | Case | Expected |
| --- | --- | --- |
| P1-27 | `localStorage` | No access token, refresh token, or password |
| P1-28 | `sessionStorage` | Same |
| P1-29 | Document cookies on 5173 | No readable JWT |
| P1-30 | Authorization header | `Authorization: Bearer <jwt>` on API calls after login |
| P1-31 | CSRF header | Login/refresh/logout include `X-HMS-CSRF: 1` |
| P1-32 | Network response | Password never returned; reset later is 204 empty |

---

# PHASE 2 — Role-based access control

For **each** role account, complete the following. Use UI first, then repeat the sensitive actions in Swagger/DevTools with that user’s access token.

### Per-role script

1. Sign in.
2. Photograph or list visible nav items (P2-xx-NAV).
3. Open every **allowed** nav item (P2-xx-OK).
4. Paste every **denied** path from the matrix into the address bar (P2-xx-URL).
5. Call one denied API (P2-xx-API), for example:
   - Doctor: `GET /api/v1/appointments` → 403
   - Receptionist: `GET /api/v1/users` → 403
   - Accountant: `GET /api/v1/patients` → 403
   - Admin: `GET /api/v1/admissions` → 403
   - Lab: `GET /api/v1/invoices` → 403
6. Confirm create/update/delete buttons match permissions (`Can` gates).
7. Confirm dashboard cards (Phase 21 overlap; record here too).

| ID prefix | Role |
| --- | --- |
| P2-ADM | administrator |
| P2-DOC | doctor |
| P2-NUR | nurse |
| P2-REC | receptionist |
| P2-LAB | laboratory_staff |
| P2-PHA | pharmacist |
| P2-ACC | accountant |

Copy this matrix into results and mark each cell `PASS` / `FAIL` / `N/A` **after** testing.

| Feature | Admin | Doctor | Nurse | Receptionist | Lab | Pharmacist | Accountant |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Nav matches table above | | | | | | | |
| Direct URL denied pages | | | | | | | |
| API denied 403 | | | | | | | |
| Patient create/update | Yes | No | No | Yes | No | No | No |
| Appointment write | Yes | No | No | Yes | No | No | No |
| Medical record write | No | Yes | No | No | No | No | No |
| Prescription create/cancel | No | Yes | No | No | No | No | No |
| Dispense | No | No | No | No | No | Yes | No |
| Stock receive | No | No | No | No | No | Yes | No |
| Invoice create/issue/pay | No | No | No | No | No | No | Yes |
| Invoice void / payment reverse | Yes | No | No | No | No | No | Yes |
| User admin | Yes | No | No | No | No | No | No |
| Audit | Yes | No | No | No | No | No | No |
| Admission create | No | No | No | Yes | No | No | No |
| Admission read | No | No | Yes | Yes | No | No | No |
| Patient documents | Yes | Yes | Yes | Yes | No | No | No |
| Leave create (if linked) | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Leave approve | Yes | No | No | No | No | No | No |
| Dashboard cards | all 5 | none | none | none | lab only | pharmacy only | revenue only |

Sensitive-data checks:

| ID | Case | Expected |
| --- | --- | --- |
| P2-SENS-01 | Accountant billing patient lookup | Minimal billing fields; not full clinical record |
| P2-SENS-02 | Accountant `GET /api/v1/reports/patients` | 403 |
| P2-SENS-03 | Lab staff `GET /api/v1/patients` | 403 |
| P2-SENS-04 | Pharmacist `GET /api/v1/patients` | 403 |
| P2-SENS-05 | Admin medical-record list | Readable; **no** create button |
| P2-SENS-06 | Change UUID in a patient URL as lab/pharmacist/accountant | Unauthorized UI + 403 API |

---

# PHASE 3 — User administration

Role: **Administrator** on `/users`. Also repeat denied calls as Receptionist.

| ID | Case | Expected |
| --- | --- | --- |
| P3-01 | List users | Paginated table; search username; filter status/role |
| P3-02 | Empty/loading/error | Loading indicator; empty state if none (unlikely); no crash |
| P3-03 | Create user | 201; appears in list with exactly one role |
| P3-04 | Duplicate username | 409; no second row |
| P3-05 | Duplicate email | **N/A — users have no email field** |
| P3-06 | Optional employee link | Link unused employee; user shows employee |
| P3-07 | Unlinked user | Create without employee; allowed |
| P3-08 | Employee already linked | Second user on same employee → 409 |
| P3-09 | Assign each catalog role | All seven codes accepted; invalid code 400 |
| P3-10 | Change role | Role updates; only one role remains |
| P3-11 | Self role change | 409 `You cannot change your own role.` |
| P3-12 | Demote last active admin | With only one active admin, demote → 409 |
| P3-13 | Deactivate other user | Status `disabled`; that user cannot login |
| P3-14 | Self deactivate | 409 |
| P3-15 | Deactivate last admin | 409 |
| P3-16 | Reactivate | Can login again |
| P3-17 | Password reset | Admin types new password; **HTTP 204 empty**; UI must not display the password afterwards as a generated secret |
| P3-18 | Reset invalidates sessions | Target browser refresh fails; old password fails; new works |
| P3-19 | Reset self | 409 directing to change-password |
| P3-20 | Weak reset password | 400 policy |
| P3-21 | Non-admin UI | `/users` unauthorized |
| P3-22 | Non-admin API | `GET/POST /api/v1/users` → 403 |

---

# PHASE 4 — Departments

Role: Administrator for writes; Receptionist for read; Doctor for deny.

| ID | Case | Expected |
| --- | --- | --- |
| P4-01 | List | `/departments` table, pagination |
| P4-02 | Search | Narrows results |
| P4-03 | Create | `/departments/new` code, name, description → detail |
| P4-04 | Duplicate code or name | 409 |
| P4-05 | Update | Edit name/description |
| P4-06 | Deactivate | Status inactive; still readable |
| P4-07 | Invalid input | Empty code/name; overlong; whitespace-only |
| P4-08 | Receptionist read | List/detail OK; no create/edit or 403 on POST/PATCH |
| P4-09 | Doctor `/departments` | Unauthorized |

---

# PHASE 5 — Employees / staff

Role: Administrator only.

| ID | Case | Expected |
| --- | --- | --- |
| P5-01 | List | `/employees` search/filters/pagination |
| P5-02 | Register | Required names, job title, department, hire date |
| P5-03 | Employee number | Server `E-<uuid>`; not on the create form as a writable business number |
| P5-04 | Department assignment | Selected department stored |
| P5-05 | User linking | Link existing unlinked user |
| P5-06 | Status active | Default usable for doctor/leave/clinical identity |
| P5-07 | Status inactive | Historical attendance still listable later (P18-11) |
| P5-08 | Status terminated | Same; cannot be used as active clinical actor |
| P5-09 | Update | PATCH fields persist |
| P5-10 | Invalid input | Missing names; bad dates; end before hire if enforced |
| P5-11 | Unauthorized | Receptionist `/employees` unauthorized; API 403 |
| P5-12 | Inactive employee history | After later attendance/appointments, records still reference the employee |

---

# PHASE 6 — Doctors and schedules

| ID | Case | Role | Expected |
| --- | --- | --- | --- |
| P6-01 | List doctors | admin/reception/doctor | Table |
| P6-02 | Create doctor | admin | Existing employee; license; specialization |
| P6-03 | Duplicate license | admin | 409 |
| P6-04 | Update doctor | admin | Fields/status |
| P6-05 | Inactive doctor | admin + reception | Cannot book new appointment (Phase 9) |
| P6-06 | Employee relationship | admin | Doctor stays tied to employee |
| P6-07 | Create available schedule | admin | Interval on doctor detail; `endsAt > startsAt` |
| P6-08 | Update schedule | admin | Change times/status/note |
| P6-09 | Unavailable interval | admin | Booking that only fits this interval fails |
| P6-10 | Cancelled schedule | admin | Not bookable |
| P6-11 | Invalid start/end | admin | End ≤ start rejected |
| P6-12 | Receptionist/doctor read schedules | those roles | Visible; no create if no permission |
| P6-13 | Recurrence UI | any | **N/A DEFERRED** — panel states it is not implemented |
| P6-14 | Nurse `/doctors` | nurse | Unauthorized |

Create at least one **weekday daytime available** interval you will reuse for booking (for example tomorrow 09:00–12:00 Asia/Colombo).

---

# PHASE 7 — Patient management

Roles: Receptionist (write), Doctor (read), Accountant (deny).

| ID | Case | Expected |
| --- | --- | --- |
| P7-01 | Register valid patient | firstName, lastName, DOB precision `exact` + date → `P-<uuid>` |
| P7-02 | Patient number not client-controlled | DevTools payload has no accepted `patientNumber` (strict schema) |
| P7-03 | Required fields | Missing first/last → 400 / UI validation |
| P7-04 | Future DOB | Rejected |
| P7-05 | Precision mismatch | `unknown` with a date, or `year` not `YYYY-01-01` → 400 |
| P7-06 | Invalid email / phone | Email format 400; overlong rejected |
| P7-07 | Search | Number, name, phone, email |
| P7-08 | Status filter | active / inactive / deceased |
| P7-09 | Pagination | pageSize 20 default; next page |
| P7-10 | Detail | `/patients/:id` demographics |
| P7-11 | Edit | Persist contact fields |
| P7-12 | Status inactive | Still searchable when filtered |
| P7-13 | Status deceased | Blocks new admission (Phase 17) |
| P7-14 | Doctor read-only | Can open detail; no Register/Edit or 403 PATCH |
| P7-15 | Lab/Pharmacist/Accountant `/patients` | Unauthorized + API 403 |
| P7-16 | No delete control | No delete button; `DELETE /api/v1/patients/{id}` → 404 route |

---

# PHASE 8 — Patient documents

Roles: Receptionist or Doctor on a known patient. Also Lab (deny).

Prepare tiny files: valid PDF, JPEG (`.jpg` and `.jpeg`), PNG; a `.txt` or `.docx`; a PDF renamed from `.exe` if you can; a file just over 10 MB.

| ID | Case | Expected |
| --- | --- | --- |
| P8-01 | Panel visible | Patient detail shows documents when `patient_document.read` |
| P8-02 | Upload PDF | 201; row appears |
| P8-03 | Upload JPEG | 201 |
| P8-04 | Upload JPG | 201 (same `image/jpeg` magic) |
| P8-05 | Upload PNG | 201 |
| P8-06 | Unsupported type | `.txt` / `.docx` rejected (UI and API) |
| P8-07 | Over 10 MB | Rejected |
| P8-08 | Empty file | Rejected |
| P8-09 | Title / category / description | Stored; categories only the five enums |
| P8-10 | Update metadata | Title/category/description change |
| P8-11 | File immutable | Re-open/download still original type/size; no replace-file control |
| P8-12 | Access POST | 200 `{ url, expiresAt }` about 300s |
| P8-13 | Open URL | If driver is `memory`: URL host `storage.test.invalid` — record **BLOCKED** for real bytes. If Supabase: file opens and is private (not a public bucket listing) |
| P8-14 | Soft delete | Row disappears from list |
| P8-15 | Get deleted | GET/access → 404 |
| P8-16 | Duplicate file | Second upload of same bytes **allowed** (implementation allows duplicates) |
| P8-17 | Fake extension | PNG bytes named `.pdf` → detected as PNG or rejected; must not trust filename only |
| P8-18 | Lab/Pharmacist/Accountant | No panel; API 403 |
| P8-19 | Wrong patient id | `GET /api/v1/patients/{other}/documents/{thisDoc}` → 404 |
| P8-20 | DTO leakage | Response has no `objectKey`, checksum, or storage key |
| P8-21 | Malware scan | **N/A DEFERRED** — UI notes scanning is not implemented |

---

# PHASE 9 — Appointments

Role: Receptionist (or Admin). Doctor must be active with an **available** schedule and **no** approved leave.

| ID | Case | Expected |
| --- | --- | --- |
| P9-01 | Book valid | Patient + doctor + start/end inside available schedule | 201 `scheduled` |
| P9-02 | Doctor select | Only usable doctors |
| P9-03 | Patient select | Required |
| P9-04 | End after start | Valid interval |
| P9-05 | End ≤ start | 400 |
| P9-06 | Outside schedule | 409/400 not fitting available interval |
| P9-07 | Inactive doctor | Rejected |
| P9-08 | Doctor conflict | Overlapping scheduled/checked_in → 409 doctor message |
| P9-09 | Patient conflict | Overlapping → 409 patient message |
| P9-10 | Adjacent appointments | End of A equals start of B → **allowed** (half-open) |
| P9-11 | Cancel | Reason required; status `cancelled` |
| P9-12 | Edit reason | `/edit` changes reason only; times disabled |
| P9-13 | Reschedule | New interval; old `cancelled` reason `Rescheduled`; `rescheduledFrom` set |
| P9-14 | Status scheduled → checked_in | Success |
| P9-15 | Status scheduled → no_show | Success |
| P9-16 | Status checked_in → completed | Success |
| P9-17 | Invalid transition | completed → cancelled or scheduled → completed → 409 |
| P9-18 | Cancel completed | 409 |
| P9-19 | Doctor UI | `/appointments` unauthorized |
| P9-20 | Concurrent booking | Two browsers book same doctor/slot | one 201, one 409 |
| P9-21 | PATCH other fields | Extra JSON fields → 400 strict schema |

---

# PHASE 10 — Appointment calendar

Role: Receptionist. URL `/appointments/calendar`.

| ID | Case | Expected |
| --- | --- | --- |
| P10-01 | Day view | Grid ~07:00–19:00; appointments at correct start/end |
| P10-02 | Week view | Seven days; durations visible |
| P10-03 | Month view | Month cells; click drills to day |
| P10-04 | Doctor filter | Only that doctor’s appointments |
| P10-05 | Variable durations | 15 min vs 60 min occupy different heights/spans |
| P10-06 | Click appointment | Opens detail |
| P10-07 | Click empty slot | If `appointment.create`, navigates `/appointments/new?startsAt&endsAt&doctorId` |
| P10-08 | Booking form prefill | Query params applied |
| P10-09 | No drag/drop | Drag does not move appointments (page states this) |
| P10-10 | Prev / Next / Today | Range changes; data reloads |
| P10-11 | Loading | Loading state shown |
| P10-12 | Empty | Empty month/day messaging |
| P10-13 | Truncation | If >1000 appointments in range, warning appears |
| P10-14 | Doctor `/appointments/calendar` | Unauthorized |
| P10-15 | Leave highlight | Approved-leave overlap uses warning highlight (`overlapsApprovedLeave`) |

---

# PHASE 11 — Doctor leave + appointments

Use `qa.doctor` leave + Receptionist booking.

| ID | Case | Expected |
| --- | --- | --- |
| P11-01 | Pending leave | Does **not** block new booking |
| P11-02 | Approved leave | New booking overlapping leave → 409 doctor approved leave |
| P11-03 | Rejected leave | Does not block |
| P11-04 | Cancelled leave | Does not block |
| P11-05 | Existing appointment during later-approved leave | Appointment **remains**; not auto-cancelled |
| P11-06 | Calendar flag | Existing overlap shows leave highlight |
| P11-07 | Receptionist reschedules affected appointment | Works via existing reschedule |
| P11-08 | Receptionist cancels affected appointment | Works via existing cancel |
| P11-09 | Pending/rejected overlap with new booking | Allowed if schedule fits |

---

# PHASE 12 — Medical records

Role: **Doctor** with linked employee. Admin may only read.

| ID | Case | Expected |
| --- | --- | --- |
| P12-01 | Create draft no context | Patient + occurredAt + diagnosis/treatment/report |
| P12-02 | With appointment | Appointment belongs to same patient |
| P12-03 | With admission | Same-patient admission (Receptionist must have created it) |
| P12-04 | Both contexts | Rejected (at most one) |
| P12-05 | Author identity | Author is server-derived employee; client cannot set another author |
| P12-06 | Unlinked doctor | `qa.unlinked` as doctor → conflict/validation |
| P12-07 | Update draft | Persist changes |
| P12-08 | Finalize | Status final; edit disabled |
| P12-09 | Edit final | 409 |
| P12-10 | Amend | Reason required; successor created; predecessor link visible |
| P12-11 | Chronology | Amendment chain readable |
| P12-12 | Admin cannot create | `/medical-records/new` unauthorized; POST 403 |
| P12-13 | Nurse read-only | Detail OK; no finalize/amend |
| P12-14 | Receptionist | `/medical-records` unauthorized |
| P12-15 | List vs detail | List does not dump full clinical bodies |

---

# PHASE 13 — Prescriptions

Requires **active medicine** catalog row.

| ID | Case | Role | Expected |
| --- | --- | --- | --- |
| P13-01 | Create from finalized record | doctor | Item fields persist |
| P13-02 | Create from draft record | doctor | Rejected |
| P13-03 | Active medicine | doctor | Listed in `GET /medicines` |
| P13-04 | Inactive medicine | doctor | Not listed / rejected if forced via API |
| P13-05 | Quantity / instructions | doctor | Stored |
| P13-06 | Doctor identity | doctor | Server-side; not client-chosen |
| P13-07 | Admin `GET /medicines` | admin | **200** (`medicine.read` via D-036) |
| P13-08 | Read as pharmacist | pharmacist | Detail visible |
| P13-09 | Cancel with reason | doctor | Cancelled |
| P13-10 | Cancel after dispense | doctor | 409 if service forbids |
| P13-11 | Nurse cannot create | nurse | 403 POST |
| P13-12 | Receptionist | receptionist | No prescriptions nav |

---

# PHASE 14 — Laboratory

Requires **active lab test** with optional price for later billing.

Workflow: Doctor creates request → Lab collects → Lab enters result → request `completed` → print report.

| ID | Case | Role | Expected |
| --- | --- | --- | --- |
| P14-01 | Catalog list | doctor | `GET /lab/tests` active only |
| P14-02 | Create request | doctor | Patient + tests + optional clinical note |
| P14-03 | Doctor identity | doctor | Requested-by from linked doctor profile |
| P14-04 | Optional medical record | doctor | Same patient accepted; other patient rejected |
| P14-05 | Invalid patient UUID | doctor | 400/404 |
| P14-06 | Status after create | any reader | `requested` |
| P14-07 | Collect sample | lab | Item `sample_collected`; collector = lab employee |
| P14-08 | Result entry | lab | resultValue required; unit/range/note optional |
| P14-09 | Result before sample | lab | 409 |
| P14-10 | All items complete | lab | Parent `completed` |
| P14-11 | Mixed items | lab | Parent `in_progress` |
| P14-12 | Report page | lab/doctor | `/laboratory/:id/report` |
| P14-13 | Print | lab | `window.print()` layout |
| P14-14 | Unlinked lab user | unlinked lab | Collect/result conflict |
| P14-15 | Receptionist create | receptionist | 403 |
| P14-16 | Cancel request | any | **N/A DEFERRED** — no cancel API |
| P14-17 | Duplicate test on one request | doctor | Allowed |
| P14-18 | Null-price test | doctor + accountant later | Request OK; billing later rejects/omits priced charge |

---

# PHASE 15 — Pharmacy

Role: Pharmacist (receive/dispense). Admin may adjust and reverse.

| ID | Case | Expected |
| --- | --- | --- |
| P15-01 | List inventory | Batches and derived qty |
| P15-02 | Medicine read | Pharmacist `GET /medicines` 200 |
| P15-03 | Receive stock | New batch + receipt movement |
| P15-04 | Quantity / expiry / costs | Persist (costs not shown on inventory read) |
| P15-05 | Duplicate batch | Same medicine + batchNumber → 409 |
| P15-06 | Inactive medicine receive | 409 |
| P15-07 | Adjust increase | Reason required; stock up |
| P15-08 | Adjust decrease | Stock down |
| P15-09 | Adjust below zero | 409 |
| P15-10 | Movements list | Receipt/adjustment/dispense types |
| P15-11 | Partial dispense | Remaining quantity decreases |
| P15-12 | Second partial | Allowed until remaining 0 |
| P15-13 | Over-dispense | 409 |
| P15-14 | Expired batch | Cannot newly dispense |
| P15-15 | Inactive medicine dispense | 409 |
| P15-16 | Reverse dispense | Stock restored; prescription remaining recalculated |
| P15-17 | Second reverse | 409 |
| P15-18 | Reverse reason | Required |
| P15-19 | Invoice not auto-reversed | Existing invoice lines stay; billing Phase 16 |
| P15-20 | Admin receive | POST receipts **403** (no `stock.receive`) |
| P15-21 | Doctor inventory | Unauthorized |

---

# PHASE 16 — Billing

Role: **Accountant**. Admin can read/void/reverse but **cannot create** invoices.

Billable sources you should have from earlier phases: a **completed** appointment, a **completed** lab item with catalog **price**, an **unreversed** dispense.

| ID | Case | Expected |
| --- | --- | --- |
| P16-01 | Create draft from consultation | Completed appointment; enter unit price |
| P16-02 | Non-completed appointment | Not listed / rejected |
| P16-03 | Lab completed priced item | Charge created |
| P16-04 | Lab null price | Cannot charge / rejected |
| P16-05 | Pharmacy dispense | Multi-batch total if applicable |
| P16-06 | Admission line | **Rejected / not offered** (deferred) |
| P16-07 | Duplicate lab/pharmacy charge | 409 on non-void invoice |
| P16-08 | Edit draft | Lines change |
| P16-09 | Issue | Status `issued`; edit disabled |
| P16-10 | Issued immutability | PATCH 409 |
| P16-11 | Payment cash partial | Status `partially_paid`; number `PAY-<uuid>` |
| P16-12 | Payment card | Accepted |
| P16-13 | Payment bank_transfer | Accepted |
| P16-14 | Multiple payments to paid | Status `paid` |
| P16-15 | Overpayment | 409 |
| P16-16 | Reverse payment | Invoice status recalculated; reason required |
| P16-17 | Second payment reverse | 409 |
| P16-18 | Void rules | Follow issued/paid policy; confirm actual message |
| P16-19 | Receipt page | `/billing/:invoiceId/payments/:paymentId` |
| P16-20 | Print receipt | Browser print |
| P16-21 | Reversed dispense | Not newly billable |
| P16-22 | Admin create invoice | POST 403 |
| P16-23 | Receptionist `/billing` | Unauthorized |
| P16-24 | Accountant `/patients` | Unauthorized — must use billing lookup only |
| P16-25 | Tax/discount | Remain zero; **N/A** as product feature |

---

# PHASE 17 — Admissions

Role: **Receptionist** create/read. Nurse read. Admin/Doctor deny. Discharge/cancel: API-only expect 403.

| ID | Case | Expected |
| --- | --- | --- |
| P17-01 | Create admission | Patient + reason; optional doctor; number `ADM-<uuid>` |
| P17-02 | Number not client-set | Strict body has no admissionNumber |
| P17-03 | Deceased patient | Rejected |
| P17-04 | Optional doctor | Create without doctor |
| P17-05 | Invalid doctor | Rejected |
| P17-06 | Second active admission | 409 / unique active |
| P17-07 | List/filter | Status filter |
| P17-08 | Detail | Read-only; **no** discharge/cancel buttons |
| P17-09 | PATCH as receptionist | 403 `admission.update` ungranted |
| P17-10 | POST discharge as receptionist | 403 |
| P17-11 | POST cancel as receptionist | 403 |
| P17-12 | Same as admin token | 403 (admin has no admission perms) |
| P17-13 | Nurse read | List/detail OK; create unauthorized |
| P17-14 | Doctor `/admissions` | Unauthorized |
| P17-15 | Concurrent create | Two active creates for one patient → one 201 one 409 |
| P17-16 | Discharge summary / terminal | **N/A for UI**. API ungranted. Do not report as a product bug |
| P17-17 | Historical records | After any later status (if a privileged test token ever existed) remain associated — skip if still `admitted` |

---

# PHASE 18 — Attendance

Role: Admin or Receptionist. `/attendance`.

| ID | Case | Expected |
| --- | --- | --- |
| P18-01 | Create present with check-in | Row for employee + workDate |
| P18-02 | Check-out after check-in | Accepted |
| P18-03 | Check-out without check-in | 400 |
| P18-04 | Check-out earlier than check-in | 400 |
| P18-05 | Status absent / leave | Allowed; attendance `leave` is **independent** of leave module |
| P18-06 | Optional note | ≤500 |
| P18-07 | Duplicate same day | 409 |
| P18-08 | Edit | Status/times/note update |
| P18-09 | API checkout-only PATCH | May 400 (M16-06). UI resends both times — UI should still work |
| P18-10 | Audit | `attendance.create` / `attendance.update` appear in Audit viewer |
| P18-11 | Inactive/terminated employee | Historical row still listed |
| P18-12 | Doctor `/attendance` | Unauthorized |
| P18-13 | Concurrent duplicate | Two POSTs same employee/date → one 409 |
| P18-14 | Filters | Employee, status, pagination |

---

# PHASE 19 — Leave

Each linked role creates **own** leave. Admin approves.

| ID | Case | Expected |
| --- | --- | --- |
| P19-01 | Doctor creates leave | Type, start, end, optional reason; status `pending` |
| P19-02 | Unlinked user creates | 400 no employee |
| P19-03 | End before start | 400 |
| P19-04 | Range > 366 days | 400 |
| P19-05 | Edit pending | Owner can change dates/type |
| P19-06 | Edit after approve | 409 |
| P19-07 | Owner cancel pending | `cancelled` |
| P19-08 | Admin cancel someone else’s pending | UI may show button; API **403** |
| P19-09 | Admin approve | `approved`; decision optional note |
| P19-10 | Admin reject | `rejected` |
| P19-11 | Approve non-pending | 409 |
| P19-12 | Overlap pending+pending | 409 |
| P19-13 | Overlap pending+approved | 409 |
| P19-14 | Overlap with rejected | Allowed |
| P19-15 | Overlap with cancelled | Allowed |
| P19-16 | Non-admin approve API | 403 |
| P19-17 | Non-owner list | Other employees’ leave hidden unless admin |
| P19-18 | Receptionist/Nurse/Lab/Pharm/Accountant own leave | Same create/edit/cancel pending |
| P19-19 | Workflow pending→approved | Complete |
| P19-20 | Workflow pending→rejected | Complete |
| P19-21 | Workflow pending→cancelled | Complete |

---

# PHASE 20 — Reports

Browser print on each page. Date filters required; max 366 days.

| ID | Report | Role | Checks |
| --- | --- | --- | --- |
| P20-01 | Patients `/reports/patients` | admin | filters, pagination, empty, print |
| P20-02 | Patients as accountant | accountant | UI unauthorized; API 403 |
| P20-03 | Appointments | admin | same |
| P20-04 | Revenue | admin + accountant | both allowed; others 403 |
| P20-05 | Pharmacy | admin + pharmacist | low stock / near-expiry meaning |
| P20-06 | Laboratory | admin + lab | request counts |
| P20-07 | Staff | admin only | employees/departments/doctors |
| P20-08 | Invalid date | each | 400 |
| P20-09 | Inverted range | each | 400 |
| P20-10 | 367-day span | each | 400 |
| P20-11 | 366-day span | each | 200 |
| P20-12 | Doctor `/reports` | doctor | No Reports nav; URL unauthorized |
| P20-13 | Sensitive exclusion | accountant revenue | No full clinical notes / patient contact dump |
| P20-14 | CSV/PDF buttons on analytics | any | **N/A DEFERRED** — browser print only |

---

# PHASE 21 — Dashboard

Home `/`. Cards only if API returns that key.

| ID | Role | Expected cards |
| --- | --- | --- |
| P21-01 | Admin | Patients, today’s appointments, revenue, lab requests, pharmacy alerts |
| P21-02 | Accountant | Revenue only |
| P21-03 | Lab | Laboratory requests only |
| P21-04 | Pharmacist | Pharmacy alerts only |
| P21-05 | Doctor | No metric cards |
| P21-06 | Nurse | No metric cards |
| P21-07 | Receptionist | No metric cards |
| P21-08 | Loading / error / retry | Metrics query states |
| P21-09 | Empty / zero | Zeros only for **authorized** metrics, never as a substitute for omitted ones |
| P21-10 | Date boundary | “Today” uses `HOSPITAL_TIMEZONE` (Asia/Colombo in example env) |
| P21-11 | Check API | Health toast/alert |

---

# PHASE 22 — Audit viewer

Role: **Administrator**. `/audit`. Required `occurredFrom` / `occurredTo`.

| ID | Case | Expected |
| --- | --- | --- |
| P22-01 | Open viewer | Table of sanitized rows |
| P22-02 | Pagination | pageSize ≤100 |
| P22-03 | Date filter | Required; >366 days 400 |
| P22-04 | Actor filter | Narrows |
| P22-05 | Action filter | e.g. `user.create`, `auth.login` |
| P22-06 | Resource type | e.g. `user`, `patient`, `appointment` |
| P22-07 | Outcome | success / failure if used |
| P22-08 | Request ID | Matches `x-request-id` |
| P22-09 | Combined filters | AND behavior |
| P22-10 | No password/token/IP/signed URL/clinical body | Inspect JSON |
| P22-11 | Metadata allowlist only | keys ⊆ `fields, from, to, reason, statusChanged, departmentChanged, replacementId, rescheduledFrom, detectedDuring, failedLoginCount, format, rowCount, permission, roles` |
| P22-12 | Export CSV filtered | Downloads; Unicode characters present |
| P22-13 | Export PDF filtered | Downloads; Unicode (NotoSans) |
| P22-14 | Export ≤4999 | 200 file |
| P22-15 | Export =5000 | 200 file (if you can produce exactly 5000) |
| P22-16 | Export ≥5001 | 400 `AUDIT_EXPORT_TOO_LARGE`; no partial file |
| P22-17 | Export creates audit | New `audit.export` row after success |
| P22-18 | Non-admin | `/audit` unauthorized; API 403 |
| P22-19 | CSV formula-like username | If you create user `=cmd\|'/c calc'!A1` (policy may block `=` only as chars — username allows it), inspect whether CSV prefixes the cell. Record observation (M16-04). Do not treat neutralization as required unless you decide it is a security fail |

If you cannot generate 5001 rows, mark P22-15/16 **BLOCKED** and test the 400 path only if filters still exceed the cap.

---

# PHASE 23 — Cross-module fictional workflow

Use a single fictional patient (example name `QA Workflow Patient`). Do **not** use real patient data.

| Step | ID | Actor | Action | Check |
| --- | --- | --- | --- | --- |
| 1 | P23-01 | Receptionist | Register patient | `P-<uuid>` |
| 2 | P23-02 | Admin | Ensure department + employee + doctor + schedule | Bookable |
| 3 | P23-03 | Receptionist | Book appointment | scheduled |
| 4 | P23-04 | Receptionist | Check in | checked_in |
| 5 | P23-05 | Doctor | Draft + finalize medical record (appointment context) | final |
| 6 | P23-06 | Doctor | Prescription | active |
| 7 | P23-07 | Doctor | Lab request | requested |
| 8 | P23-08 | Lab | Sample + result | completed |
| 9 | P23-09 | Pharmacist | Receive stock if needed + dispense | remaining 0 or partial |
| 10 | P23-10 | Accountant | Invoice + issue + pay + print receipt | paid |
| 11 | P23-11 | Receptionist | Admission | admitted; second rejected |
| 12 | P23-12 | Receptionist | Discharge | **403 / no UI** — record as approved ungranted, not FAIL |
| 13 | P23-13 | Admin | Reports + dashboard | New activity reflected |
| 14 | P23-14 | Admin | Audit trail | create/login/clinical/billing actions present and sanitized |
| 15 | P23-15 | Receptionist | Upload one document | metadata visible |

---

# PHASE 24 — Negative testing (API)

Use Swagger or DevTools. Authenticate. For each major resource (`patients`, `appointments`, `users`, `leave`, `invoices`, `documents`), sample the following. Record the resource in the case notes.

| ID | Abuse | Expected |
| --- | --- | --- |
| P24-01 | Missing required field | 400 `VALIDATION_ERROR`; no stack |
| P24-02 | Invalid type | 400 |
| P24-03 | Invalid enum | 400 |
| P24-04 | Invalid UUID | 400 |
| P24-05 | Unknown UUID | 404 `RESOURCE_NOT_FOUND` |
| P24-06 | Unauthorized role | 403 `FORBIDDEN` |
| P24-07 | No Authorization | 401 `AUTHENTICATION_REQUIRED` |
| P24-08 | Malformed JSON | 400 |
| P24-09 | Duplicate unique | 409 `RESOURCE_CONFLICT` |
| P24-10 | Conflicting interval/leave | 409 |
| P24-11 | Invalid state transition | 409 |
| P24-12 | `pageSize=101` | 400 |
| P24-13 | Invalid / inverted date range | 400 |
| P24-14 | Unexpected extra property | 400 (Zod `.strict()`) |
| P24-15 | Extremely long string | 400 max length |
| P24-16 | Whitespace-only required string | 400 trim/min |
| P24-17 | Error body | Envelope only; no SQL, no Prisma stack, no password hash |
| P24-18 | Unknown route | 404 `ROUTE_NOT_FOUND` |

Repeat P24-01–P24-08 at least once per module you touched.

---

# PHASE 25 — Browser / UI inspection

Viewports: desktop (~1440), smaller desktop (~1280), tablet (~768) if practical.

| ID | Area | Check |
| --- | --- | --- |
| P25-01 | Layout | No clipped primary actions; tables scroll |
| P25-02 | Nav | No dead links; no item the role cannot use |
| P25-03 | Broken routes | `/this-does-not-exist` → Not found + Return home |
| P25-04 | Forms | Labels, required, validation, errors |
| P25-05 | Submit disable | Buttons disable or ignore double-submit during request |
| P25-06 | Success feedback | Toast/alert on create/update |
| P25-07 | Tables | Pagination, filters, empty, loading, error |
| P25-08 | Dialogs | Cancel/close without save; confirm destructive (void, reverse, cancel) |
| P25-09 | Console | No React errors; note warnings |
| P25-10 | Repeat fetches | Watch Network; record chatty polling if any |
| P25-11 | Leave Cancel affordance | Admin seeing others’ Cancel (M16-05) — usability FAIL or note only |

---

# PHASE 26 — API / OpenAPI inspection

Open `http://localhost:5000/api/docs`. Compare with `app.ts` mounts.

Mounted prefixes that must appear: `health`, `auth`, `patients`, `patients/:id/documents`, `departments`, `employees`, `doctors`, `appointments`, `admissions`, `attendance`, `leave`, `users`, `audit`, `medical-records`, `prescriptions`, `medicines`, `lab`, `pharmacy`, `billing`, `invoices`, `payments`, `reports`, `dashboard`, `openapi.json`.

| ID | Check | Expected |
| --- | --- | --- |
| P26-01 | Every implemented path is in Swagger | No silent extras except documented |
| P26-02 | Auth lock icons / descriptions | Protected routes require bearer |
| P26-03 | CSRF documented on login/refresh/logout | Header required |
| P26-04 | Admission write routes note ungranted | Description matches 403 |
| P26-05 | Error schema | `ErrorResponse` used |
| P26-06 | Frontend vs API | Calendar has no extra API; documents nested under patients |
| P26-07 | Status codes | 201 create, 204 logout/change-password/reset, 409 conflicts |
| P26-08 | Swagger Try-it-out login | Fails without CSRF/origin; succeeds with both + credentials |

For each Try-it-out you run, record endpoint, method, auth, permission, valid/invalid, response.

---

# PHASE 27 — Database integrity (inspect only)

Connect to **local** `hms_development` as a reader. Do not UPDATE/DELETE.

```sql
-- One role per user
SELECT user_id, COUNT(*) FROM user_roles GROUP BY user_id HAVING COUNT(*) > 1;

-- One attendance per employee/day
SELECT employee_id, work_date, COUNT(*) FROM attendance_records GROUP BY 1, 2 HAVING COUNT(*) > 1;

-- One active admission
SELECT patient_id, COUNT(*) FROM admissions WHERE status = 'admitted' GROUP BY 1 HAVING COUNT(*) > 1;

-- Negative stock
SELECT medicine_batch_id, SUM(quantity) FROM stock_movements GROUP BY 1 HAVING SUM(quantity) < 0;

-- Soft-deleted documents
SELECT status, COUNT(*) FROM patient_documents GROUP BY 1;

-- Refresh sessions after logout/reset
SELECT user_id, revoked_at IS NOT NULL AS revoked, COUNT(*) FROM refresh_sessions GROUP BY 1, 2;
```

| ID | Check | Expected |
| --- | --- | --- |
| P27-01 | FK orphans | None for patients/appointments/invoices |
| P27-02 | Unique numbers | patient/employee/admission/invoice/payment unique |
| P27-03 | Appointment exclusion | No overlapping scheduled/checked_in for same doctor or patient |
| P27-04 | Leave exclusion | No overlapping pending/approved per employee |
| P27-05 | One role | Query returns 0 rows |
| P27-06 | One active admission | 0 rows |
| P27-07 | Attendance unique | 0 rows |
| P27-08 | Stock ≥ 0 | 0 rows |
| P27-09 | Audit present | Creates/logins/exports exist; no password hashes |
| P27-10 | Documents | Soft-deleted have `deleted_at`; objects not publicly listed |
| P27-11 | Invoice/payment | Totals consistent with status |
| P27-12 | Impossible statuses | No contradictory appointment or invoice states |
| P27-13 | Password hashes | `users.password_hash` is Argon2, never plaintext |
| P27-14 | Refresh tokens | Only `token_hash` stored, not the raw cookie value |

---

# PHASE 28 — Security inspection

Do not attempt to exploit production. Local checks only. Do not write exploits or attack scripts.

| ID | Control | How | Expected locally |
| --- | --- | --- | --- |
| P28-01 | Password hashing | Inspect a hash in DB (read-only) | Argon2id prefix (`$argon2id$`) |
| P28-02 | JWT | Decode access token payload in a debugger (do not share it) | `sub`, `pva`, 15 min `exp`, issuer/audience |
| P28-03 | JWT after password change | Old token | `/auth/me` fails |
| P28-04 | Refresh rotation | Two refresh calls | New cookie; reuse of old refresh returns 401 and revokes the chain |
| P28-05 | HttpOnly cookie | DevTools | Not readable from `document.cookie` |
| P28-06 | Secure cookie | Local | Off in development. Production must be on |
| P28-07 | SameSite | Local | `Lax` |
| P28-08 | CSRF | Login POST without `X-HMS-CSRF: 1` | 403 |
| P28-09 | CORS | Request with a non-allowlisted Origin | 403 `ORIGIN_NOT_ALLOWED` |
| P28-10 | Helmet | Response headers | `X-Powered-By` absent; Helmet headers present |
| P28-11 | Rate limits | Auth only | Login/refresh/password limited; other APIs are not globally limited |
| P28-12 | Request ID | Any API | `x-request-id` echoed; appears on audit rows |
| P28-13 | Error handling | Force 400/401/403/404/409 | No stack, SQL, or env secrets |
| P28-14 | Input validation | Strict Zod | Extra fields 400 |
| P28-15 | SQL injection | Type quotes and OR-like text in search boxes | Treated as text; no extra rows from injection |
| P28-16 | Authorization | Every deny from Phase 2 | Backend 403, not UI-only |
| P28-17 | IDOR patient | As doctor, open another patient's URL | Allowed if you have `patient.read` (lists are permission-wide; ownership scoping is deferred) |
| P28-18 | IDOR leave | As doctor, GET/PATCH another employee's leave id | 403 |
| P28-19 | IDOR users | As receptionist, GET `/api/v1/users/{adminId}` | 403 |
| P28-20 | IDOR documents | Wrong patientId plus a real documentId | 404 |
| P28-21 | Document signed URL | Memory vs Supabase | Memory URL is not a real download; Supabase URL is time-limited |
| P28-22 | Audit redaction | Viewer and export | No passwords, tokens, signed URLs, or `sourceIp` |
| P28-23 | Sensitive logging | Backend console during login/reset | Password/token/service-role not logged |
| P28-24 | Storage | `localStorage` / `sessionStorage` | No tokens |
| P28-25 | JSON body limit | Very large POST | Controlled rejection; no crash |
| P28-26 | Admission write ungranted | PATCH/discharge/cancel with any role | 403 |

---

# PHASE 29 — Data cleanup list (do not delete yet)

After testing, list disposable rows. Do not delete audit logs. Do not delete anything until the owner approves.

| ID | Category | Suggested identifier | Safe to remove later? |
| --- | --- | --- | --- |
| P29-01 | Users | `qa.*` usernames except bootstrap admin if still needed | Yes, after sessions revoked; keep one admin |
| P29-02 | Patients | names starting with `QA ` | Yes, after dependents |
| P29-03 | Employees / doctors | QA job titles | Yes, after appointments/leave |
| P29-04 | Appointments | QA patient/doctor | Yes |
| P29-05 | Prescriptions / dispenses | QA patient | Yes |
| P29-06 | Lab requests | QA patient | Yes |
| P29-07 | Stock / batches | batch numbers like `QA-BATCH-*` | Yes if only test |
| P29-08 | Invoices / payments | QA patient invoices | Yes |
| P29-09 | Admissions | QA patient | Yes |
| P29-10 | Documents | QA patient docs | Soft-delete only in-app; storage objects may remain |
| P29-11 | Attendance / leave | QA employees | Yes |
| P29-12 | Audit | all test actions | Do not delete unless explicitly instructed |

Write the concrete IDs you created into `manual-qa-results.md` as you go.

---

# PHASE 30 — Final QA report

After you finish Phases 0-29, complete `docs/qa/manual-qa-results.md`.

Do not invent PASS. Count only executed verdicts.

Required sections (already templated in the results file):

1. Summary counts: total, passed, failed, blocked, not tested
2. Critical issues
3. High issues
4. Medium issues
5. Low issues
6. Deferred features (not bugs)
7. Requirements gaps (genuine only)
8. Regression issues
9. Production blockers before M17 cloud deploy

---

# Execution order

Run in this sequence. Do not skip setup.

1. Phase 0 — environment
2. Phase 1 (P1-01 to P1-06, P1-12 to P1-32) — login/session with bootstrap admin
3. Phase 3 — create all `qa.*` accounts, employees, and links
4. Return to P1-07 through P1-11 (disabled + lockout)
5. Phase 2 — RBAC for every role (keep tokens for API checks)
6. Phases 4-6 — departments, employees, doctors, schedules (Admin)
7. Phase 7 — patients (Receptionist)
8. Phase 8 — documents (Receptionist/Doctor)
9. Phases 9-11 — appointments, calendar, leave interaction (Receptionist + Doctor)
10. Phases 12-14 — records, prescriptions, lab (Doctor + Lab). Blocked if catalogs empty
11. Phase 15 — pharmacy (Pharmacist)
12. Phase 16 — billing (Accountant)
13. Phase 17 — admissions (Receptionist)
14. Phases 18-19 — attendance (Admin/Receptionist) and leave (every linked role)
15. Phases 20-21 — reports and dashboard (role-specific)
16. Phase 22 — audit (Admin)
17. Phase 23 — one end-to-end fictional workflow
18. Phases 24-26 — negatives, UI, OpenAPI
19. Phases 27-28 — database and security inspection
20. Phase 29 — cleanup inventory
21. Phase 30 — fill results summary

---

# Who runs which tests

| Role | Primary phases | Also |
| --- | --- | --- |
| Administrator | 0, 1, 3, 4 write, 5, 6 write, 18, 19 approve, 20 admin reports, 21, 22, 26-28 | Read-only patients, appointments, inventory, billing void/reverse, medical-record list |
| Receptionist | 7, 8, 9, 10, 11, 17, 18, 19 own leave, 23 booking/admission | Phase 2 deny list |
| Doctor | 8, 12, 13, 14 create, 19 own leave, 23 clinical | Phase 2; no appointments |
| Nurse | Phase 2, 7 read, 8, 12 read, 17 read, 19 | |
| Laboratory Staff | 14 collect/result/report, 20 lab, 21 lab card, 19 | |
| Pharmacist | 15, 13 read/dispense, 20 pharmacy, 21 alerts, 19 | |
| Accountant | 16, 20 revenue, 21 revenue, 19, P2-SENS | |

---

# Tests that need API / Swagger (not UI alone)

- CSRF, CORS, rate limit, refresh reuse (Phase 1, 28)
- All 403 checks for hidden permissions (Phase 2, 24)
- Admission update/discharge/cancel (Phase 17) — no UI
- `pageSize=101`, extra JSON fields, invalid UUIDs (Phase 24)
- Audit export 5001-row cap if the UI cannot produce it (Phase 22)
- Admin `GET /api/v1/medicines` 403 (P13-07)
- Document access DTO leakage and wrong-patient IDOR (Phase 8)
- Password reset HTTP 204 empty body (P3-17)
- Concurrent booking/admission/attendance (two clients)

---

# Tests that need database inspection

Phase 27, plus optional confirmation of:

- `locked_until` after lockout (do not write)
- `password_changed_at` after reset
- `uq_user_roles_user_id`
- appointment and leave exclusion constraints
- `uq_admissions_one_active_per_patient`
- Catalog emptiness before Phase 13

---

# Tests that need browser DevTools

- Phase 1 token/cookie/storage/headers
- Phase 25 console and Network
- Phase 28 cookie flags, CSRF, CORS
- Confirm access token never persisted
- Confirm print pages for lab report, receipt, and reports

---

# Special-attention / likely production blockers

These are inspection findings to verify, not automatic fails.

1. Admission discharge/cancel cannot be performed by any role (D-026). Cloud go-live cannot include a working discharge workflow unless a later decision grants permissions. Do not file this as an accidental bug.
2. Local document memory driver cannot prove private Supabase retrieval. Production must use `DOCUMENT_STORAGE_DRIVER=supabase` and a private bucket (ADR-004 / D-030).
3. Medicine and lab catalogs have no admin UI. Empty catalogs block prescribing, lab, pharmacy, and parts of billing.
4. Doctor/Nurse cannot see appointments (approved). Confirm this matches operational expectation before go-live.
5. Administrator cannot open admissions (approved). Confirm operational expectation.
6. Health check does not verify PostgreSQL or storage. Fine locally; weak as a cloud liveness/readiness probe.
7. Leave Cancel button for Administrator on other employees' rows (M16-05). API is correct (403); UI is misleading.
8. Attendance PATCH check-out without repeating check-in may 400 (M16-06). UI path should still work.
9. No global API rate limit outside auth. Record for M17 hardening; not an M16 functional fail.
10. Resource-level "relevant patient only" scoping is deferred. IDOR-by-UUID among users who share a read permission is expected today.
11. Secure cookie / SameSite=None / CSRF / CORS must be re-tested on the real Vercel to Render topology (D-034 still PENDING). Local Lax/non-Secure is expected.
12. D-034 and D-035 (production operating policy, backup/DR) are pending. They are requirements/process gaps, not application test fails.

---

# Requirements that cannot be fully verified in this local pass

| Item | Why |
| --- | --- |
| Hospital_system.pdf wording | File not in the workspace |
| Real private-bucket download and object ACL | Memory driver uses a fake signed URL |
| Production Secure / SameSite=None cookies and third-party cookie behavior | Not deployed |
| Render trust proxy / HTTPS | Local TRUST_PROXY is false |
| Audit export exactly 5000 vs 5001 | Needs a very large audit table |
| Concurrent exclusion under load | Manual two-browser check is only a sample |
| Backup, HA, DR, measurable SLOs | REQUIREMENTS ONLY |
| HIPAA/GDPR certification claims | Not in scope as implemented features |
| Malware scanning of uploads | DEFERRED |
| Admission discharge happy path | Ungranted by design |

---

# Planned case count

| Phase | Case IDs | Count |
| --- | --- | --- |
| 0 Environment | P0-01 to P0-15 | 15 |
| 1 Authentication | P1-01 to P1-32 | 32 |
| 2 RBAC | 7 role scripts + P2-SENS-01 to P2-SENS-06 + 1 matrix | 13 numbered plus matrix cells |
| 3 Users | P3-01 to P3-22 | 22 |
| 4 Departments | P4-01 to P4-09 | 9 |
| 5 Employees | P5-01 to P5-12 | 12 |
| 6 Doctors / schedules | P6-01 to P6-14 | 14 |
| 7 Patients | P7-01 to P7-16 | 16 |
| 8 Documents | P8-01 to P8-21 | 21 |
| 9 Appointments | P9-01 to P9-21 | 21 |
| 10 Calendar | P10-01 to P10-15 | 15 |
| 11 Leave + appointments | P11-01 to P11-09 | 9 |
| 12 Medical records | P12-01 to P12-15 | 15 |
| 13 Prescriptions | P13-01 to P13-12 | 12 |
| 14 Laboratory | P14-01 to P14-18 | 18 |
| 15 Pharmacy | P15-01 to P15-21 | 21 |
| 16 Billing | P16-01 to P16-25 | 25 |
| 17 Admissions | P17-01 to P17-17 | 17 |
| 18 Attendance | P18-01 to P18-14 | 14 |
| 19 Leave | P19-01 to P19-21 | 21 |
| 20 Reports | P20-01 to P20-14 | 14 |
| 21 Dashboard | P21-01 to P21-11 | 11 |
| 22 Audit | P22-01 to P22-19 | 19 |
| 23 Cross-module | P23-01 to P23-15 | 15 |
| 24 Negatives | P24-01 to P24-18 | 18 unique patterns |
| 25 UI | P25-01 to P25-11 | 11 |
| 26 OpenAPI | P26-01 to P26-08 | 8 |
| 27 Database | P27-01 to P27-14 | 14 |
| 28 Security | P28-01 to P28-26 | 26 |
| 29 Cleanup list | P29-01 to P29-12 | 12 |
| 30 Report | complete results file | 1 deliverable |

Numbered unique cases: **440** (P0-P29, counting Phase 2 as 7 role scripts + 6 sensitive checks).
If every RBAC matrix cell is recorded separately (7 roles x 18 feature rows = 126 cells), expect about **553** recorded results.

Use the results template to tick them. Do not pre-fill PASS.
