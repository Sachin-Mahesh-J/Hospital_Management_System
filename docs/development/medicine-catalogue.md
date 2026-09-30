# Medicine Catalogue Management

Status: Implemented (D-036)

## Scope

This module lets the Administrator maintain the hospital medicine master
catalogue on the existing `medicines` model. A medicine is a product
definition, not a physical inventory batch. Pharmacy receiving, adjustment,
dispensing, reversal, and billing snapshots remain the D-024 / D-025 workflows.

No Prisma schema change was required. The existing `status` field supports
`active` and `inactive`, so deactivation and reactivation are both implemented.
Medicines are never hard-deleted.

## API and layers

Versioned endpoints:

- `GET /api/v1/medicines`
- `POST /api/v1/medicines`
- `GET /api/v1/medicines/:id`
- `PATCH /api/v1/medicines/:id`
- `POST /api/v1/medicines/:id/deactivate`
- `POST /api/v1/medicines/:id/reactivate`

The server generates the medicine id. `code` remains the unique business key.
Catalogue `PATCH` updates master-data fields only and does not change `status`.
Status changes use the dedicated deactivate and reactivate operations.

Routes authenticate and authorize before controllers run. Controllers handle HTTP,
services own uniqueness, lifecycle, and audit writes inside Prisma transactions,
and repositories own Prisma queries. Zod `.strict()` schemas reject unknown
fields, including client-supplied ids and status on create/update.

## Selection versus catalogue listing

`GET /api/v1/medicines` returns all matching rows when `status` is omitted.
New-prescription and stock-receiving clients must pass `status=active`.
Inactive medicines remain readable by id and appear in historical prescription,
batch, movement, and invoice views.

Existing prescription and pharmacy services continue to reject inactive
medicines for new prescriptions, new stock receiving, and new dispensing.

## Permissions

| Permission | Administrator | Doctor | Nurse | Receptionist | Laboratory Staff | Pharmacist | Accountant |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `medicine.read` | yes | yes | no | no | no | yes | no |
| `medicine.create` | yes | no | no | no | no | no | no |
| `medicine.update` | yes | no | no | no | no | no | no |
| `medicine.deactivate` | yes | no | no | no | no | no | no |
| `medicine.reactivate` | yes | no | no | no | no | no | no |

D-024 pharmacy permissions are unchanged. Administrator catalogue access does
not grant stock receiving or dispensing.

The backend enforces every assignment. Frontend route and control gating is
usability only. Re-run `npm run sync:permissions -w backend` (or
`npm run bootstrap:admin -w backend` when bootstrap environment variables are
present) to grant these permissions on an existing database.

## Frontend

Routes:

- `/medicines` — catalogue list (`medicine.read`)
- `/medicines/new` — create (`medicine.create`)
- `/medicines/:medicineId` — detail, deactivate, reactivate
- `/medicines/:medicineId/edit` — update (`medicine.update`)

AppShell shows Medicines for `medicine.read`. Prescription create and stock
receive continue to request `status=active` so inactive medicines are not
selectable.

TanStack Query keys:

- `['medicines', 'list', filters]`
- `['medicines', 'detail', id]`

Creates, updates, deactivation, and reactivation invalidate both catalogue and
prescription medicine lists.

## Audit

Successful writes record `medicine.create`, `medicine.update`,
`medicine.deactivate`, and `medicine.reactivate`. Metadata contains only
`fields`. Passwords, tokens, clinical notes, prescription contents, lab values,
and document contents are not written.

## Testing

Normal unit/frontend tests run with `npm test`. Database-backed authorization
and workflow tests run only through `npm run test:database`.
