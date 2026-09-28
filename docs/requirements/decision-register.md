# Decision and Ambiguity Register

Status: Baseline for architecture and logical data design

## Decisions approved for the foundation

### D-001 — Deployment is current scope

The PDF describes cloud deployment as a future enhancement, but the project brief
requires Vercel, Render, and Supabase from the start. Cloud-compatible configuration is
therefore current scope.

### D-002 — Modular monolith

The backend will be one Express deployment organized into cohesive modules. This keeps
transactions and deployment understandable while preserving internal boundaries.
Microservices are not justified by the specified scale or interview scope.

### D-003 — Authentication lifecycle

Use short-lived JWT access tokens plus rotating refresh sessions. Access tokens remain
in frontend memory. Refresh tokens use a `Secure`, `HttpOnly` cookie and are stored only
as hashes server-side. Logout revokes the refresh session.

### D-004 — Document storage

Store patient files in a private Supabase Storage bucket. PostgreSQL stores controlled
metadata only. Access requires backend authorization and short-lived signed operations.
The Render filesystem is not durable storage.

### D-005 — Identity and roles

Operational users are separate from patients. A user may link to an employee record and
may hold multiple roles. Permissions are explicit and enforced server-side.

### D-006 — Identifiers

Use UUID primary keys. Externally meaningful patient, employee, invoice, and similar
numbers are separate unique business identifiers. Their final display formats are
configuration/business policy, not primary keys.

Patient Management currently allocates an interim unique `P-<UUID>` patient number.
Employee Management currently allocates an interim unique `E-<UUID>` employee number.
Admission Management currently allocates an interim unique `ADM-<UUID>` admission
number under D-026. Those values satisfy the unique business-number constraints and
concurrent registration safety. Hospital-facing display formats remain an open
business policy.

### D-007 — Time and timezone

Persist timestamps in UTC. Require an IANA hospital timezone configuration for schedule,
“today,” expiry, and report boundaries. Do not infer the hospital timezone from the
server.

### D-008 — Money

Persist amounts as fixed-precision decimal values with an ISO 4217 currency code. Never
use binary floating point. The hospital's default currency remains configuration.

### D-009 — Outpatient and inpatient representation

Outpatient care uses appointments and medical records; it does not require a separate
outpatient entity. Inpatient care uses a minimal admission record. Bed, ward, transfer,
and room-allocation modules are excluded until explicitly required.

### D-010 — Historical records

Clinical, audit, inventory, and financial history must not be cascade-deleted. Use
status/deactivation for master data and controlled correction or reversal records for
material history.

### D-011 — Repository source of truth

GitHub is the primary writable repository and eventual CI source. Bitbucket, if needed,
is a one-way mirror rather than a second development source.

### D-012 — Patient registration baseline

Require patient first and last names. Date of birth may be unknown or recorded with
`exact`, `month`, or `year` precision. Sex at registration is nullable and, when
provided, uses `female`, `male`, `intersex`, `unknown`, or `not_disclosed`. This supports
incomplete real-world registrations without inventing wider demographic requirements.

### D-013 — Appointment conflict scope

Use concrete UTC start/end intervals and database-enforced exclusion constraints to
prevent active appointment overlaps for both the doctor and the patient. `scheduled`
and `checked_in` are active for conflict purposes. Schedule-fit validation and the
appointment write occur in one application transaction.

### D-014 — Clinical and laboratory history

Use a medical-record container with separate diagnosis, treatment, and medical-report
child tables. Finalized medical records are corrected through linked amendments.
Laboratory results use append-oriented versions linked to the requested test; finalized
corrections create a superseding result instead of overwriting clinical history.

### D-015 — Canonical pharmacy units

Each medicine has one canonical inventory unit. Batches, movements, prescribed
quantities, and dispensing use that unit, with the unit copied as a historical snapshot
where needed. Unit conversion is outside the current scope.

### D-016 — Billing and payment baseline

An invoice uses one ISO currency and allows partial payments. Overpayments are rejected.
Tax and discount amounts exist as zero-default structural fields but are not enabled
without policy approval. Payment reversals are linked records. Refund behavior beyond
reversing a recorded payment is outside the baseline.

### D-017 — Baseline workflow statuses

Approve the bounded status sets proposed by the logical model for users, departments,
employment, doctors, schedules, appointments, admissions, medical records,
prescriptions, laboratory work, medicines/batches, invoices, payments, attendance, and
leave. Any future state or transition is a reviewed schema/domain-policy change.

### D-018 — Monetary physical precision

Store money as `numeric(19,4)` with an ISO 4217 currency code. Application services
apply the configured currency's rounding policy; binary floating point is prohibited.

### D-019 — Staff workflow baseline

Attendance uses `present`, `absent`, or `leave` with one row per employee and local work
date. Leave uses `requested`, `approved`, `rejected`, or `cancelled` and retains decision
actor/time metadata. Capture method, leave types, allowances, and overlap policies
remain unresolved.

### D-020 — Dispensing reversal and stock movement

Normal dispense records remain immutable with the single `completed` status. A full
dispensing reversal is an explicit `dispense_reversals` record linked one-to-one to the
original dispense and records the quantity, required reason, responsible user, and
reversal time. Partial reversals are excluded. The reversal transaction appends positive
`return` stock movements that mirror every original negative `dispense` movement by
medicine batch and quantity; neither the original dispense nor its movements are
modified. This decision introduces no automatic invoice or payment reversal behavior.

### D-021 — Appointment management authorization and workflow

Administrator and Receptionist receive `appointment.read`, `appointment.create`,
`appointment.update`, `appointment.cancel`, `appointment.reschedule`, and
`appointment.status.update`. Doctor, Nurse, Laboratory Staff, Pharmacist, and
Accountant receive no appointment permissions in this milestone. Doctor/Nurse
assigned-appointment access is deferred until authenticated-user → employee → doctor
identity mapping can be enforced without a fake ownership check.

Status transitions are: `scheduled` → `checked_in` | `no_show`; `checked_in` →
`completed`; cancellation from `scheduled` or `checked_in` only, through the cancel
operation. `completed`, `cancelled`, and `no_show` are terminal. Ordinary `PATCH`
updates `reason` only. Booking and rescheduling require an active doctor profile and
active employment status; patient existence is sufficient. There is no default
duration and no past-booking prohibition.

### D-022 — Medical records and prescriptions authorization and workflow

Administrator receives `medical_record.read` and `prescription.read` only.
Doctor receives medical-record read/create/update/finalize/amend, prescription
read/create/cancel, and `medicine.read`. Nurse receives medical-record and
prescription read. Pharmacist receives `prescription.read`. Receptionist,
Laboratory Staff, and Accountant receive no medical-record or prescription
permissions. Diagnosis, treatment, and report writes use the parent medical-record
permissions. `patient.read` is not medical-record access.

Clinical author identity uses D1: the server derives `author_employee_id` from
`users.id` → `employees.user_id`, and `prescribed_by_doctor_id` from that employee’s
active doctor profile with active employment. Client-supplied author or prescriber
IDs are rejected. Identity is not added to the JWT in this milestone.

Medical-record statuses: `draft` → `final`; `final` → `amended` through amendment.
Draft children may be replaced. Final/amended content is immutable. Amendment
creates a finalized successor, marks the predecessor `amended`, preserves
predecessor content, requires the same patient and a later `occurred_at`, and
allows chains. Care context remains optional (C1). Prescriptions require a final
medical record, at least one item, canonical medicine units, and start as `active`.
The only prescription transition in this milestone is `active` → `cancelled`.
Medicine catalog access is read-only for active medicines.

### D-023 — Laboratory management authorization and workflow

L-001 through L-026 are approved as the Milestone 10 implementation policy and
are implemented in the laboratory module. Catalog write, cancellation, ordinary
request PATCH, result PATCH, finalization, correction, billing snapshots, PDF
file generation, and patient-detail laboratory history remain out of this
milestone. The Prisma schema and initial migration are unchanged. Full context:
`docs/development/laboratory-management.md`.

Permissions (L-003, L-005, L-006, L-025):

| Permission | Administrator | Doctor | Nurse | Receptionist | Laboratory Staff | Pharmacist | Accountant |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `lab_test.read` | no | yes | no | no | no | no | no |
| `lab_request.read` | yes | yes | yes | no | yes | no | no |
| `lab_request.create` | no | yes | no | no | no | no | no |
| `lab_sample.collect` | no | no | no | no | yes | no | no |
| `lab_result.enter` | no | no | no | no | yes | no | no |

There is no `lab_request.update`, `lab_request.cancel`, `lab_result.update`,
`lab_result.finalize`, `lab_result.correct`, `lab_test.create`, or separate
`lab_report.read`. Request detail and the print report use `lab_request.read`.
`patient.read` is not laboratory access. Lists are permission-wide with no
doctor/nurse/lab-staff ownership filter (L-004). Nested test names on a request
are part of `lab_request.read`; doctors use `lab_test.read` only to select tests
when creating a request.

Identity uses D1 (L-022): the server derives `requested_by_doctor_id` from the
authenticated user’s active doctor profile with active employment, and derives
collector and result-enterer from `users.id` → `employees.user_id` with active
employment. Client-supplied doctor or employee actor IDs are rejected. Unlinked
accounts receive a conflict response. Identity is not added to the JWT.

Create requires an existing patient (inactive or deceased patients are not
rejected), at least one item, and active test definitions. Duplicate
`test_definition_id` values on one request are allowed. `medical_record_id` is
optional; when present the record must exist and belong to the same patient.
Requests do not require an appointment or admission. `clinical_note` may be set
on create and is then immutable. Header fields are not patched. Item
`price_snapshot` and `currency` remain null. Optional catalog specimen, unit,
reference-range, and price fields are not required and are not copied onto
requests or results. The test catalog is read-only for active tests; catalog
rows are supplied by reviewed seed or manual insert, not by a write API.

Item transitions (L-009, L-010, L-011, L-013, L-014):

- `requested` → `sample_collected` through sample collection
- `sample_collected` → `completed` through result entry

Collection records only `sample_collected_at` (server time) and
`sample_collected_by_employee_id`. Result entry stores a nonblank text
`result_value` with optional `result_unit`, optional `reference_range_snapshot`,
and optional `result_note` as version 1.
This milestone does not set item status to `in_progress` or `cancelled`, does
not collect twice, does not enter a result before collection, and does not
accept a second result for the same item.

Request status is a stored aggregate recomputed in the same transaction:

- `completed` when every item is `completed`
- `requested` when every item is `requested`
- `sample_collected` when every item is `sample_collected`
- `in_progress` for every other combination

`cancelled` remains a legal D-017 value but has no operation in this milestone.

Entered results are not patched, not finalized (`finalized_*` stay null), and
not superseded in this milestone. D-014 storage remains for a later correction
workflow. A laboratory report is an on-screen view assembled from the request,
items, and current results, using browser print. It is not a stored document
and not a generated PDF file. Report content is limited to persisted fields:
patient number and name; test code and name; result value; unit and note when
present; requested time and requesting doctor; collection time and collector
when present; entered time and enterer when present; request and item status;
optional clinical note when present. Hospital name, specimen type, reference
range, and price are not report fields.

Selected L-series options: L-001 A, L-002 A, L-003 matrix above, L-004 A,
L-005 A, L-006 A, L-007 A, L-008 A, L-009 graph above, L-010 A, L-011 A,
L-012 A, L-013 A, L-014 A, L-015 no in-place edit and no extra versions this
milestone, L-016 C, L-017 B, L-018 A, L-019 persisted-fields list above,
L-020 A, L-021 A, L-022 A, L-023 A, L-024 A, L-025 A, L-026 A.

### Laboratory Management — resolved audit IDs (Milestone 10)

These IDs are approved by D-023. They are retained for traceability.

| ID | Selected option |
| --- | --- |
| L-001 | A — read-only catalog API; seed/manual rows; no catalog write API |
| L-002 | A — optional catalog fields unused and not required |
| L-003 | Permission matrix in D-023 |
| L-004 | A — permission-wide visibility; no ownership filter |
| L-005 | A — Nurse has no laboratory write |
| L-006 | A — Administrator laboratory read only (`lab_request.read`) |
| L-007 | A — optional `medical_record_id`; same-patient check when present |
| L-008 | A — existing patient only; no appointment/admission requirement |
| L-009 | Item `requested` → `sample_collected` → `completed`; request aggregate as in D-023 |
| L-010 | A — independent items; parent status is the documented aggregate |
| L-011 | A — no cancel operation this milestone |
| L-012 | A — header immutable after create except lifecycle commands |
| L-013 | A — collection timestamp and collector only |
| L-014 | A — text `result_value` with optional unit, reference-range snapshot, and note |
| L-015 | No result PATCH and no additional versions this milestone |
| L-016 | C — no finalize step; `finalized_*` remain null |
| L-017 | B — defer D-014 correction/supersede |
| L-018 | A — on-screen assembled report and browser print |
| L-019 | Persisted identifying and result fields only; no invented hospital header |
| L-020 | A — leave price snapshot null until billing |
| L-021 | A — duplicate tests on one request allowed |
| L-022 | A — extend D1; reject client-supplied actor IDs |
| L-023 | A — existing patient id is sufficient |
| L-024 | A — new items must reference `active` tests |
| L-025 | A — completed results use `lab_request.read` |
| L-026 | A — no laboratory list on patient detail this milestone |

### D-024 — Pharmacy management authorization and workflow

D-024 is APPROVED and is the Milestone 11 pharmacy policy. It supersedes the
previously pending pharmacy alternatives (P-001–P-023) as active policy. Those
IDs remain traceability references only.

Permissions:

| Permission | Administrator | Doctor | Nurse | Receptionist | Laboratory Staff | Pharmacist | Accountant |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `medicine.read` | no | yes | no | no | no | yes | no |
| `inventory.read` | yes | no | no | no | no | yes | no |
| `stock.receive` | no | no | no | no | no | yes | no |
| `stock.adjust` | yes | no | no | no | no | yes | no |
| `stock.movement.read` | yes | no | no | no | no | yes | no |
| `prescription.read` | yes | yes | yes | no | no | yes | no |
| `prescription.dispense` | no | no | no | no | no | yes | no |
| `prescription.reverse` | yes | no | no | no | no | yes | no |

The medicine catalog remains application-read-only. Available stock is derived
from append-only stock movements. Duplicate `(medicine_id, batch_number)`
receiving is rejected under the existing unique constraint. Adjustments require
a reason and cannot reduce available stock below zero. Expiry is batch-level and
is checked against `HOSPITAL_TIMEZONE`; there is no expiry job.

Pharmacy owns `active → partially_dispensed → dispensed`. Partial dispensing is
allowed. Remaining quantity is prescribed minus effective unreversed dispensed
quantity. Dispensing identity uses D1. Batches are selected automatically using
a documented technical ordering, not FIFO/FEFO hospital policy. D-020 full
reversal remains unchanged and does not reverse invoices or payments. Billing
writes and reports/analytics are out of this milestone.

Full context: `docs/development/pharmacy-management.md`.

### D-025 — Billing and payments policy

D-025 is APPROVED and is the Milestone 12 billing policy. It specializes D-016
for application behavior without changing the physical schema.

Permissions:

| Permission | Administrator | Doctor | Nurse | Receptionist | Laboratory Staff | Pharmacist | Accountant |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `invoice.read` | yes | no | no | no | no | no | yes |
| `invoice.create` | no | no | no | no | no | no | yes |
| `invoice.update` | no | no | no | no | no | no | yes |
| `invoice.issue` | no | no | no | no | no | no | yes |
| `invoice.void` | yes | no | no | no | no | no | yes |
| `payment.read` | yes | no | no | no | no | no | yes |
| `payment.create` | no | no | no | no | no | no | yes |
| `payment.reverse` | yes | no | no | no | no | no | yes |

`invoice.update` applies to draft invoices only. Accountant is not granted
`patient.read` or clinical, appointment, laboratory, or pharmacy permissions.
Billing-safe lookup exposes patient identification needed to invoice, not
clinical data.

Invoice numbers are server-generated `INV-<UUID>`. Payment numbers are
server-generated `PAY-<UUID>`. Lifecycle is `draft → issued → partially_paid →
paid`, with `void` from any of those states. Issued invoices are financially
immutable. Partial and multiple payments are allowed; overpayment is rejected.
Tax and discount remain zero. Currency is the configured `DEFAULT_CURRENCY`.
Payment methods are `cash`, `card`, and `bank_transfer`. Effective payment
states are `recorded` and `reversed`.

Billable sources are completed appointments (accountant-entered consultation
price), completed laboratory items with a non-null catalog price, and
unreversed pharmacy dispenses using weighted-average batch sale price. One
invoice line per dispense. Admission billing is deferred. Duplicate laboratory
and pharmacy charges on non-void invoices are rejected. Consultation uniqueness
is not invented.

Payment reversal is the existing linked reversal record with a required reason.
M11 stock reversal and M12 financial reversal remain independent. Receipts are
on-screen printable views using `payment_number`; stored PDFs are not
implemented.

Full context: `docs/development/billing-management.md`.

### D-026 — Inpatient and admission management

D-026 is APPROVED and is the Milestone 13 admission policy. It specializes D-009
and D-017 for application behavior. The physical `admissions` table is reused.
The only schema addition is a partial unique index enforcing one `admitted` row
per patient.

Permissions:

| Permission | Administrator | Doctor | Nurse | Receptionist | Laboratory Staff | Pharmacist | Accountant |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `admission.read` | no | no | yes | yes | no | no | no |
| `admission.create` | no | no | no | yes | no | no | no |
| `admission.update` | no | no | no | no | no | no | no |
| `admission.discharge` | no | no | no | no | no | no | no |
| `admission.cancel` | no | no | no | no | no | no | no |

Administrator and Doctor receive no admission permissions. Nurse can read.
Receptionist can read and create. Update, discharge, and cancel exist as
backend operations and remain ungranted to current roles.

Lifecycle is only `admitted → discharged` and `admitted → cancelled`. Both
terminal states are irreversible. Admission numbers are server-generated
`ADM-<UUID>`. `admittedAt` and `dischargedAt` are server time. Active and
inactive patients may be admitted; deceased patients are rejected. Attending
doctor is optional, must be an active doctor profile with an active employee
when supplied, and may change only while admitted. Cancellation reason is stored
in audit metadata; the admission `reason` is preserved. Discharge requires a
nonblank summary. Outpatient care remains appointments plus medical records.
Admission billing remains deferred under D-025.

Full context: `docs/development/inpatient-outpatient-management.md`.

### D-027 — Reports and dashboard application policy (Milestone 14)

```text
APPROVED
```

M14 implements read-only patient, appointment, revenue, pharmacy, laboratory, and
staff reports plus the named dashboard metrics as query models over existing
operational tables. Implementation is documented in
`docs/development/reports-and-dashboard.md`. No reporting tables, materialized
views, CSV/PDF generation, attendance/leave reports, or extra KPIs are in scope.

#### Selected options

1. **Report types.** All six named reports are in this slice. Staff reports use
   existing employee, department, and doctor master data only. Attendance and
   leave are excluded because those workflows are not implemented.
2. **Permissions.** Dedicated codes, not operational reuse:
   `report.patient.read`, `report.appointment.read`, `report.revenue.read`,
   `report.pharmacy.read`, `report.laboratory.read`, `report.staff.read`.
3. **Role grants.** Administrator receives all six. Accountant receives only
   revenue. Laboratory Staff receives only laboratory. Pharmacist receives only
   pharmacy. Doctor, Nurse, and Receptionist receive none.
4. **Columns.** Minimum necessary administrative fields already present on the
   source models. Reports omit passwords, sessions, tokens, unnecessary contact
   details, clinical notes, prescription content, laboratory result values, and
   raw Prisma internals.
5. **Filters and dates.** Date-based reports require hospital-local `from`/`to`
   calendar dates, converted to half-open UTC `[start, end)` using D-007.
   Inclusive span is at most 366 days. Inverted ranges are rejected. Pagination
   reuses the existing page size maximum of 100.
6. **Output.** On-screen views and browser print only. No CSV, generated PDF,
   stored report files, email, or SMS.
7. **Dashboard metrics.** Exactly: total patients, today’s appointments, revenue
   summary, laboratory requests, pharmacy alerts. Visibility follows the same
   report permissions. Unauthorized metrics are omitted, not zeroed.
8. **Revenue.** Effective recorded payments that are not reversal rows and that
   belong to non-void invoices, in the configured hospital currency. Invoice
   totals, drafts, unpaid issued invoices, reversed payments, and void-invoice
   payments are excluded. Partial payments count only their effective amount.
9. **Pharmacy alerts.** Near-expiry = unexpired batches with remaining stock
   whose expiry date is within 30 hospital-local days. Low-stock = current M11
   stock `<= medicines.low_stock_threshold`. Threshold `0` (schema default) is
   treated as no meaningful threshold and is not classified as low-stock.
   Expired remaining stock is counted separately on the pharmacy report and is
   not near-expiry. No jobs or notifications.
10. **Staff reports** exclude attendance and leave.
11. **Query bounds.** Required date range for appointment, revenue, and
    laboratory reports; pagination on all list reports; database-side
    aggregation for summaries.

#### Database

No migration. Existing tables and indexes are used.

#### Explicitly not in this decision

- Admission billing (remains D-025)
- Patient document upload
- Attendance/leave application APIs (remain blocked on remaining D-019 items)
- CSV/PDF export, stored reports, email/SMS reports
- Advanced analytics, forecasting, AI
- Audit-record viewing

## Ambiguities that do not block the architecture baseline

These require a decision before implementing their affected module:

- Final patient-number display format, duplicate detection, emergency-contact
  validation, and consent. Patient Management currently uses interim `P-<UUID>`
  numbers and does not implement fuzzy duplicate matching.
- Doctor appointment duration defaults, availability recurrence, breaks, schedule-entry
  overlap, and holiday calendars. Explicit start/end booking, active doctor/patient
  conflicts, appointment cancellation/reschedule eligibility, and status transitions
  are resolved by D-013, D-017, and D-021.
- Admission cancellation history, discharge checklists, and resource-level
  “relevant admission” filters. Status values, optional attending doctor,
  numbering, eligibility, permissions, one-active-admission cardinality, and
  terminal lifecycle transitions are resolved by D-017 and D-026. Milestone 13
  implementation is documented in
  `docs/development/inpatient-outpatient-management.md`.
- Clinical note/report formats, sign-off permissions, and nurse write authority.
  Amendment storage is resolved by D-014.
- Laboratory catalog write APIs, structured numeric/qualitative result validation,
  reference-range engines, finalizer eligibility, cancellation, and result
  correction. Milestone 10 application policy is D-023. Corrected-result **storage**
  remains D-014 for a later workflow.
- Pharmacy stock thresholds, damaged-stock disposal operating policy, and
  near-expiry alerts. Canonical units, full dispensing reversal, receiving,
  adjustments, derived inventory, partial dispensing, and pharmacy permissions
  are resolved by D-015, D-020, and D-024.
- Revenue recognition, report columns, and dashboard analytics. Tax remains disabled,
  discount remains disabled, payment methods, invoice/payment numbering, printable
  on-screen receipts, default currency configuration, consultation/laboratory/pharmacy
  billing grain, and linked payment reversal are resolved by D-016 and D-025.
  Admission billing, insurance, credit accounts, interest, FX, payment gateways,
  stored PDF receipts, and a generic idempotency framework remain deferred.
- Attendance capture/correction method, leave types, allowances, overlap rules, and
  approval operating policy. Baseline states and decision metadata are resolved by
  D-019.
- Exact report columns, filters, date periods, exports, and revenue recognition.
- Password-reset identity verification beyond authenticated change and administrator
  reset.

## Operational requirements needing measurable targets

- Expected concurrent users.
- Target API latency and representative workload.
- Availability objective.
- Recovery point objective and recovery time objective.
- Data-retention periods.
- Upload size and allowed document types.
- Audit-log retention.

## Legal and compliance gap

The specification does not identify jurisdiction, healthcare/privacy regulations,
consent rules, data residency, or breach-notification obligations. The project will use
security-conscious practices but must not claim HIPAA, GDPR, or other certification or
compliance without defined obligations and evidence.

## Deployment risks to validate early

- Cross-site refresh cookies between platform-provided Vercel and Render domains may be
  affected by browser third-party-cookie controls. Validate this before completing
  authentication; consider a same-origin Vercel API proxy if needed.
- Free Render services may cold-start.
- Free Supabase plans may not satisfy daily backup, weekly full backup, retention, or
  high-availability requirements.
- Provider limits and restore procedures must be recorded and tested rather than
  assumed.

## Change-control rule

A new decision receives an identifier, context, selected option, rationale, consequence,
and affected modules. A requirement change that alters security, the data model, or
deployment must be approved before implementation.
