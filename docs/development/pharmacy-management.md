# Pharmacy Management

Status: Implemented (Milestone 11, D-024)

## Scope

This module supports pharmacist stock receiving, authorized stock adjustments,
paginated inventory and movement reading, prescription dispensing (including
partial dispensing), and full dispense reversal. Medicine catalogue
administration is implemented separately by D-036. Billing writes,
reports/analytics, and expiry jobs are not implemented here.

The Prisma schema and initial migration were not changed. Available stock is
derived from the append-only `stock_movements` ledger. There is no stored
`available_quantity` column.

## API and layers

Versioned endpoints:

- `GET /api/v1/pharmacy/inventory`
- `GET /api/v1/pharmacy/movements`
- `POST /api/v1/pharmacy/receipts`
- `POST /api/v1/pharmacy/adjustments`
- `POST /api/v1/prescriptions/:id/items/:itemId/dispense`
- `POST /api/v1/prescriptions/:id/dispenses/:dispenseId/reverse`

Existing prescription list/detail and medicine catalog endpoints are reused.
Catalogue write/deactivate/reactivate is owned by D-036. There is no movement
PATCH/DELETE, FIFO/FEFO policy API, billing write, or reporting endpoint.

Routes authenticate and authorize before controllers run. Controllers handle HTTP,
services enforce identity mapping, stock invariants, prescription status
aggregation, and audit rules inside Prisma transactions, repositories own Prisma
queries plus `FOR UPDATE` locks, and Zod `.strict()` schemas reject unknown or
invalid input.

## Author identity

JWT/session identity is unchanged. Dispensing derives the actor from the
database using D1:

authenticated user → `employees.user_id` with `employment_status = active`

Client-supplied employee, pharmacist, or batch-selection IDs are rejected.
Unlinked accounts receive a conflict response. Identity is not added to the JWT.
Reversal records the authenticated user in `reversed_by_user_id`; an employee
link is not required for reversal.

## Inventory model

- Each medicine keeps one canonical inventory unit (D-015).
- A batch is unique on `(medicine_id, batch_number)`. Receiving a duplicate
  pair is rejected; the unique constraint is not bypassed and received quantity
  is the initial quantity for a new batch.
- Batch creation atomically inserts a positive `receipt` movement equal to
  `received_quantity`.
- Available quantity is `sum(stock_movements.quantity)` for the batch.
- Adjustments append `adjustment` movements with a required reason. Negative
  adjustments cannot reduce available stock below zero.
- Movements are append-only. Runtime roles cannot update or delete them.

Receiving currency must match the medicine catalog currency. Unit cost and sale
price snapshot are required to persist a batch and are not returned on inventory
reads.

## Expiry

Expiry is batch-level. A batch may be dispensed only when its `expiry_date` is
on or after the hospital-local calendar date from `HOSPITAL_TIMEZONE`. Expired
batches remain visible historically. There is no background expiry job, no
automatic status rewrite to `expired`, and no near-expiry alert system.

When more than one eligible batch can fill a dispense, the implementation orders
candidates by `expiry_date`, then `id`, as a technical tie-break. That ordering
is not a hospital FIFO or FEFO policy.

## Prescription dispensing

Pharmacy owns:

```text
active → partially_dispensed → dispensed
```

Milestone 9 still owns `active → cancelled`. Once a prescription is partially or
fully dispensed it cannot be cancelled. Cancelled prescriptions cannot be
dispensed. Prescription `expired` is not implemented as a pharmacy transition.

Remaining quantity for an item is prescribed quantity minus effective unreversed
dispensed quantity. A pharmacist may dispense less than remaining quantity.
Requested quantity is never silently reduced. Zero available stock is rejected.
Inactive medicines cannot be newly received, prescribed, or dispensed.

If one batch cannot fill the requested quantity, the same transaction may
consume multiple eligible batches. Each stock movement identifies its batch.
Multiple dispense records per item are allowed.

After a successful dispense or reversal, stored prescription status is
recalculated from effective unreversed totals:

- no effective dispense → `active`
- some remaining prescribed quantity → `partially_dispensed`
- every item fully dispensed → `dispensed`

## Reversal

D-020 remains unchanged. A reversal reverses one complete dispense, requires a
reason, is allowed only once per dispense, appends positive `return` movements
that mirror the original `dispense` movements, restores stock, and recalculates
prescription status. Partial reversal is not allowed. Invoices and payments are
not reversed.

## Concurrency

Dispense and reversal run in one transaction. The prescription, its items, and
selected batches are locked with `FOR UPDATE`. Availability is calculated from
movements after those locks, not from a cached quantity.

## Permissions

| Permission | Administrator | Doctor | Nurse | Receptionist | Laboratory Staff | Pharmacist | Accountant |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `medicine.read` | yes | yes | no | no | no | yes | no |
| `inventory.read` | yes | no | no | no | no | yes | no |
| `stock.receive` | no | no | no | no | no | yes | no |
| `stock.adjust` | yes | no | no | no | no | yes | no |
| `stock.movement.read` | yes | no | no | no | no | yes | no |
| `prescription.read` | yes | yes | yes | no | no | yes | no |
| `prescription.dispense` | no | no | no | no | no | yes | no |
| `prescription.reverse` | yes | no | no | no | no | yes | no |

Catalogue write permissions are documented in
`docs/development/medicine-catalogue.md`. There is no `stock.delete` or
pharmacist `prescription.cancel`. `patient.read` is not pharmacy access. Lists
are permission-wide with no ownership filter.

The backend enforces every assignment. Frontend route and control gating is
usability only. Re-run `npm run sync:permissions -w backend` (or
`npm run bootstrap:admin -w backend` when bootstrap environment variables are
present) to grant these permissions on an existing database.

## Frontend

Routes:

- `/medicines` — catalogue list/create/edit (D-036; `medicine.read` and write permissions)
- `/pharmacy/inventory` — inventory list (`inventory.read`)
- `/pharmacy/inventory/receive` — receiving (`stock.receive`)
- `/pharmacy/inventory/adjust` — adjustment (`stock.adjust`)
- `/pharmacy/movements` — movement history (`stock.movement.read`)
- `/prescriptions` and `/prescriptions/:prescriptionId` — existing prescription
  read, plus dispense/reverse controls gated by permission

AppShell shows Medicines for `medicine.read`, Inventory for `inventory.read`,
and Stock movements for `stock.movement.read`. Prescriptions remains
`prescription.read`. Receiving and new-prescription forms request
`status=active`.

TanStack Query keys:

- `['pharmacy', 'inventory', filters]`
- `['pharmacy', 'movements', filters]`
- existing `['prescriptions', 'list', filters]` and
  `['prescriptions', 'detail', id]`

Receiving, adjustment, dispensing, and reversal invalidate inventory, movement,
and affected prescription queries.

## Audit and logging

Successful writes record `stock.receive`, `stock.adjust`,
`prescription.dispense`, and `prescription.reverse`. Metadata may include
medicine, batch, prescription, item, dispense, reversal, employee, quantity,
movement type, batch count, and status transition identifiers. Prescription
directions, clinical notes, diagnoses, and tokens are not written to audit
metadata. Pino redaction covers `req.body.note` and `req.body.reason`.

## Testing

Normal unit/frontend tests run with `npm test`. Database-backed API authorization
and workflow tests run only through `npm run test:database`; the guarded runner
creates and uses local `hms_test` and refuses production, Supabase, or
`hms_development` as a test target.

## Deferred / pending policy

The following remain unresolved and are not implemented:

- Medicine catalog write/deactivate APIs (implemented by D-036)
- Near-expiry alerts, expiry jobs, and dashboard analytics
- FIFO/FEFO as hospital policy
- Damaged-stock `disposal` workflow beyond using the existing movement type in
  schema
- Waitlists, backorders, and reservations
- Billing invoice items, payments, taxes, discounts, and financial reversal
  (implemented separately by Milestone 12 / D-025; pharmacy stock reversal still
  does not reverse invoices)
- Pharmacy revenue reports and exports
- Automatic prescription expiry
