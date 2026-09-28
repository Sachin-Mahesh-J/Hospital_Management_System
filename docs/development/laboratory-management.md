# Laboratory Management

Status: Implemented (Milestone 10, D-023)

## Scope

This module supports laboratory test requests, per-item sample collection,
textual result entry, and an on-screen printable report. The laboratory test
catalog is read-only. Catalog rows are supplied by reviewed seed or manual
insert, not by an application write API.

The Prisma schema and initial migration were not changed.

## API and layers

Versioned endpoints:

- `GET /api/v1/lab/tests`
- `GET/POST /api/v1/lab/requests`
- `GET /api/v1/lab/requests/:id`
- `POST /api/v1/lab/requests/:id/items/:itemId/sample`
- `POST /api/v1/lab/requests/:id/items/:itemId/results`

There is no request PATCH, cancel, result PATCH, finalize, correct, catalog
write, or stored-report endpoint. The printable report is assembled on the
frontend from request detail.

Routes authenticate and authorize before controllers run. Controllers handle HTTP,
services enforce identity mapping, lifecycle, and audit rules inside Prisma
transactions, repositories own Prisma queries plus `FOR UPDATE` locks, and Zod
`.strict()` schemas reject unknown or invalid input.

## Author identity

JWT/session identity is unchanged. Laboratory writes derive identity from the
database:

- Requesting doctor: authenticated user → employee → active `doctor_profiles`
  with `employees.employment_status = active`
- Sample collector and result enterer: authenticated user → `employees.user_id`
  with `employment_status = active`

Client-supplied `requestedByDoctorId`, collector IDs, and enterer IDs are
rejected. Unlinked accounts receive a conflict response. Identity is not added
to the JWT.

## Request lifecycle

Approved statuses: `requested`, `sample_collected`, `in_progress`, `completed`,
`cancelled`.

Item workflow in this milestone:

- create: each item starts as `requested`
- sample collection: `requested` → `sample_collected`
- result entry: `sample_collected` → `completed`

Items are not moved to `in_progress` or `cancelled`. Cancellation is not
implemented.

Parent request status is a stored aggregate recomputed in the same transaction:

- `completed` when every item is `completed`
- `requested` when every item is `requested`
- `sample_collected` when every item is `sample_collected`
- `in_progress` for every other combination

`clinical_note` may be set at creation and is then immutable. Duplicate
`test_definition_id` values on one request are allowed. New items must reference
active tests. Existing patients are sufficient, including inactive or deceased
patients. An optional medical record must exist and belong to the same patient
when supplied. Appointments and admissions are not required.

## Results and reports

Result entry stores version 1 with a nonblank `result_value`, optional
`result_unit`, optional `reference_range_snapshot`, and optional `result_note`.
`finalized_*` remain null. Results are not patched, finalized, or superseded in
this milestone. D-014 storage remains for a later correction workflow.

The report is an on-screen view of persisted fields: patient number and name;
test code and name; result value; unit and note when present; requested time and
requesting doctor; collection time and collector when present; entered time and
enterer when present; request and item status; optional clinical note. Hospital
name, specimen type, reference range, and price are not report fields. Printing
uses the browser print dialog.

## Permissions

| Permission | Administrator | Doctor | Nurse | Receptionist | Laboratory Staff | Pharmacist | Accountant |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `lab_test.read` | no | yes | no | no | no | no | no |
| `lab_request.read` | yes | yes | yes | no | yes | no | no |
| `lab_request.create` | no | yes | no | no | no | no | no |
| `lab_sample.collect` | no | no | no | no | yes | no | no |
| `lab_result.enter` | no | no | no | no | yes | no | no |

There is no `lab_request.update`, `lab_request.cancel`, `lab_result.read`,
`lab_result.create`, `lab_result.update`, `lab_result.finalize`,
`lab_result.correct`, `lab_test.create`, or `lab_report.read`. Request detail and
the print report use `lab_request.read`. `patient.read` is not laboratory
access. Lists are permission-wide with no ownership filter.

The backend enforces every assignment. Frontend route and control gating is
usability only. Re-run `npm run sync:permissions -w backend` (or
`npm run bootstrap:admin -w backend` when bootstrap environment variables are
present) to grant these permissions on an existing database.

## Frontend

Routes:

- `/laboratory` — list (`lab_request.read`)
- `/laboratory/new` — create (`lab_request.create`)
- `/laboratory/:requestId` — detail (`lab_request.read`)
- `/laboratory/:requestId/report` — on-screen report (`lab_request.read`)

AppShell shows Laboratory when the user has `lab_request.read`. Sample collection
and result entry controls require `lab_sample.collect` and `lab_result.enter`.
Patient detail is not changed.

TanStack Query keys:

- `['laboratory', 'tests', filters]`
- `['laboratory', 'requests', filters]`
- `['laboratory', 'request', id]`

Creates, sample collection, and result entry invalidate list and detail queries.

## Audit and logging

Successful writes record `lab_request.create`, `lab_request.sample_collect`, and
`lab_result.enter`. Metadata may include resource IDs, item count, version
number, and status transitions. Result values, result notes, clinical notes, and
reference-range snapshots are not written to audit metadata. Pino redaction
covers those request-body fields. Report viewing is not a separate audit event.

## Testing

Normal unit/frontend tests run with `npm test`. Database-backed API authorization
and workflow tests run only through `npm run test:database`; the guarded runner
creates and uses local `hms_test` and refuses production, Supabase, or
`hms_development` as a test target.

## Deferred / pending policy

The following remain unresolved and are not implemented:

- Request cancellation
- Ordinary request PATCH / clinical-note editing
- Result editing, finalization, and D-014 correction/supersede APIs
- Catalog administration
- Appointment or admission linkage
- Sample identifiers, specimen rejection, recollection, barcode/QR
- Structured numeric results, reference-range engines, abnormal/critical flags
- Stored PDF reports, attachments, signatures, notifications
- Billing / laboratory charges
- Laboratory dashboard analytics and LIS integration
- Own-patient / department / assigned-staff authorization
- Patient-detail laboratory history
- Employee/doctor identity as a JWT/session claim
