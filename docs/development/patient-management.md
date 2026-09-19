# Patient Management

Status: Implemented

## Scope

The Patient module supports registration, demographic/contact updates, explicit
`active`, `inactive`, and `deceased` status management, paginated listing, controlled
sorting, search, and patient details.

Medical history remains part of the future Medical Records module. Patient document
upload remains deferred until its storage, retention, media, and malware-scanning
policies are approved. Neither capability has a placeholder API or synthetic data.

## API and layers

The versioned endpoints are:

- `GET /api/v1/patients`
- `GET /api/v1/patients/:id`
- `POST /api/v1/patients`
- `PATCH /api/v1/patients/:id`

Routes authenticate and authorize before controllers run. Controllers handle HTTP,
the service enforces patient-number and audit rules, the repository owns Prisma
queries, and Zod schemas reject unknown or invalid input. There is intentionally no
patient deletion endpoint.

Patient numbers use the approved interim `P-<UUID>` format. UUID generation is safe
under concurrent registrations, the existing database unique constraint is
authoritative, and the service retries the narrow collision case. A future hospital
display format and any duplicate-matching policy remain open decisions. The Prisma
schema and initial migration were not changed for this milestone.

## Permissions

Only these permissions were introduced:

- `patient.read`
- `patient.create`
- `patient.update`

Assignments:

- Administrator: read, create, update
- Receptionist: read, create, update
- Doctor: read
- Nurse: read
- Laboratory staff: none
- Pharmacist: none
- Accountant: none

The backend enforces every assignment. Frontend route and control gating is usability
only. `patient.update` includes status changes; no destructive status or deletion
workflow exists.

## Frontend server state

TanStack Query is configured once in `AppProviders`. Patient keys follow:

- `['patients', 'list', filters]`
- `['patients', 'detail', patientId]`

Registration invalidates lists. Updates replace and invalidate the patient detail and
invalidate all lists. Logout and session expiry clear cached server state. Forms keep
short-lived demographic input locally and do not persist authentication tokens.

## Testing

Normal unit/frontend tests run with `npm test`. Database-backed API authorization and
workflow tests run only through `npm run test:database`; the guarded runner creates
and uses local `hms_test` and refuses production, Supabase, or `hms_development` as a
test target.
