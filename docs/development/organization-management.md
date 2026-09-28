# Organization, Staff, Doctors, and Schedules

Status: Implemented

## Scope

This module supports departments, employee/staff records, doctor profiles linked to
existing employees, and explicit doctor schedule intervals.

Appointment booking, attendance, leave, recurrence, schedule overlap policy, and
employee account provisioning are not implemented.

## API and layers

Versioned endpoints:

- `GET/POST /api/v1/departments`
- `GET/PATCH /api/v1/departments/:id`
- `GET/POST /api/v1/employees`
- `GET/PATCH /api/v1/employees/:id`
- `GET/POST /api/v1/doctors`
- `GET/PATCH /api/v1/doctors/:id`
- `GET/POST /api/v1/doctors/:doctorId/schedules`
- `PATCH /api/v1/doctors/:doctorId/schedules/:scheduleId`

Routes authenticate and authorize before controllers run. Controllers handle HTTP,
services enforce uniqueness, assignment, and audit rules, repositories own Prisma
queries, and Zod schemas reject unknown or invalid input. There are no department,
employee, doctor, or schedule deletion endpoints.

The Prisma schema and initial migration were not changed.

## Interim employee number

No hospital-facing employee-number format has been approved. Employee numbers use the
same interim principle as Patient Management: server-generated unique `E-<UUID>`
values. UUID generation is safe under concurrent registration, the existing
`employee_number` unique constraint is authoritative, and the service retries the
narrow collision case. Clients cannot assign employee numbers.

## Department assignment

Every employee requires an existing department. New assignments (create or an explicit
department change) currently require the department to be `active`. Deactivating a
department does not reassign existing employees.

## Doctor profiles

A doctor is an employee with a `doctor_profiles` row. Creating a profile requires an
existing employee that does not already have one. License numbers are unique. No
license-number format, specialty catalog, or external verification is implemented.
Department is returned through `Employee → Department`.

## Schedules

Each schedule is an explicit timezone-aware `startsAt`/`endsAt` interval. Naive
timestamps without an offset are rejected. `endsAt` must be after `startsAt`.

The following remain unresolved and are not implemented:

- recurrence and weekly templates
- breaks
- overlap policy
- duration rules
- holiday calendars
- leave/attendance integration
- hospital IANA timezone configuration for schedule wall-clock entry
- contextual “own schedule” write authorization

Overlapping intervals are currently accepted because no overlap policy has been
approved. Appointment Management must not assume exclusive availability from these
rows until that policy exists.

The schedule UI attaches the browser-local offset to `datetime-local` values so the
API receives an explicit offset. It does not reinterpret already-offset timestamps.

## Permissions

| Permission | Administrator | Doctor | Nurse | Receptionist | Laboratory Staff | Pharmacist | Accountant |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `department.read` | yes | no | no | yes | no | no | no |
| `department.create` | yes | no | no | no | no | no | no |
| `department.update` | yes | no | no | no | no | no | no |
| `employee.read` | yes | no | no | no | no | no | no |
| `employee.create` | yes | no | no | no | no | no | no |
| `employee.update` | yes | no | no | no | no | no | no |
| `doctor.read` | yes | yes | no | yes | no | no | no |
| `doctor.create` | yes | no | no | no | no | no | no |
| `doctor.update` | yes | no | no | no | no | no | no |
| `doctor_schedule.read` | yes | yes | no | yes | no | no | no |
| `doctor_schedule.create` | yes | no | no | no | no | no | no |
| `doctor_schedule.update` | yes | no | no | no | no | no | no |

The backend enforces every assignment. Frontend route and control gating is usability
only.

Doctor schedule create/update is administrator-only in this milestone. The
requirements baseline says a doctor may manage their own schedule within hospital
policy, but user-to-employee ownership checks are not implemented and unrestricted
writes to other doctors’ schedules are not approved. Re-run administrator bootstrap
to grant these permissions on existing databases.

Optional `userId` linking validates that the user exists and is not already linked.
Login accounts are not created automatically. Re-run `npm run sync:permissions -w backend`
to grant these permissions on an existing database without changing administrator
credentials. `npm run bootstrap:admin -w backend` also applies the same grants when
bootstrap environment variables are present.

## Frontend server state

TanStack Query remains the only server-state library. Keys follow:

- `['departments', 'list', filters]`
- `['departments', 'detail', departmentId]`
- `['employees', 'list', filters]`
- `['employees', 'detail', employeeId]`
- `['doctors', 'list', filters]`
- `['doctors', 'detail', doctorId]`
- `['doctor-schedules', doctorId, filters]`

Creates invalidate lists. Updates replace and invalidate the affected detail and
invalidate lists. Employee department changes also invalidate doctor queries.
Logout and session expiry clear cached server state.

## Testing

Normal unit/frontend tests run with `npm test`. Database-backed API authorization and
workflow tests run only through `npm run test:database`; the guarded runner creates
and uses local `hms_test` and refuses production, Supabase, or `hms_development` as a
test target.
