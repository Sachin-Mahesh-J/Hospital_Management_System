# Reports and Dashboard

Status: Implemented (Milestone 14, D-027)

## Scope

This module provides read-only reports and dashboard metrics over existing
operational data. It does not create reporting tables, duplicate data, change
M5–M13 workflows, or generate stored files.

The six reports are:

- patient
- appointment
- revenue
- pharmacy
- laboratory
- staff

Dashboard metrics are exactly:

1. total patients
2. today’s appointments
3. revenue summary
4. laboratory requests
5. pharmacy alerts

Per-request laboratory print reports and medical-record report children are not
this module.

## Permissions

Reports use dedicated codes and do not reuse operational read permissions.

| Permission                | Administrator | Doctor | Nurse | Receptionist | Laboratory Staff | Pharmacist | Accountant |
| ------------------------- | ------------: | -----: | ----: | -----------: | ---------------: | ---------: | ---------: |
| `report.patient.read`     |           Yes |     No |    No |           No |               No |         No |         No |
| `report.appointment.read` |           Yes |     No |    No |           No |               No |         No |         No |
| `report.revenue.read`     |           Yes |     No |    No |           No |               No |         No |        Yes |
| `report.pharmacy.read`    |           Yes |     No |    No |           No |               No |        Yes |         No |
| `report.laboratory.read`  |           Yes |     No |    No |           No |              Yes |         No |         No |
| `report.staff.read`       |           Yes |     No |    No |           No |               No |         No |         No |

Administrator report access does not add clinical editing, dispensing, or
invoice creation. Accountant still lacks `patient.read` and unrelated clinical
permissions. Dashboard metric visibility uses the same six permissions.
Unauthorized metrics are omitted from the response and UI.

## API

- `GET /api/v1/reports/patients`
- `GET /api/v1/reports/appointments`
- `GET /api/v1/reports/revenue`
- `GET /api/v1/reports/pharmacy`
- `GET /api/v1/reports/laboratory`
- `GET /api/v1/reports/staff`
- `GET /api/v1/dashboard`

Routes authenticate and authorize before controllers run. Controllers stay thin.
Report definitions live in the service. Prisma queries live in the repository.
Zod `.strict()` schemas reject unknown query fields and inverted or oversized
date ranges.

## Date and query bounds

Hospital-local calendar dates from `HOSPITAL_TIMEZONE` are converted to UTC
instants for local midnight and the next local midnight, then queried as
half-open `[start, end)`. Appointment `startsAt`, payment `paidAt`, and
laboratory `requestedAt` use this convention. “Today’s appointments” uses the
configured hospital-local day, not browser or server UTC.

Appointment, revenue, and laboratory reports require `from` and `to`. The
inclusive span cannot exceed 366 days. Pagination uses the existing maximum
page size of 100. There is no unbounded export endpoint.

## Report contents

### Patient

Registered patients in `patients`, including inactive and deceased rows. Fields
are number, name, date of birth, sex at registration, status, and created time.
Phone, email, address, emergency contacts, and clinical data are omitted.

### Appointment

Appointments in the selected hospital-local range. Fields are identifier,
status, start/end, patient administrative identity, doctor, and department.
Appointment reason and other clinical fields are omitted. Optional status
filter.

### Revenue

Revenue = effective recorded payments that are not reversal rows
(`status = recorded` and `reverses_payment_id IS NULL`) against invoices whose
status is not `void`, in `DEFAULT_CURRENCY`. Draft invoices, unpaid issued
invoices, reversed payments, and payments on void invoices are excluded.
Partial payments count only their effective amount. Rows expose payment number,
invoice number, patient number, amount, method, and paid time. Patient names
and clinical fields are omitted. Optional payment-method filter. Summary
includes total amount, payment count, and method breakdown.

Dashboard revenue summary uses the same definition over all matching payments
(not only today).

### Pharmacy

Low-stock medicines: current stock is the M11 `sum(stock_movements.quantity)`
across the medicine’s batches. A medicine is low-stock when
`current stock <= medicines.low_stock_threshold` and the threshold is greater
than zero. The schema default `0` is treated as no meaningful threshold.

Near-expiry batches: remaining quantity greater than zero, expiry date on or
after hospital today, and expiry date on or before hospital today + 30 days.
Already-expired batches are not near-expiry. The pharmacy report also counts
expired batches that still have remaining stock as a separate operational
figure. Unit cost is omitted. No notifications or background jobs.

### Laboratory

Laboratory requests in the selected `requestedAt` hospital-local range, with
patient administrative identity, requester, request status, test codes/names,
item status, and sample-collection time. Result values, result notes, and
clinical notes are omitted. Optional request-status filter.

Dashboard laboratory-request count is the number of `lab_requests` rows
(all-time). `requestedAt` remains the request-date interpretation for the
dated report.

### Staff

Employees with department and optional doctor profile. Attendance and leave are
not included. Phone, email, linked user id, passwords, and sessions are
omitted. Optional employment-status and department filters.

## Dashboard

`GET /api/v1/dashboard` is authenticated. It returns `hospitalDate` and
`currency` plus only the metrics the caller may see. Total patients counts all
registered patient rows. Today’s appointments count `startsAt` in the current
hospital-local day. Revenue and pharmacy alerts use the definitions above.

The Home page renders metric cards only for present authorized metrics. The
Reports menu appears only when the user has at least one report permission.
Each report supports loading, empty, error, refresh, and browser print. Charts,
CSV, generated PDF, and stored files are not provided.

## Assumptions

- Inclusive date-range maximum of 366 days is an implementation bound required
  by architecture; D-027 did not name a different number.
- Near-expiry and expired pharmacy counts include only batches with remaining
  derived stock greater than zero.
- Dashboard laboratory-request and revenue-summary figures are all-time
  aggregates; only “today’s appointments” is day-scoped among the five metrics.

## Explicitly deferred

CSV export, generated or stored PDF, email/SMS reports, attendance/leave
reports, admission billing reports, insurance reports, audit-log viewing,
advanced analytics, forecasting, AI, notifications, and background jobs.
