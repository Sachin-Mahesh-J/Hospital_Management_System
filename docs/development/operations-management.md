# Attendance, Leave, Users, and Audit

Status: Implemented (Milestone 16; D-028, D-029, D-031, D-032)

## Scope

This module implements staff attendance capture, employee leave requests and
Administrator approval, operational user administration, and Administrator audit
viewing/export.

Identity mapping remains User → Employee → Doctor profile. Leave uses
`employees.user_id`. No second identity mechanism exists.

## Attendance (D-028)

Authorized roles: Administrator and Receptionist.

Permissions: `attendance.read`, `attendance.create`, `attendance.update`.

One attendance row per employee per work date is enforced by the existing unique
constraint. Concurrent duplicate creates return HTTP 409. Historical rows remain
available for inactive or terminated employees. Status values remain
`present`, `absent`, and `leave`. Attendance status `leave` is recorded independently
of leave-request rows.

Check-in and check-out are optional timezone-aware timestamps. Check-out requires
check-in and must be later. Every create and update is audited.

Not implemented: biometric capture, payroll, overtime, automatic absence, shift
management.

## Leave (D-029)

Employees create leave for their linked employee identity. Administrator approves or
rejects pending requests. An employee may cancel their own pending request.

Permissions:

- `leave.read` — own records unless the caller has `leave.approve`
- `leave.create` / `leave.update` / `leave.cancel` — own pending records
- `leave.approve` — Administrator only; approve or reject

Statuses: `pending`, `approved`, `rejected`, `cancelled`. Existing `requested` rows
were migrated to `pending`. Overlapping pending or approved leave for the same
employee is rejected by a GiST exclusion constraint.

`leaveType` is free text up to 50 characters. There is no type catalog, balance,
accrual, payroll, notification, or multi-level approval workflow.

Approved leave blocks new appointment bookings for that doctor. Pending, rejected,
and cancelled leave do not. Existing appointments are not auto-cancelled.

## Operational users (D-031)

Administrator-only. There is no public registration. Users are not deleted.

Permissions: `user.read`, `user.create`, `user.update`, `user.deactivate`,
`user.role.update`, `user.password.reset`.

Each user has exactly one catalog role. Unlinked users are allowed. Employee linking
reuses `employees.user_id` and rejects a second user on the same employee.

Inactive status is stored as `disabled`. Password reset accepts an administrator-supplied
new password, never returns it, never logs it, updates `passwordChangedAt`, and revokes
that user’s refresh sessions. Forgotten-password email recovery is deferred.

Protected: self-demotion, self-deactivation, removing the last active catalog
Administrator, invalid roles, and duplicate usernames.

## Audit viewing (D-032)

Administrator-only `audit.read`. Read-only. No mutation or delete API.

List and export require a bounded `occurredFrom`/`occurredTo` range of at most 366
calendar days. Filters: actor, action, resource type, outcome, request ID. Pagination
is required.

Displayed fields are sanitized: timestamp, actor identifier/username, action, resource
type/id, request ID, outcome, and allowlisted metadata keys only. Passwords, tokens,
patient contact, clinical notes, prescription contents, laboratory values, document
contents, and signed URLs are not returned.

CSV and PDF export use the same filters, are generated on demand, and are not stored.
A filtered result larger than 5,000 rows is rejected with `AUDIT_EXPORT_TOO_LARGE`
and no partial file is returned. The export action is audited after a successful
generation with filter names and row count only.

No automatic retention or deletion job.

## API

- `GET/POST /api/v1/attendance`, `PATCH /api/v1/attendance/:id`
- `GET/POST /api/v1/leave`, `PATCH /api/v1/leave/:id`
- `POST /api/v1/leave/:id/approve|reject|cancel`
- `GET/POST /api/v1/users`, `GET/PATCH /api/v1/users/:id`
- `POST /api/v1/users/:id/role|deactivate|reactivate|password-reset`
- `GET /api/v1/audit`, `GET /api/v1/audit/export`

## Frontend

Routes: `/attendance`, `/leave`, `/users`, `/audit`. Navigation is permission-gated.
Backend authorization remains the security control.

## Assumptions

- Leave types remain free-text because D-029 did not approve a catalog.
- Only Administrator holds `leave.approve`.
- Login identity remains `username`; it may look like an email.
- Audit export is in scope because D-032 in the M16 approval required CSV and PDF.
