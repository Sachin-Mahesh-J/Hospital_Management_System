# Billing and Payments

Status: Implemented (Milestone 12, D-025)

## Scope

This module supports accountant-created invoices for consultation, laboratory, and
pharmacy charges; draft editing; invoice issue and void; partial and multiple
payments; linked payment reversal; billing-safe patient and source lookups; and
on-screen printable payment receipts.

The Prisma schema and initial migration were not changed. Monetary values use
`numeric(19,4)` and Prisma `Decimal`. JavaScript floating-point arithmetic is not
used for financial calculations.

## Database gate

Existing `invoices`, `invoice_items`, and `payments` models are sufficient for
D-025. No Milestone 12 migration is authorized or required.

Structural fields that remain unused by policy:

- `invoices.due_at` — no due-date policy
- `invoices.discount_amount` and `invoices.tax_amount` — always zero
- `invoice_items.admission_id` and category `admission` — admission billing deferred
- payment status `void` — unused; effective payment states are `recorded` and
  `reversed`

Invoice void reasons are stored in audit metadata, not a new invoice column.

## API and layers

Versioned endpoints:

- `GET /api/v1/billing/patients`
- `GET /api/v1/billing/patients/:patientId/consultations`
- `GET /api/v1/billing/patients/:patientId/laboratory-items`
- `GET /api/v1/billing/patients/:patientId/dispenses`
- `GET /api/v1/invoices`
- `POST /api/v1/invoices`
- `GET /api/v1/invoices/:id`
- `PATCH /api/v1/invoices/:id`
- `POST /api/v1/invoices/:id/issue`
- `POST /api/v1/invoices/:id/void`
- `GET /api/v1/invoices/:id/payments`
- `POST /api/v1/invoices/:id/payments`
- `POST /api/v1/payments/:id/reverse`

There is no invoice DELETE, no payment DELETE, no credit-note API, no admission
billing API, no tax or discount API, and no stored PDF receipt API.

Routes authenticate and authorize before controllers run. Controllers handle HTTP,
services enforce billing rules inside Prisma transactions, repositories own Prisma
queries plus `FOR UPDATE` locks, and Zod `.strict()` schemas reject unknown or
invalid input. Client-supplied invoice numbers, payment numbers, totals, tax,
discount, balance, currency, timestamps, creator, receiver, and payment status are
rejected.

## Currency

Invoices and payments use the configured `DEFAULT_CURRENCY` (ISO 4217). The
expected deployment value is `LKR`, but business logic reads the environment
value and does not hardcode it. Payment currency must match the invoice
currency. There is no FX or conversion.

## Invoice lifecycle

```text
draft → issued → partially_paid → paid
```

`void` is reachable from `draft`, `issued`, `partially_paid`, and `paid`.
`partially_paid` and `paid` invoices can be voided only after every effective
payment has been reversed. Void invoices cannot receive payments, cannot be
edited, cannot be unvoided, and cannot be reused.

Draft invoices are editable. Issued invoices are financially immutable.
Corrections use void and a new invoice. Invoice payment status is derived from
effective recorded payments, not from client-supplied status.

## Billable sources

- Consultation: completed appointments only. The accountant supplies the unit
  price. Quantity is `1`. Multiple consultation lines on one appointment are
  allowed.
- Laboratory: completed request items whose catalog price is not null. The
  server copies the catalog price into `invoice_items.unit_price`. Item
  `price_snapshot` is not modified. A lab request item may appear on at most one
  non-void invoice.
- Pharmacy: unreversed completed dispense records. One invoice line per
  dispense. Effective unit price is the quantity-weighted average of batch
  `sale_price_snapshot` values actually consumed. A dispense may appear on at
  most one non-void invoice.
- Admission: deferred.

All sources on an invoice must belong to that invoice’s patient.

## Payments

Approved methods: `cash`, `card`, `bank_transfer`. Card numbers, CVV, PIN, and
bank credentials are not accepted or stored. Optional `externalReference` may
be stored.

A payment amount must be greater than zero and must not exceed the invoice
balance. Multiple and partial payments are allowed. Overpayment is rejected.
Receiver identity is the authenticated user. Payment numbers are `PAY-<UUID>`.

Reversal creates a linked reversal payment, requires a reason stored on the
reversal `note`, marks the original `reversed`, and recalculates invoice
balance and status. One full reversal per original payment. Pharmacy stock,
laboratory results, and appointments are not reversed.

## Permissions

| Permission | Administrator | Doctor | Nurse | Receptionist | Laboratory Staff | Pharmacist | Accountant |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `invoice.read` | yes | no | no | no | no | no | yes |
| `invoice.create` | no | no | no | no | no | no | yes |
| `invoice.update` | no | no | no | no | no | no | yes |
| `invoice.issue` | no | no | no | no | no | no | yes |
| `invoice.void` | yes | no | no | no | no | no | yes |
| `payment.read` | yes | no | no | no | no | no | yes |
| `payment.create` | no | no | no | no | no | no | yes |
| `payment.reverse` | yes | no | no | no | no | no | yes |

Accountant is not granted `patient.read`, medical-record, prescription,
appointment, laboratory, or pharmacy permissions. Billing-safe patient lookup
exposes patient id, patient number, and name only.

The backend enforces every assignment. Frontend route and control gating is
usability only. Re-run `npm run sync:permissions -w backend` (or
`npm run bootstrap:admin -w backend` when bootstrap environment variables are
present) to grant these permissions on an existing database.

## Frontend

Routes:

- `/billing` — invoice list (`invoice.read`)
- `/billing/new` — create draft (`invoice.create`)
- `/billing/:invoiceId` — invoice detail, draft edit, issue, void, payments
  (`invoice.read`)
- `/billing/:invoiceId/payments/:paymentId` — printable receipt (`payment.read`)

AppShell shows Billing for `invoice.read`.

TanStack Query keys:

- `['billing', 'invoices', filters]`
- `['billing', 'invoice', id]`
- `['billing', 'payments', invoiceId]`
- `['billing', 'patients', filters]`
- `['billing', 'sources', patientId, category]`

Mutations invalidate invoice, payment, and source key families and then refetch
authoritative server state.

## Audit and logging

Successful writes record `invoice.create`, `invoice.update`, `invoice.issue`,
`invoice.void`, `payment.create`, and `payment.reverse`. Metadata may include
invoice, payment, patient, source, amount, currency, method, and void/reversal
reason identifiers. Diagnoses, treatment notes, laboratory results,
prescriptions, card data, passwords, and tokens are not written to audit
metadata. Pino redaction covers payment notes, reasons, and credential-like
fields.

## Testing

Normal unit/frontend tests run with `npm test`. Database-backed API authorization
and workflow tests run only through `npm run test:database`; the guarded runner
creates and uses local `hms_test` and refuses production, Supabase, or
`hms_development` as a test target.

## Deferred / not implemented

The following remain out of this milestone:

- Admission billing and admission price catalogs
- Taxes and discounts (structural fields remain zero)
- Insurance, credit accounts, interest, and FX
- Payment gateways and stored card data
- Refunds beyond linked payment reversal
- Credit notes
- Automatic invoicing when dispensing or completing lab work
- Stored PDF, email, or cloud receipts
- Revenue reports and dashboard analytics
- Service catalogs and doctor/department pricing
- Per-batch pharmacy invoice lines
- Generic idempotency-key framework
- Invoice numbering policies other than `INV-<UUID>`
