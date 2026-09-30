# M15 Remaining Requirements Audit and Decision Gate

Status: Audit complete — implementation not started  
Date: 2026-09-29  
Primary requirements source: `docs/requirements/requirements-analysis.md` (approved
baseline derived from `Hospital_system.pdf`)

`Hospital_system.pdf` is **not present** in the workspace. `.gitignore` excludes it as
`Hospital_system.pdf`. This audit does not reconstruct missing PDF wording from memory.
It uses the approved requirements analysis, decision register, architecture, security,
database, development, and deployment documents, plus the current repository.

This milestone is a decision gate. No APIs, schema, permissions, screens, tests,
packages, configuration, migrations, or deployment changes were made.

## 1. M15 status

```text
Audit complete — implementation not started
```

No remaining functional area is marked implementation-ready until its decision gate is
approved by the project owner. D-001 / ADR-005 already approve cloud deployment as
current scope; that does not make production go-live, backup claims, or remaining
product modules ready.

## 2. Sources inspected

| Source | Present | Use in this audit |
| --- | --- | --- |
| `Hospital_system.pdf` | No | Not used. Not reconstructed. |
| `docs/requirements/requirements-analysis.md` | Yes | Primary functional/NFR baseline |
| `docs/requirements/decision-register.md` | Yes | Approved decisions D-001–D-027; remaining ambiguities |
| `docs/requirements/m14-requirements-audit.md` | Yes | Post-M13 remainder; M14 now implemented |
| `docs/architecture/` including ADRs 001–005 | Yes | Modular monolith, JWT, storage, cloud platforms |
| `docs/security/security-architecture.md` | Yes | Auth, RBAC, documents, audit, remaining policy |
| `docs/database/` logical, physical, ERD, traceability | Yes | Schema capability vs approved application policy |
| `docs/development/` module docs and workflow | Yes | Implemented slices M5–M14 |
| `docs/deployment/deployment-architecture.md` | Yes | Target topology; not deployed |
| Prisma schema and migrations | Yes | Tables exist for unused workflows |
| `backend/src/auth/auth.constants.ts`, `roleCatalog.ts` | Yes | Permission catalog after M14 |
| `backend/src/docs/openApi.ts` | Yes | Implemented contract version `0.11.0` |
| Frontend routes, `AppShell`, feature modules | Yes | UI coverage vs named screens |
| Backend `app.ts` routers and tests | Yes | Mounted modules; no users/documents/attendance/leave/audit-read |

Code, Prisma schema, and migrations are treated as **implementation evidence**. Schema
presence alone is not treated as implemented functionality. Approved requirements and
decisions are treated as scope. Common hospital-software features that are not in those
documents were not added as requirements.

## 3. Current implementation baseline

### Git

| Item | Value |
| --- | --- |
| Branch | `main` |
| HEAD | `cdbe241` `feat(reporting): implement reports and dashboard` |
| Working tree at audit start | Clean |
| Relation to `origin/main` | Ahead by 1 commit (M14). No push performed in M15. |
| Commit created in M15 | None |

### M14 confirmation

M14 exists and is documented in `docs/development/reports-and-dashboard.md` under
**D-027 (APPROVED)**. Evidence:

- Backend routers `/api/v1/reports/*` and `/api/v1/dashboard`
- Dedicated `report.*` permissions and role grants
- Frontend Reports routes and Home dashboard metrics
- OpenAPI version `0.11.0`
- Tests: backend report schema/API files; frontend `reports.test.tsx`

No temporary M14 verification users were created during this audit. Database tests, when
run separately, target isolated `hms_test` and delete created users. This audit did not
run `npm run test:database` because that command applies migrations and writes to
`hms_test`.

### Prisma and OpenAPI

- Migrations: `20260919160000_initial_physical_schema`,
  `20260928233000_admissions_one_active_per_patient`
- No new migration since M14 (reports used existing tables)
- `prisma validate`: schema valid
- OpenAPI implemented-contract version: `0.11.0`

### Role and permission catalog (after M14)

Seven system roles remain: Administrator, Doctor, Nurse, Receptionist, Laboratory
Staff, Pharmacist, Accountant.

There are still **no** `document.*`, `attendance.*`, `leave.*`, `audit.read`, or
`user.*` permission codes. Report permissions exist from D-027. Admission
`update` / `discharge` / `cancel` codes exist and remain ungranted (D-026 policy).

### Backend modules mounted in `app.ts`

health, auth, patients, departments, employees, doctors, appointments, admissions,
medical-records, prescriptions, medicines, laboratory, pharmacy, billing lookups,
invoices, payments, reports, dashboard, OpenAPI.

Not mounted: users administration, patient documents, attendance, leave, audit read.

User creation remains `backend/src/scripts/bootstrap-admin.ts` only.

### Frontend modules

Login, Home/dashboard, change password, patients, departments, employees, doctors,
appointments, admissions, medical records, prescriptions, laboratory (including
per-request print), pharmacy inventory/receive/adjust/movements, billing
invoices/receipts, reports.

Not present: attendance, leave, document upload/list, user administration, audit
viewer, appointment calendar widget.

### Classification legend used below

- **Implemented** — approved slice has API, authorization, validation, UI where
  required, and tests.
- **Partially implemented** — some layers or an approved subset exist.
- **Deferred** — explicitly deferred by an approved decision or module document.
- **Specified but not implemented** — named in approved requirements; application
  policy still incomplete or missing.
- **Missing specification / decision required** — cannot implement without a new
  approved decision.
- **Operational/deployment concern** — provider/runbook/configuration, not an
  application feature.
- **Future enhancement** — PDF future enhancement; not current scope.

---

## 4. Requirements traceability matrix

| Requirement | Source | Current Status | Existing Implementation | Missing | Decision Required | Proposed Next Milestone |
| --- | --- | --- | --- | --- | --- | --- |
| Login / logout | Requirements 3.1; D-003 | Implemented | `/auth/login`, `/refresh`, `/logout`; Login page | None for current slice | No | — |
| Authenticated password change | Requirements 3.1 | Implemented | `/auth/change-password`; Change password page; session revocation | Forgotten-password / admin reset | D-031 | After D-031 |
| Forgotten password / admin reset | Requirements “password management”; register note | Missing specification / decision required | None | Identity verification, unauthenticated recovery, admin reset API | D-031 | After D-031 |
| Roles and RBAC enforcement | Requirements 3.1; D-005 | Implemented | Seven roles, permission catalog, middleware | User-admin API to assign roles | D-031 for assignment UI/API | After D-031 |
| Operational user create / activate / deactivate / role assign | Administrator “manage users”; D-005 | Specified but not implemented | Bootstrap-admin CLI; employee may link an existing `userId` | `/users` API, permissions, privilege-escalation rules | D-031 **PENDING USER APPROVAL** | After D-031 |
| Patient register / update / search | Requirements 3.2; D-012 | Implemented | Patient module | Display-format/duplicates remain open and non-blocking | No for current slice | — |
| View medical history | Requirements 3.2 / 3.5 | Implemented | Medical records when `medical_record.read` | None for current slice | No | — |
| Upload patient documents | Requirements 3.2; ADR-004; M6 deferred | Deferred + missing specification | `patient_documents` table only | Storage wiring, validation, permissions, lifecycle | D-030 **PENDING USER APPROVAL** | After D-030 (and storage env) |
| Doctors, departments, employee registration | Requirements 3.3 / 3.9 | Implemented | Organization module | Attendance/leave integration | D-028 / D-029 | After those gates |
| Doctor schedules | Requirements 3.3 | Partially implemented | Explicit intervals; booking uses them | Recurrence, breaks, overlap, holidays | Existing unresolved M7 remainder; not a new D-id unless reopened | Not M16 unless approved |
| Book / cancel / reschedule; status; select doctor | Requirements 3.4; D-013; D-021 | Implemented | Appointment API and list UI | Calendar visualization | D-033 for calendar | After D-033 |
| Calendar-oriented appointment interface | Requirements UI | Partially implemented | Date-range filtered table, doctor filter | Calendar visualization | D-033 **PENDING USER APPROVAL** | After D-033 |
| Diagnoses, treatments, prescriptions, medical reports | Requirements 3.5; D-014; D-022 | Implemented | Clinical modules | Nurse write, templates | Existing remainder | Deferred unless reopened |
| Lab requests, collection, result entry, per-request report | Requirements 3.6; D-023 | Implemented | Laboratory module | Cancel, finalize, correct, catalog write | D-023 explicit deferral | Deferred |
| Pharmacy inventory, dispense, expiry at dispense, reversal | Requirements 3.7; D-015; D-020; D-024 | Implemented | Pharmacy module | Catalog write, damaged-stock policy | D-024 remainder | Deferred |
| Pharmacy alerts on dashboard | Requirements dashboard; D-027 | Implemented | Dashboard pharmacy alerts; pharmacy report | Notifications/jobs | No (D-027) | — |
| Consultation / lab / pharmacy charges; invoices; payments; receipts | Requirements 3.8; D-016; D-025 | Implemented | Billing module | Admission billing, tax/discount | D-025 deferral | Deferred |
| Admission charges | Requirements 3.8; D-025 | Deferred | Schema `admission_id` unused; API rejects | Policy to enable | Remain D-025 | Deferred |
| Inpatient admissions | D-009; D-026 | Implemented | Admissions module | Discharge/cancel grants; wards/beds | D-026 ungranted ops are policy | Deferred unless matrix changes |
| Record attendance | Requirements 3.9; D-019 | Specified but not implemented | `attendance_records` table | Capture, permissions, UI, correction | D-028 **PENDING USER APPROVAL** | After D-028 |
| Maintain leave records | Requirements 3.9; D-019 | Specified but not implemented | `leave_records` table | Types, approval, overlap, permissions | D-029 **PENDING USER APPROVAL** | After D-029 |
| Named reports and dashboard metrics | Requirements 3.10; D-027 | Implemented | Reports + Home metrics | CSV/PDF, attendance/leave reports | D-027 deferrals | Deferred |
| Audit logs exist | Requirements security | Implemented (write) | `writeAudit` on material actions | Viewer/export | D-032 for viewing | After D-032 |
| Administrator views audit records | Approved role matrix | Specified but not implemented | Write-only `audit_logs` | Read API, filters, sensitivity, export | D-032 **PENDING USER APPROVAL** | After D-032 |
| Secure login, hashing, RBAC, session timeout | Requirements security; ADR-003 | Implemented | Argon2id, JWT, refresh idle/absolute | Production cookie proof | D-034 for production proof | After deploy config |
| Daily/weekly backups, HA, DR | Requirements reliability | Operational/deployment concern | Not configured | Provider plan, RPO/RTO, restore tests | D-035 **PENDING USER APPROVAL** | Before production data |
| Cloud deployment Vercel/Render/Supabase | D-001; ADR-005 | Operational/deployment concern | Target architecture only; not deployed | Env, platforms, CORS, cookies, migrations | D-034 **PENDING USER APPROVAL** for remaining operating policy | After D-034 values exist |
| Responsive UI / loading/error/empty | Requirements usability | Partially implemented | Shared state views; horizontal nav | Dedicated mobile nav | No new product module | Non-blocking |
| Mobile app, portal, SMS/email, telemedicine, insurance, AI, biometrics | Requirements future enhancements | Future enhancement | None | — | No unless scope changes | Out of scope |
| Performance measurable targets | Requirements performance | Missing specification | None claimed | Concurrent users, latency, SLO | Operational targets in register | Not an app milestone |
| Legal/compliance (HIPAA/GDPR etc.) | Register legal gap | Missing specification | Security-conscious practices only | Jurisdiction, retention, consent | Do not claim compliance | Out of scope until specified |

---

## 5. Attendance findings

### Required by source

Staff management names **record attendance**. The approved role matrix does not name an
attendance permission. Reliability/reports mention staff reports; D-027 excluded
attendance from staff reports because the workflow is unimplemented.

### Already approved (D-019 / D-017)

- Status set: `present`, `absent`, `leave`
- One row per employee and hospital-local work date
- Unique `(employee_id, work_date)`

### Existing implementation (schema capability, not an API)

`attendance_records` exists with `workDate`, optional `checkInAt` / `checkOutAt`,
`status`, optional `note`, optional `recordedByUserId`. Check constraint: checkout
requires check-in and must be later. No permission, route, repository, UI, or test
module.

`.gitignore` / application code contain **no** attendance APIs.

### Not specified (do not invent)

The approved documents do **not** specify:

- Who records attendance (employee self-service vs administrator vs receptionist)
- Capture method (manual daily status vs clock-in/clock-out)
- Whether `checkInAt` / `checkOutAt` are used, optional, or ignored
- Editing/correction after save
- Viewing scope (self vs department vs all staff)
- Reporting beyond the D-027 exclusion
- Permissions
- Late/early, overtime, shifts, biometrics, payroll, absence approval

`check_in_at` / `check_out_at` are **existing schema capability**. They are not an
approved clock-in product requirement.

### Decision

Blocked on **D-028**. Parent baseline remains D-019.

---

## 6. Leave findings

### Required by source

Staff management names **maintain leave records**. No leave permission matrix exists
in the approved role text.

### Already approved (D-019 / D-017)

- Statuses: `requested`, `approved`, `rejected`, `cancelled`
- Decision actor/time metadata (`decidedByUserId`, `decidedAt`, optional `decisionNote`)
- Date range `startsOn` ≤ `endsOn` (schema check)

### Existing implementation (schema capability)

`leave_records` exists with `leaveType` (`varchar(50)`), required `reason`, default
status `requested`. Decision check: approved/rejected require both decision fields;
requested requires neither; cancelled is allowed. No overlap unique constraint. No
API, permissions, or UI.

### Not specified (do not invent HR policy)

- Who creates a leave row (employee vs administrator)
- Who approves/rejects
- Leave type catalog (schema is a free string, not an approved catalog)
- Allowances / balances
- Overlap with other leave or with attendance `leave` status
- Cancellation and edit rules after approval
- Permissions and reporting
- Whether cancelled rows keep decision metadata (schema allows cancelled without
  the approved/rejected decision pair)

`leaveType` as unconstrained text is **schema capability**, not an approved type list.

### Decision

Blocked on **D-029**. Parent baseline remains D-019.

---

## 7. Patient document findings

### Required by source

Patient management names **upload patient documents**.

### Already approved

- **D-004 / ADR-004:** private Supabase Storage bucket; PostgreSQL metadata; backend
  authorization; short-lived signed operations; Render filesystem is not the store.
- Logical/physical model: metadata columns, statuses
  `pending` / `available` / `quarantined` / `deleted`, unique `objectKey`.
- Security architecture lists intended document controls (unguessable keys, signed
  ops after authorization, checksum, no public URLs). Those are **architecture
  intent**, not an approved size/MIME/role matrix.

### Existing implementation

- Table `patient_documents` only
- No storage client, env vars in `env.ts`, permissions, routes, or upload UI
- Patient detail still shows: “Patient document upload is deferred until the storage
  architecture is approved.” **ADR-004 is already accepted.** That UI sentence is
  stale documentation, not a new requirement. Reported, not fixed, in M15.

`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_DOCUMENT_BUCKET` appear in
deployment architecture and **are not loaded** by `backend/src/config/env.ts`.

### Still unspecified

| Area | Specified? |
| --- | --- |
| Private bucket | Architecture yes; not created/configured |
| Object key strategy | Architecture: unguessable, not the original filename. Exact prefix/layout not chosen |
| Metadata columns | Schema exists |
| Signed access | Architecture yes; TTL not chosen |
| Max file size | **No** (register operational target) |
| Allowed MIME/extensions | **No** |
| Document categories | Schema `varchar(50)`; **no approved catalog** |
| Filename rules | Architecture: display only; no extra rules |
| Duplicate handling | **No** |
| Malware scanning | Architecture: define before real-world files; **not chosen** |
| Who may upload / list / download / delete / replace | **No**. Must not reuse `patient.read` automatically |
| Delete vs replace vs metadata edit vs immutability | Status set exists; operating policy **No** |
| Retention | **No** |
| Access logging | Audit writes exist generally; document access events **not implemented** |
| Storage limits | **No** |

### Decision

Blocked on **D-030**. Do not implement until policy is sufficient. ADR-004 does not
un-block application work by itself.

---

## 8. User administration findings

### Required by source

- Login, logout, password management, roles and access control
- Named roles
- Administrator: **manage users, roles**, employees, doctors, departments, and
  schedules

M5 delivered login/RBAC/bootstrap, not a general `/users` API. That remains true.

### Existing implementation

| Capability | Status |
| --- | --- |
| Login / logout / refresh | Implemented |
| Password change (authenticated, current password) | Implemented; revokes refresh sessions |
| Session idle 30 minutes / absolute 7 days | Implemented |
| Account lockout after 5 failed logins / 15 minutes | Implemented |
| User statuses `pending` / `active` / `locked` / `disabled` | Schema only (application uses `active` + lock fields) |
| Role assignment | Bootstrap-admin assigns Administrator only |
| User creation | Bootstrap CLI only; no public registration |
| Employee ↔ user link | Administrator `employee.create` / `update` may set `userId` to an existing user UUID |
| Activation/deactivation API | None |
| Password reset / forgotten password | None |
| List/search users | None |
| Audit of bootstrap | Write exists (`identity.administrator_bootstrap`) |

Without a user-admin API, **non-administrator roles cannot be created through the
application**. Database tests insert users directly. Production/demo currently depends
on bootstrap plus any manual database inserts (not an approved workflow).

Linking `employees.userId` does not grant roles. Permissions remain role-based.
Mis-linking can attribute clinical D1 identity to the wrong employee; there is no
user picker because there is no user list API.

### Not specified

- Whether administrator-created users are in current scope (named “manage users”
  supports yes; workflow is unspecified)
- Initial password delivery
- Whether administrator may grant the Administrator role (privilege escalation)
- Self-service registration (almost certainly out of scope; not named)
- Forgotten-password identity verification (register already flags this)
- Deactivate vs disable vs lock
- Session revocation of other users by administrator

### Decision

Blocked on **D-031**. Do not invent a `/users` API until approved. Privilege-escalation
rules must be explicit.

---

## 9. Audit viewer findings

### Required by source

- NFR: **audit logs**
- Reliability: disaster recovery plan and **audit trail**
- Administrator role matrix: **view system reports and audit records**

The baseline therefore names **viewing**, not only storing, audit records. Export is
not named in the requirements analysis. Security architecture mentions “administrative
report exports when supported” as an audit *event*, not a required export product.

D-027 explicitly deferred audit-record viewing.

### Existing implementation

Append-only `audit_logs` with actor, action, resource type/id, outcome, request id,
JSONB metadata, optional source IP. Indexes exist for actor/time and resource/time.
`writeAudit` is used across auth and business modules. Metadata sampled from
appointments uses field names and status transitions, not document bytes or
passwords. There is **no** read API, `audit.read` permission, or UI.

Runtime update/delete of audit rows is not exposed as an application API.

### Not specified

- Roles besides Administrator
- Searchable fields and filters (actor, action, resource, date range, outcome)
- Pagination (existing max 100 is a technical bound if reused)
- Whether `metadata` JSON is shown, redacted, or omitted
- Export (CSV/PDF)
- Retention

### Decision

Blocked on **D-032**. Do not implement a viewer in this milestone.

---

## 10. Appointment calendar findings

### Required by source

- Appointment management: **provide a calendar-oriented appointment interface**
- Required UI: appointment screen for **scheduling, calendar display, and doctor
  selection**

### Already approved

Booking, cancel, reschedule, status, doctor selection, conflict exclusion (D-013,
D-021). Doctor/Nurse assigned-appointment access remains deferred by D-021 even though
D1 employee/doctor mapping now exists for clinical modules.

### Existing implementation

`AppointmentListPage` is a **paginated table** with filters: status, doctor, patient,
starts-from / starts-before. Create/detail/edit-reason, cancel, reschedule, and status
exist. Doctor schedules are explicit intervals, not a calendar widget. Schema indexes
support date/doctor queries (traceability “calendar appointment queries” at the
**data** layer).

There is no month/week grid, drag/drop, recurring appointments, or holiday calendar.

### Missing vs named UI wording

A true calendar visualization is **not** implemented. Whether the filtered table
satisfies “calendar-oriented” / “calendar display” is a product decision.

### Do not invent unless approved

Drag/drop, recurrence, week/month views, reschedule-by-drag, external calendars,
holiday management.

### Decision

Blocked on **D-033**.

---

## 11. Deployment findings

Separate:

1. **Application implementation** — M5–M14 code exists locally.
2. **Deployment configuration** — not present (`vercel.json`, Render blueprint, GitHub
   Actions: none).
3. **Operational reliability/runbook** — documented as target; not verified.

### Already approved

D-001 current-scope cloud deployment. ADR-005: React → Vercel, Express → Render,
PostgreSQL → Supabase, private storage on Supabase. Deployment architecture document
lists env names, release steps, CORS/cookie/HTTPS expectations.

The PDF listed cloud deployment as a future enhancement; **D-001 overrides that** for
this interview project.

### Existing configuration

- Local `.env.example` files for development
- `ALLOWED_ORIGINS`, JWT, cookie, timezone, currency in `env.ts`
- Production cookie flags in code: `Secure` + `SameSite=None` when `NODE_ENV=production`
- CSRF header required for cookie POSTs
- Startup does **not** run `prisma db push`
- Root script `prisma:migrate:deploy` exists for controlled migration
- Health endpoint returns static `{ status: 'ok', service: 'hms-api', timestamp }` and
  **does not** check PostgreSQL or Storage

Missing vs deployment architecture: `DIRECT_URL`, `SUPABASE_*` not in `env.ts`.
Nothing is deployed. Production URLs, CORS allowlist, `TRUST_PROXY`, cookie domain,
and secrets are operator inputs.

### Decision

**D-034** records remaining operating policy and verification. D-001 remains APPROVED
for *being in scope*. Do not deploy during M15. Do not claim production readiness.

Implementation-ready candidate (not started): **deployment scaffolding** (provider
project wiring and env contract) once D-034 operator values are supplied. That is not
the same as go-live or backup completeness.

---

## 12. Backup / disaster recovery findings

### Required by source

Daily automatic database backup, weekly full backup, high availability, data recovery,
disaster recovery plan, and audit trail.

### Classification

| Part | Whose job | Current state |
| --- | --- | --- |
| Application writing audit rows | Application | Implemented (write) |
| PostgreSQL backups | Supabase/platform + operator | **Not configured or verified** |
| Weekly full backup | Platform/operator | **Not verified**; free tiers may not meet this |
| Object storage backup | Platform + operator | N/A until documents exist; policy undefined |
| HA | Platform | **Not claimed**; free Render cold starts documented |
| Restore into non-production | Operator runbook | **Not written/tested** |
| RPO / RTO | Missing specification | Register operational targets |
| Independent logical export | Optional operator | Not scheduled |

Supabase **may** offer backups on some plans. That is **not** evidence that daily
automatic and weekly full backups, retention, encryption, or restore tests meet the
requirement. Do not mark backups implemented because a provider product exists.

### Decision

Blocked on **D-035** before production patient data. This is not an application feature
milestone.

---

## 13. Security regression findings

Read-only review of M5–M14. No code was changed. Nothing here is a reason to
implement remaining product modules without their gates.

### Critical

None identified for the current unreleased local application.

### High

1. **No application path to provision least-privilege users.** Only bootstrap-admin
   exists. Sharing the administrator account for a demo would concentrate privilege.
   This is a **control gap vs “manage users”**, not a broken JWT implementation.
2. **Production cross-site refresh cookies are unproven** on real Vercel/Render URLs
   (known ADR-003 / D-001 risk).

### Medium

1. **Resource-level “relevant patient / appointment / admission” filters are not
   enforced.** Doctors with `patient.read` can list all patients. Documented deferred;
   still a data-exposure risk once real data exists.
2. **Unauthenticated OpenAPI/Swagger** at `/api/docs` and `/api/v1/openapi.json`
   describes implemented endpoints. It does not bypass JWT, but it is reconnaissance
   surface if publicly deployed.
3. **Health check does not verify database connectivity.**
4. **Rate limiting is auth-endpoint-only** (login/refresh/change-password). Other
   routes rely on platform/network controls that are not configured.
5. **CORS allows missing `Origin`** on the general CORS callback (non-browser clients).
   Cookie CSRF still requires an allowlisted Origin plus `X-HMS-CSRF: 1`.

### Low

1. Frontend production bundle exceeds 500 kB (Vite warning). Not an auth issue.
2. Main navigation is a single horizontal toolbar; responsive usability risk.
3. Stale patient-document deferral message (architecture already accepted).
4. Employee `userId` can be set to any existing user UUID by Administrator without a
   user directory.
5. No repository CI, secret scanning, or dependency-scan gate (workflow planned).

### Informational

- Access token is in-memory only; no `localStorage` / `sessionStorage` token usage
  found.
- Refresh cookie: `HttpOnly`; production `Secure` + `SameSite=None`; path
  `/api/v1/auth`.
- JWT verified with issuer, audience, HS256, subject, `pva` password version.
- Passwords: Argon2id as documented.
- Lockout implemented.
- CSRF on cookie POSTs implemented.
- Helmet enabled; JSON body limit 1 mb.
- Pagination max page size 100; report range max 366 days; no unbounded export.
- Accountant lacks `patient.read`; billing DTOs are identification-only; reports use
  dedicated permissions.
- Pharmacist/laboratory isolation matches D-023 / D-024 / D-027.
- Prisma `$queryRaw` uses tagged templates (parameterized). No `prisma db push` at
  startup.
- `.env` gitignored; examples use placeholders.
- `npm audit --omit=dev`: 0 vulnerabilities at audit time.
- Audit metadata sampled does not store password hashes or document bytes.

**No blocking security finding requires a code fix before completing this audit.**
High items are policy/operational gaps, not exploitable implementation defects in the
reviewed auth core.

---

## 14. Open decision gates

All of the following are **PENDING USER APPROVAL**. None were approved in M15.
Existing **APPROVED** decisions (D-001–D-027) are unchanged.

Full option text is in `docs/requirements/decision-register.md`.

| ID | Question | Status |
| --- | --- | --- |
| D-019 remainder | Capture method, leave types, allowances, overlap (parent) | Partially superseded by D-028/D-029 gates; baseline statuses remain APPROVED |
| **D-028** | Attendance application policy | PENDING USER APPROVAL |
| **D-029** | Leave application policy | PENDING USER APPROVAL |
| **D-030** | Patient document application policy | PENDING USER APPROVAL |
| **D-031** | Operational user administration | PENDING USER APPROVAL |
| **D-032** | Audit record viewing | PENDING USER APPROVAL |
| **D-033** | Appointment calendar visualization | PENDING USER APPROVAL |
| **D-034** | Production deployment operating policy | PENDING USER APPROVAL |
| **D-035** | Backup and disaster-recovery operating policy | PENDING USER APPROVAL |

Deferred by prior approved decisions (not new gates): admission billing (D-025);
lab cancel/finalize/correct (D-023); pharmacy catalog write (D-024); doctor/nurse
appointment ownership (D-021); admission discharge/cancel grants (D-026); CSV/PDF
reports (D-027); PDF future enhancements.

---

## 15. Deferred items

| Item | Still deferred? | Evidence |
| --- | --- | --- |
| Patient document **implementation** | Yes | Table only; D-030 required |
| Attendance / leave **APIs** | Yes | Tables only; D-028 / D-029 |
| Audit **viewing** | Yes | D-027 deferral; D-032 required |
| Admission billing | Yes | D-025 |
| Insurance, SMS/email, mobile, portal, telemedicine, AI, biometrics | Yes | Requirements future enhancements |
| Bed / ward / transfer | Yes | D-009 / D-026 |
| Lab catalog write, cancel, finalize, correct | Yes | D-023 |
| Pharmacy catalog write, jobs, notifications | Yes | D-024 / D-027 |
| Tax / discount enabled | Yes | D-016 / D-025 |
| CSV/PDF report export | Yes | D-027 |
| Doctor/Nurse appointment ownership filter | Yes | D-021 |
| Admission discharge/cancel **grants** | Yes (ungranted by policy) | D-026 |
| Schedule recurrence / overlap policy | Yes | Organization module remainder |

---

## 16. Recommended implementation order (dependencies only)

This is not a quality ranking. Do not start implementation until the listed gate is
approved.

1. **D-031 User administration** — dependency for non-admin roles, leave approver
   identity, optional self-attendance, and document uploader diversity. Bootstrap-admin
   is insufficient for a multi-role system.
2. **D-034 Deployment scaffolding** — independent of remaining product modules; D-001
   already places it in scope. Operator secrets/URLs still required. Not go-live.
3. **D-033 Appointment calendar** — depends only on existing appointment data and
   D-033 visualization policy. Administrator already has appointment permissions.
4. **D-032 Audit viewing** — depends on existing `audit_logs` and D-032 sensitivity
   rules.
5. **D-030 Patient documents** — depends on D-030 policy plus storage credentials
   (D-034) and ADR-004.
6. **D-028 Attendance** — depends on employees (exist) and D-028 capture/permission
   rules; self-service would also need D-031.
7. **D-029 Leave** — depends on D-029 approval policy; approver users need D-031 if
   the approver is not the bootstrap administrator.
8. **D-035 Backup/DR** — before production patient data; parallel to any go-live
   under D-034.

**Implementation-ready candidate:** none of the remaining *functional* modules, because
each still has a pending gate. Closest approved-scope technical work is **deployment
scaffolding under D-001/ADR-005**, which still needs D-034 operator values and must
not claim D-035 backups.

---

## 17. Explicit statement of no implementation

M15 performed a read-only audit. It did **not**:

- modify application source, Prisma schema, or migrations
- add permissions, routes, UI, or tests
- install packages or change configuration
- create verification users
- deploy, commit, or push
- implement attendance, leave, documents, user administration, audit viewer,
  appointment calendar, backups, or new reports

The only intended repository change is this audit document and pending decision-gate
entries in the decision register.

---

## 18. Remaining blockers

1. User approval of D-028 through D-035 (as applicable to the next milestone).
2. `Hospital_system.pdf` still absent; if wording differs from the approved analysis,
   the PDF remains primary when it is available.
3. No production environment, backup evidence, or cookie proof.
4. Legal/compliance, retention, and performance SLOs remain unspecified; do not claim
   them.
5. After M15, wait for the project owner to approve gates before any implementation
   milestone.

---

## Hallucination control (summary)

| Item | Classification |
| --- | --- |
| Record attendance / maintain leave / upload documents / manage users / view audit / calendar display / named reports | **Required by source** (approved analysis) |
| D-001–D-027, ADR-003–005, D-019 status sets | **Already approved** |
| Tables `attendance_records`, `leave_records`, `patient_documents`; audit writes; appointment table UI; M14 reports | **Existing implementation** (schema or code as noted) |
| Pagination max 100, UUID keys, signed URL TTL if documents proceed | **Reasonable technical implementation detail** only after the parent requirement is approved |
| Clock-in biometrics, leave balances, MIME allowlist, drag/drop calendar, forgotten-password email | **Not specified** |
| Admission billing, lab correct, CSV exports, PDF future enhancements | **Deferred** |
