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
That value satisfies the unique `patient_number` constraint and concurrent
registration safety. A hospital-facing display format remains an open business policy.

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

## Ambiguities that do not block the architecture baseline

These require a decision before implementing their affected module:

- Final patient-number display format, duplicate detection, emergency-contact
  validation, and consent. Patient Management currently uses interim `P-<UUID>`
  numbers and does not implement fuzzy duplicate matching.
- Doctor appointment duration, availability recurrence, breaks, schedule-entry overlap,
  and cancellation policy. Active doctor/patient booking conflicts and status values are
  resolved by D-013 and D-017.
- Admission cancellation policy and discharge-content requirements. Status values and
  optional responsible clinician storage are resolved.
- Clinical note/report formats, sign-off permissions, and nurse write authority.
  Amendment storage is resolved by D-014.
- Laboratory catalogs, units, reference ranges, finalizer eligibility, and structured
  result validation. Corrected-result versioning is resolved by D-014.
- Pharmacy receiving, stock thresholds, adjustment authorization, damaged stock, and
  expired stock disposal. Canonical units and full dispensing reversal are resolved by
  D-015 and D-020.
- Enabled tax/discount rules, payment methods, billing idempotency/granularity, invoice
  numbering, receipt format, revenue recognition, and default currency. Partial
  payments, overpayment rejection, and linked reversals are resolved by D-016.
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
