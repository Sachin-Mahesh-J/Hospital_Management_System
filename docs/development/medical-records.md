# Medical Records and Prescriptions

Status: Implemented (Milestone 9)

## Scope

This module supports medical-record drafts, clinical children (diagnoses,
treatments, and medical reports), finalization, linked amendments, prescriptions
created from finalized records, prescription cancellation, and a read-only
active-medicine catalog for prescribing.

The Prisma schema and initial migration were not changed.

## API and layers

Versioned endpoints:

- `GET/POST /api/v1/medical-records`
- `GET/PATCH /api/v1/medical-records/:id`
- `POST /api/v1/medical-records/:id/finalize`
- `POST /api/v1/medical-records/:id/amend`
- `GET/POST /api/v1/prescriptions`
- `GET /api/v1/prescriptions/:id`
- `POST /api/v1/prescriptions/:id/cancel`
- `GET /api/v1/medicines`

Routes authenticate and authorize before controllers run. Controllers handle HTTP,
services enforce identity mapping, lifecycle, care-context, and audit rules inside
Prisma transactions, repositories own Prisma queries plus `FOR UPDATE` locks, and
Zod schemas reject unknown or invalid input. There is no medical-record or
prescription deletion endpoint and no prescription-item PATCH.

## Author identity

JWT/session identity is unchanged. Clinical writes derive identity from the
database:

- Medical-record author: authenticated user → `employees.user_id` → employee id
- Prescribing doctor: authenticated user → employee → active `doctor_profiles`
  with `employees.employment_status = active`

Client-supplied `authorEmployeeId` and `prescribedByDoctorId` are rejected.
Unlinked Doctor accounts receive a conflict response rather than a fake ownership
check.

## Medical-record lifecycle

Approved statuses: `draft`, `final`, `amended`.

- Draft records may replace diagnoses, treatments, and reports and may change
  `occurredAt` and optional appointment/admission context.
- `patientId` and `authorEmployeeId` are immutable after creation.
- Finalization is allowed only from `draft` and requires at least one diagnosis,
  treatment, or medical report. `finalizedAt` is set by the server.
- Final records are immutable. Corrections use amendment.
- Amendment marks the predecessor `amended`, preserves its clinical content, and
  creates a finalized successor linked by `amends_medical_record_id`. Chains are
  allowed. Duplicate direct successors and cycles are rejected. The amendment
  reason is stored in audit metadata only.

Care context remains optional (appointment or admission or neither). A supplied
context must exist and belong to the same patient. This module does not create
appointments or admissions.

## Prescriptions

Prescriptions require a `final` medical record, at least one item, and verified
Doctor identity. Status starts as `active`. Item unit must match the medicine
canonical inventory unit. Inactive medicines cannot be selected.

Milestone 9 implements only `active → cancelled`. Cancellation requires a reason,
is allowed only from `active`, and retains the row. Pharmacy dispensing
transitions are implemented by D-024.

## Permissions

| Permission | Administrator | Doctor | Nurse | Receptionist | Laboratory Staff | Pharmacist | Accountant |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `medical_record.read` | yes | yes | yes | no | no | no | no |
| `medical_record.create` | no | yes | no | no | no | no | no |
| `medical_record.update` | no | yes | no | no | no | no | no |
| `medical_record.finalize` | no | yes | no | no | no | no | no |
| `medical_record.amend` | no | yes | no | no | no | no | no |
| `prescription.read` | yes | yes | yes | no | no | yes | no |
| `prescription.create` | no | yes | no | no | no | no | no |
| `prescription.cancel` | no | yes | no | no | no | no | no |
| `medicine.read` | no | yes | no | no | no | yes | no |

Diagnosis, treatment, and report writes use the parent medical-record
permissions. `patient.read` is not sufficient for medical history.

The backend enforces every assignment. Frontend route and control gating is
usability only. Re-run `npm run sync:permissions -w backend` (or
`npm run bootstrap:admin -w backend` when bootstrap environment variables are
present) to grant these permissions on an existing database.

## Frontend server state

TanStack Query remains the only server-state library. Keys follow:

- `['medical-records', 'list', filters]`
- `['medical-records', 'detail', medicalRecordId]`
- `['prescriptions', 'list', filters]`
- `['prescriptions', 'detail', prescriptionId]`
- `['medicines', 'list', filters]`

Creates, updates, finalization, amendment, prescription creation, and
cancellation invalidate affected list and detail queries, including patient
history lists. Logout and session expiry continue to clear cached server state.

## Deferred / pending policy

The following remain unresolved and are not implemented:

- Billing
- Admissions management
- Patient documents
- Clinical templates
- Own-record / own-patient contextual authorization
- Employee/doctor identity as a JWT/session claim

## Testing

Normal unit/frontend tests run with `npm test`. Database-backed API authorization
and workflow tests run only through `npm run test:database`; the guarded runner
creates and uses local `hms_test` and refuses production, Supabase, or
`hms_development` as a test target.
