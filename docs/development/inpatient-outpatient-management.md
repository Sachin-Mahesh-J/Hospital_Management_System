# Inpatient and Outpatient Management

Status: Implemented (Milestone 13, D-026). Outpatient care remains appointments plus
medical records (D-009). Admission billing remains deferred (D-025).

This document records the approved D-026 policy and the implemented minimal
admission module. It does not add bed, ward, transfer, billing, or outpatient
entities.

## Scope

The module supports:

- listing and reading admissions
- receptionist registration of an admission
- server-controlled lifecycle `admitted → discharged` and `admitted → cancelled`
- an ordinary update contract that no current role can invoke
- one active admission per patient, enforced in the application and by a
  PostgreSQL partial unique index

Outpatient management is not a separate module. It remains the existing
appointments and medical-records functionality.

D-025 billing behavior is unchanged. This milestone does not create admission
invoice lines, prices, or insurance records.

## Database

The existing `admissions` table is reused. The only schema addition is migration
`20260928233000_admissions_one_active_per_patient`:

```sql
CREATE UNIQUE INDEX "uq_admissions_one_active_per_patient"
ON "admissions" ("patient_id")
WHERE "status" = 'admitted';
```

Existing checks remain in force: status in `admitted`, `discharged`,
`cancelled`; `discharged_at` is required only when status is `discharged` and
cannot precede `admitted_at`. Foreign keys stay `ON DELETE RESTRICT`.

No cancellation-reason, cancellation-time, cancellation-actor, transfer-history,
ward, bed, or room columns were added.

## Admission numbering

Admission numbers are server-generated, unique, and immutable:

```text
ADM-<UUID>
```

Clients cannot supply or change the number. Database IDs are not used as the
admission number. Sequential numbering is not used.

## Lifecycle

Allowed transitions:

```text
admitted → discharged
admitted → cancelled
```

`discharged` and `cancelled` are terminal. Direct creation as discharged or
cancelled is rejected. The server owns status, `admittedAt`, and `dischargedAt`.

## One active admission

A patient may have at most one row with status `admitted`. Discharged and
cancelled rows do not count. Concurrent creates for the same patient result in
one success and one HTTP `409`.

## Patient eligibility

Admissions may be created for `active` and `inactive` patients. Deceased
patients are rejected. The server reads patient status from the database.

## Attending doctor

The attending doctor is optional at creation. When supplied, the doctor profile
must exist and be `active`, and the linked employee must exist with
`employment_status = active`. The attending doctor may change only while the
admission is `admitted`. It is immutable after discharge or cancellation. There
is no doctor-transfer history and no doctor ownership filter.

## Permissions

| Permission            | Administrator | Doctor | Nurse | Receptionist | Laboratory Staff | Pharmacist | Accountant |
| --------------------- | ------------: | -----: | ----: | -----------: | ---------------: | ---------: | ---------: |
| `admission.read`      |            No |     No |   Yes |          Yes |               No |         No |         No |
| `admission.create`    |            No |     No |    No |          Yes |               No |         No |         No |
| `admission.update`    |            No |     No |    No |           No |               No |         No |         No |
| `admission.discharge` |            No |     No |    No |           No |               No |         No |         No |
| `admission.cancel`    |            No |     No |    No |           No |               No |         No |         No |

Backend authorization is mandatory. Frontend navigation and action hiding are
usability only. Re-run `npm run sync:permissions -w backend` (or
`npm run bootstrap:admin -w backend` when bootstrap environment variables are
present) to grant these permissions on an existing database.

## API

- `GET /api/v1/admissions` — `admission.read`
- `GET /api/v1/admissions/:id` — `admission.read`
- `POST /api/v1/admissions` — `admission.create`
- `PATCH /api/v1/admissions/:id` — `admission.update` (no current role has it)
- `POST /api/v1/admissions/:id/discharge` — `admission.discharge` (no current role has it)
- `POST /api/v1/admissions/:id/cancel` — `admission.cancel` (no current role has it)

Create body: `patientId`, optional `attendingDoctorId`, `reason` (nonblank).
Update body while admitted: `attendingDoctorId` and/or `reason`.
Discharge body: `dischargeSummary` (nonblank). The server sets status and
`dischargedAt`.
Cancel body: `reason` (nonblank). The admission `reason` is preserved. The
cancellation reason is stored in audit metadata only.

Architecture remains route → controller → service → repository/Prisma. Lifecycle
operations lock the admission row and re-check that status is still `admitted`.

## Audit

Successful writes record `admission.create`, `admission.update`,
`admission.discharge`, and `admission.cancel`. Metadata is limited to
identifiers, status transitions, changed field names, and the cancellation
reason. Discharge summaries and unnecessary clinical text are omitted.

## Frontend

Admissions navigation is shown only when the user has `admission.read` (Nurse
and Receptionist). Create is shown only for `admission.create` (Receptionist).
Current roles do not see update, discharge, or cancel actions because those
permissions are not granted.

## Testing

- Schema tests cover the partial unique index, remaining admission checks, and
  foreign keys against `hms_test`.
- API tests cover authentication, the permission matrix, eligibility, numbering,
  one-active-admission races, lifecycle races, audit metadata, and safe errors.
- Frontend tests cover navigation, list states, create validation, successful
  create, API errors, detail rendering, and action visibility.

## Deferred items

- Ward, bed, and room management
- Transfers and transfer history
- Nurse assignment
- Admission billing, prices, insurance, and automatic invoices
- Notifications, SMS, and email
- Reports and dashboard analytics
- Automatic medical-record creation
- A separate outpatient encounter entity
- Admission cancellation history tables
- Discharge checklists, medications, and prescriptions
- Doctor ownership / “relevant admission” filters
- New roles, or grants of `admission.update`, `admission.discharge`, or
  `admission.cancel` to existing roles
- Patient or admission deletion

## Assumptions

- Zod bounds admission `reason` and `dischargeSummary` to 5000 characters and
  cancellation reason to 500 characters. The database columns remain unbounded
  `text`.
- Ordinary PATCH may omit either editable field but must supply at least one.
  `attendingDoctorId: null` unassigns the doctor while the admission is still
  `admitted`.
- A doctor profile without a linked employee is treated as not found. The
  existing foreign key makes a true orphan impossible.
- List filters `patientId`, `attendingDoctorId`, and `status` follow existing
  pagination conventions and do not add extra business rules.
