# M16 Final Audit Report

Status: PASS WITH FINDINGS  
Date: 2026-09-29  
HEAD audited: `cdbe241273753a90064c53fd864fbd95a7069812` on `main`  
Scope: audit only. No application code, schema, migration, permission, or dependency changes were made by this audit.

`Hospital_system.pdf` is not in the workspace. Missing PDF wording was not reconstructed. Approved sources were the implementation, `docs/requirements/requirements-analysis.md`, `docs/requirements/decision-register.md` (D-028 through D-033), architecture/security/database docs, tests, and OpenAPI.

## Overall status

```text
PASS WITH FINDINGS
```

No blocker or high-severity defect was found. Three medium findings should be corrected before the M16 commit. Low findings can follow.

## Requirements traceability

| Decision | Requirement | Implementation | Evidence | Status |
| --- | --- | --- | --- | --- |
| D-028 | Attendance | `attendance_records` unique `(employee_id, work_date)`; `attendance.*` on Administrator and Receptionist only; historical rows for terminated employees; create/update audited | `schema.prisma`, `attendance.service.ts`, `attendance.routes.ts`, `backend/test/database/operations.test.ts` | PASS |
| D-029 | Leave | Own-employee create via `employees.user_id`; pending/approved/rejected/cancelled; overlap exclusion; pending-only edit; owner cancel; Administrator approve/reject | `leave.service.ts`, migration `ex_leave_records_employee_active_overlap`, operations tests | PASS |
| D-030 | Patient documents | Private storage driver, magic-byte MIME, 10 MB, soft delete, short-lived signed URLs, dedicated `patient_document.*` | `document.service.ts`, `documentStorage.ts`, `env.ts`, operations tests | PASS |
| D-031 | User administration | Administrator-only `user.*`; one catalog role on the happy path; no delete; password reset revokes sessions and bumps `passwordChangedAt` | `user.service.ts`, `user.routes.ts`, `auth.service.ts` `loadCurrentUser` | PARTIAL |
| D-032 | Audit viewer and export | Administrator `audit.read`; required range max 366 days; sanitized DTO; on-demand CSV/PDF; export audited after generation | `audit.sanitize.ts`, `audit.service.ts`, `audit.repository.ts` | PARTIAL |
| D-033 | Appointment calendar | Day/week/month over `startsAt`/`endsAt`; doctor filter; detail and existing booking form; approved leave blocks new bookings on the server and flags overlaps | `AppointmentCalendarPage.tsx`, `appointment.service.ts` `assertDoctorNotOnApprovedLeave` | PASS |

## Findings

### M16-01 — Exactly one role is not enforced in the database

- Severity: MEDIUM
- Area: D-031 users
- Problem: `user_roles` is unique on `(user_id, role_id)` only. `replaceUserRole` deletes then inserts inside a transaction, but it does not lock the user row. Two concurrent role changes can both insert and leave two roles. `loadCurrentUser` unions every role’s permissions, while `toManagedUserDto` shows only `roles[0]`.
- Evidence: `backend/prisma/schema.prisma` `UserRole`; `backend/src/modules/users/user.repository.ts` `replaceUserRole`; `backend/src/modules/auth/auth.service.ts` `toCurrentUser`.
- Why it matters: The approved rule is exactly one catalog role. A second role is an invisible privilege expansion.
- Correction: Add a uniqueness constraint on `user_roles.user_id` and lock the user row for the replacement. Do not apply that migration during this audit.

### M16-02 — Audit export can omit rows without saying so

- Severity: MEDIUM
- Area: D-032 audit
- Problem: `listAuditRecordsForExport` takes at most 5,000 rows and the CSV/PDF response does not report truncation. A bounded 366-day filter can still be incomplete while returning HTTP 200.
- Evidence: `backend/src/modules/audit/audit.repository.ts` `MAX_EXPORT_ROWS`; `audit.controller.ts` sets `Content-Disposition` and `Cache-Control: no-store` only.
- Why it matters: D-032 requires the export to be the same filtered, sanitized set. A silent cap can hide later records.
- Correction: Reject or explicitly mark an export that exceeds the cap. Do not store the file.

### M16-03 — PDF export fails on characters outside WinAnsi

- Severity: MEDIUM
- Area: D-032 audit
- Problem: `buildAuditPdf` embeds Helvetica. `pdf-lib` throws `WinAnsi cannot encode` for characters such as U+0101. Username is unconstrained beyond length, so one such actor username fails the entire PDF export. CSV export is unaffected. Confirmed with `pdf-lib` 1.17.1.
- Evidence: `backend/src/modules/audit/audit.export.ts`.
- Why it matters: An approved export path returns 500 for otherwise valid audit data.
- Correction: Use a font that covers the allowed username characters, or replace unencodable characters and still return the file.

### M16-04 — CSV formula injection is not neutralized

- Severity: LOW
- Area: D-032 audit
- Problem: `csvEscape` quotes commas, quotes, and newlines only. A username beginning with `=`, `+`, `-`, or `@` is written as a raw cell.
- Evidence: `backend/src/modules/audit/audit.export.ts` `csvEscape`.
- Why it matters: Opening the admin-only export in a spreadsheet can interpret a crafted username as a formula.
- Correction: Prefix formula-like cells before escaping.

### M16-05 — Cancel is offered for leave the caller cannot cancel

- Severity: LOW
- Area: D-029 leave UI
- Problem: The leave table shows Cancel for every pending row when the caller has `leave.cancel`. Administrator has that permission and can see every request, but `cancelLeave` allows only the linked employee. The API correctly returns 403.
- Evidence: `frontend/src/features/leave/LeaveListPage.tsx`; `backend/src/modules/leave/leave.service.ts` `cancelLeave`.
- Why it matters: The button implies an action the server will reject.
- Correction: Show Cancel only for the caller’s own pending leave. Keep the server check.

### M16-06 — Check-out cannot be patched unless check-in is sent again

- Severity: LOW
- Area: D-028 attendance
- Problem: `updateAttendanceBodySchema` treats a body that contains `checkOutAt` and omits `checkInAt` as invalid. The service can merge with the stored check-in, and the UI resends both fields, so the screen works.
- Evidence: `backend/src/modules/attendance/attendance.schemas.ts` `validTimes`.
- Why it matters: A direct API correction of check-out alone is rejected.
- Correction: Apply the check-in/check-out order rule to the merged record, which the service already computes.

### M16-07 — M16 database tests do not lock the approved role catalog

- Severity: LOW
- Area: Tests
- Problem: `operations.test.ts` builds a synthetic `roleMatrix`. Its Nurse role has only `patient.read`, and its Doctor role lacks document update/delete. Those tests correctly prove `patient.read` is not document access, and they still pass if `ROLE_PERMISSION_CODES` drifts.
- Evidence: `backend/test/database/operations.test.ts` `roleMatrix` versus `backend/src/auth/roleCatalog.ts`.
- Why it matters: A future catalog mistake would not fail this suite. The catalog itself matches D-028–D-033 today.
- Correction: Add assertions against `ROLE_PERMISSION_CODES` for the M16 permissions.

## Security

Authentication from M5 is intact: Argon2id, access JWT with password version (`pva`), refresh rotation, session revocation, `passwordChangedAt` checked in `loadCurrentUser`, HttpOnly refresh cookie (`Secure` and `SameSite=None` in production), CSRF on cookie auth routes, explicit CORS allow-list, auth rate limits, and logger redaction of passwords, tokens, and service-role fields.

Authorization is enforced in route middleware, not only in the UI. Non-administrators receive 403 on user and audit routes. Leave create ignores any client employee id. Document routes require `patient_document.*` and match `patientId` before a signed URL is issued. Deleted documents are excluded from list/get/access.

No IDOR was found that lets a non-administrator manage another user or another employee’s leave. Password reset returns 204 with an empty body, updates `passwordChangedAt`, and revokes refresh sessions. Audit responses omit `sourceIp`, passwords, tokens, and signed URLs. Document DTOs omit `objectKey` and checksum.

Storage uses the service role only on the server. Object keys are `patient-documents/<uuid>`. Signed URL TTL is 30–900 seconds, default 300. `DOCUMENT_STORAGE_DRIVER=memory` is rejected when `NODE_ENV=production`, and tests force the memory driver. Upload size and magic bytes are enforced on the server. There is no fallback from Supabase to memory after a storage error.

## Database

Migration `20260929013000_m16_operations` is non-destructive: it remaps leave `requested` to `pending`, relaxes `reason` to optional, adds the overlap exclusion, adds document `title`, and adds audit indexes. `btree_gist` already exists from the initial migration. Attendance uniqueness and check-in/check-out ordering were already constraints. This audit did not create or apply a migration. The database test runner reported no pending migrations on local `hms_test` only.

Leave overlap and attendance uniqueness are database-enforced. Leave writes lock the employee row. The single-role rule is not database-enforced (M16-01). A failed document metadata write after a successful storage upload can leave an orphan object; that is not a public-access hole.

## Testing

| Check | Result |
| --- | --- |
| Backend unit tests | 27 files, 104 tests, passed |
| Frontend unit tests | 24 files, 118 tests, passed |
| Database tests (`hms_test` on localhost) | 13 files, 290 tests, passed |
| Lint | Passed (backend and frontend) |
| Typecheck | Passed (backend and frontend) |
| Backend build | Passed |
| Frontend build | Passed (existing chunk-size warning, 853 kB) |
| Prisma validate | Passed |
| npm audit | Backend 0, frontend 0 |

Coverage that is present: attendance duplicate and concurrent create, terminated-employee history, leave overlap, owner cancel, receptionist approval denial, document MIME/size/soft-delete, user 403, password not returned, self-demotion, audit range required, approved leave blocking a new booking while an existing appointment stays and is flagged.

Coverage that is thin: the approved catalog (M16-07), last-administrator protection when other administrators exist, PDF Unicode, CSV formula cells, and export truncation.

## Browser and API verification

Interactive browser sessions were not run. No application server was already running, and creating seven temporary accounts would have written the development database. Role behavior was instead executed through the `hms_test` API suite and frontend permission-gate tests.

API results on fictional `hms_test` data, which the suite deletes afterward:

- Administrator: attendance, leave approval, users, documents, audit list/export, and leave-aware booking behave as authorized.
- Receptionist: attendance, own leave, documents, and booking are allowed; user list, audit list, and leave approval return 403.
- Doctor: own leave and document read are allowed on the synthetic doctor role; attendance returns 403. Production doctors also have document update/delete in `roleCatalog.ts`. They still lack `appointment.read`, so the calendar stays behind the existing appointment permission.
- Nurse, laboratory staff, pharmacist, and accountant: the production catalog grants own leave and, for Nurse only, patient documents. The synthetic nurse fixture used in tests has `patient.read` without document permissions and correctly receives 403, which proves document access is a separate permission.

No temporary accounts were created. No accounts were disabled because none were added.

## Scope

M16 did not add admission billing, wards, beds, rooms, transfers, insurance, tax, discounts, payment gateways, credit accounts, email, SMS, leave notifications, biometric attendance, payroll, overtime, shifts, recurring appointments, hospital holidays, drag-and-drop rescheduling, new roles, AI, audit retention or deletion, forgotten-password email, malware scanning, leave balances, or multi-level approval.

The schema still allows a document status of `quarantined`. The application does not implement a quarantine or scanning workflow.

## Production readiness

Compatible with a later D-034 deployment in these ways: production document storage must be Supabase; memory storage cannot start in production; storage variables are documented in `backend/.env.example`; `backend/.env` is gitignored; the frontend does not call PostgreSQL or Supabase with a service credential; CORS remains an explicit origin list; cookie auth assumptions are unchanged. Nothing was deployed. Backup, restore, and high-availability claims remain deferred to D-035. Deployment docs still say not to claim them.

## Git

- Branch: `main`
- HEAD: `cdbe241273753a90064c53fd864fbd95a7069812`
- No commit
- No push
- No reset
- Application source was not edited by this audit
- Audit file added: `docs/requirements/m16-final-audit.md`
- Required `npm run build` refreshed existing untracked `backend/dist` output. That output was already untracked before the audit.

## Recommendation

Correct M16-01, M16-02, and M16-03 before the M16 commit. M16-04 through M16-07 can be addressed in a follow-up. Do not treat the current tree as a clean pass.
