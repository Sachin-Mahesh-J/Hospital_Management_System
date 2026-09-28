# Appointment Management

Status: Implemented (Milestone 8)

## Scope

This module supports appointment booking, listing, ordinary reason updates,
cancellation, rescheduling, and approved status transitions.

The Prisma schema and initial migration were not changed. Existing PostgreSQL
exclusion constraints remain the authority for active doctor and patient overlaps.

## API and layers

Versioned endpoints:

- `GET/POST /api/v1/appointments`
- `GET/PATCH /api/v1/appointments/:id`
- `POST /api/v1/appointments/:id/cancel`
- `POST /api/v1/appointments/:id/reschedule`
- `PATCH /api/v1/appointments/:id/status`

Routes authenticate and authorize before controllers run. Controllers handle HTTP,
services enforce booking, schedule-fit, transition, and audit rules inside Prisma
transactions, repositories own Prisma queries plus the short `FOR UPDATE` locks
needed to serialize cancellation/rescheduling against concurrent writes, and Zod
schemas reject unknown or invalid input. There is no appointment deletion endpoint.

## Booking rules

Create and reschedule require:

- an existing patient (inactive or deceased patients are not rejected in this milestone);
- an existing doctor with `doctor_profiles.status = active` and
  `employees.employment_status = active`;
- timezone-aware `startsAt` / `endsAt` with `endsAt > startsAt`;
- the appointment interval fully contained in an `available` doctor schedule.

Active overlap (`scheduled` and `checked_in`) is enforced by PostgreSQL exclusion
constraints using half-open `tstzrange(..., '[)')`. Adjacent intervals are allowed.
Constraint conflicts are mapped to HTTP 409 without exposing SQL or Prisma details.

There is no default duration and no rule that rejects past appointment times.

## Lifecycle

Approved statuses: `scheduled`, `checked_in`, `completed`, `cancelled`, `no_show`.

Ordinary `PATCH` may change `reason` only.

Status transitions through `PATCH .../status`:

- `scheduled` → `checked_in` or `no_show`
- `checked_in` → `completed`
- `completed`, `cancelled`, and `no_show` are terminal

Cancellation through `POST .../cancel` is allowed only from `scheduled` or
`checked_in`, requires `cancellationReason`, and sets `cancelledAt` and
`cancelledByUserId` from the server.

Rescheduling through `POST .../reschedule` is allowed only from `scheduled` or
`checked_in`. The original is cancelled with reason `Rescheduled` and a replacement
is created in the same transaction, linked by `rescheduled_from_appointment_id`, for
the same patient. If replacement creation fails, the original remains unchanged.

## Permissions

| Permission | Administrator | Doctor | Nurse | Receptionist | Laboratory Staff | Pharmacist | Accountant |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `appointment.read` | yes | no | no | yes | no | no | no |
| `appointment.create` | yes | no | no | yes | no | no | no |
| `appointment.update` | yes | no | no | yes | no | no | no |
| `appointment.cancel` | yes | no | no | yes | no | no | no |
| `appointment.reschedule` | yes | no | no | yes | no | no | no |
| `appointment.status.update` | yes | no | no | yes | no | no | no |

The backend enforces every assignment. Frontend route and control gating is usability
only.

Doctor and Nurse appointment access is deferred until authenticated-user → employee →
doctor identity mapping can safely enforce assigned-appointment scope. Re-run
`npm run sync:permissions -w backend` (or `npm run bootstrap:admin -w backend` when
bootstrap environment variables are present) to grant these permissions on an existing
database.

## Frontend server state

TanStack Query remains the only server-state library. Keys follow:

- `['appointments', 'list', filters]`
- `['appointments', 'detail', appointmentId]`

Creates, updates, cancellations, status changes, and reschedules invalidate list
queries. Reschedule also invalidates both the original and replacement detail queries.
Logout and session expiry clear cached server state.

The booking form attaches the browser-local offset to `datetime-local` values so the
API receives an explicit offset. Presentation uses the browser locale. Hospital IANA
timezone “today” calendar bounds are not configured and are not implemented.

## Deferred / pending policy

The following remain unresolved and are not implemented:

- Doctor/Nurse assigned-appointment access
- patient-status-based booking eligibility
- default appointment duration
- past-booking prohibition
- recurrence, holidays, breaks, waitlists, reminders, and notifications
- hospital timezone “today” views
- patient self-booking

## Testing

Normal unit/frontend tests run with `npm test`. Database-backed API authorization and
workflow tests run only through `npm run test:database`; the guarded runner creates
and uses local `hms_test` and refuses production, Supabase, or `hms_development` as a
test target.
