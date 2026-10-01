# Hospital Management System

Hospital Management System (HMS) is a modular web application for hospital operations: identity and access, patient records, appointments, clinical documentation, laboratory and pharmacy workflows, billing, admissions, staff operations, reporting, and audit.

The frontend is a React single-page application. The backend is a versioned REST API. PostgreSQL is the system of record. Patient documents are stored privately and served through the API.

## Features

- **Authentication and authorization** — username and password login, logout, access JWTs, rotating refresh-token cookies, session idle and absolute timeouts, failed-login lockout, self-service password change, and permission-based access control. There is no public registration.
- **User administration** — administrators create operational accounts, assign one role per user, update account details, deactivate or reactivate users, and reset passwords.
- **Patient management** — register, search, update, and view patients, including demographic status (`active`, `inactive`, `deceased`).
- **Doctor and department management** — manage departments, employees, doctor profiles, specializations, department assignment, and explicit consulting schedules.
- **Appointment management** — book, update, cancel, and reschedule outpatient appointments; apply status transitions (`scheduled`, `checked_in`, `completed`, `cancelled`, `no_show`).
- **Appointment calendar** — day, week, and month calendar views of appointments.
- **Medical records** — create draft records with diagnoses, treatments, and clinical report content; finalize records; amend finalized records; create and cancel prescriptions from finalized records.
- **Laboratory** — create test requests, record sample collection, enter results, and print laboratory reports.
- **Pharmacy** — maintain the medicine catalogue; receive and adjust stock; review batches and movements; monitor low stock and near-expiry batches; dispense prescriptions and reverse completed dispenses.
- **Billing and payments** — create invoices from consultation, laboratory, and pharmacy charges; issue or void invoices; record cash, card, or bank-transfer payments; reverse payments; print receipts. Currency is configured (`DEFAULT_CURRENCY`, default `LKR`).
- **Admissions** — register and review inpatient admissions. One patient may have only one active (`admitted`) admission at a time. Demo data also includes discharged and cancelled records. Bed and ward management is not included.
- **Attendance and leave** — record attendance (`present`, `absent`, `leave`); submit, update, cancel, approve, or reject leave.
- **Patient documents** — upload, list, update metadata, soft-delete, and download patient documents (PDF, JPEG, PNG, up to 10 MB) from private storage using time-limited signed URLs.
- **Audit logs** — administrators can view sanitized audit records and export CSV or PDF.
- **Dashboard and reports** — dashboard metrics for total patients, today’s appointments, revenue, laboratory requests, and pharmacy alerts; read-only patient, appointment, revenue, pharmacy, laboratory, and staff reports with browser print. Report CSV/PDF file export is not implemented.

## User Roles

Each user has exactly one role. The frontend hides unauthorized navigation. The API enforces authorization on every protected operation.

| Role | Typical access |
|------|----------------|
| Administrator | Users, employees, doctors, departments, schedules, patients, appointments, medicines, selected pharmacy operations, reports, attendance, leave approval, patient documents, and audit. This role does not include clinical editing, laboratory requesting, dispensing, invoice creation, or admission registration. |
| Doctor | Patients, medical records, prescriptions, laboratory requests, and patient documents. |
| Nurse | Read access to patients, medical records, prescriptions, laboratory requests, and admissions; patient documents. |
| Receptionist | Patient registration and updates, appointments, admissions, attendance, leave, and patient documents. |
| Laboratory Staff | Laboratory requests, sample collection, result entry, printable laboratory reports, and the laboratory operational report. |
| Pharmacist | Medicine catalogue, inventory, stock receiving and adjustments, dispensing, dispense reversal, and the pharmacy report. |
| Accountant | Invoices, payments, receipts, and the revenue report. |

All roles can change their own password and submit their own leave, subject to the leave workflow.

## Technology Stack

| Area | Technologies |
|------|--------------|
| Frontend | React 19, TypeScript, Vite, Material UI, TanStack Query, React Router |
| Backend | Node.js 22, Express, TypeScript, REST API |
| Database | PostgreSQL, Prisma |
| Authentication and security | JWT, Argon2id, HttpOnly refresh cookies, CSRF checks on cookie-auth POSTs, Zod validation, Helmet, CORS allowlisting, authentication rate limiting |
| Object storage | Supabase Storage (private patient documents) |
| Testing | Vitest, Supertest, Testing Library |
| Deployment | Vercel (frontend), Railway (API), Supabase PostgreSQL and Storage |
| CI | GitHub Actions |

## Project Structure

```text
Hospital_Management_System/
├── frontend/                 React SPA
│   ├── src/api/              REST client, auth token handling, CSRF header
│   ├── src/app/              Shell, routing, navigation, theme
│   ├── src/auth/             In-memory session and permission-aware UI
│   ├── src/features/         Business screens and API hooks
│   ├── src/pages/            Login, password change, home, error pages
│   └── src/config/           Browser environment (`VITE_API_URL`)
├── backend/
│   ├── prisma/               Schema and versioned SQL migrations
│   ├── src/                  Express API, modules, middleware, scripts
│   │   ├── modules/          Domain modules (auth, patients, billing, …)
│   │   ├── scripts/          Admin bootstrap, demo seed, maintenance
│   │   └── storage/          Document storage drivers (Supabase / memory)
│   └── test/                 API, schema, and database tests
├── vercel.json               Vercel frontend deployment
├── render.yaml               Alternative Node API hosting blueprint (not current production)
└── .github/workflows/ci.yml  Lint, typecheck, tests, Prisma validate, build, audit
```

The frontend talks only to the REST API. API controllers call application services. Repositories are the only module layer that accesses Prisma.

## Supporting Scripts and Files

These files are not the interactive UI. They are used to build, test, demonstrate, migrate, and deploy the project.

### Application source code

`frontend/` and `backend/src/` contain the runtime application: the SPA, the Express API, authentication, validation, and business modules.

### Database migrations

`backend/prisma/` holds the Prisma schema and committed SQL migrations under `backend/prisma/migrations/`. Schema changes are applied with `prisma migrate deploy`. The API process does not migrate the database at startup.

### Demo and seed data

`backend/src/scripts/seed-demo.ts` and `backend/src/scripts/demo-seed/` populate a dedicated database with **fictional** demonstration data: users for every role, departments, employees, doctors, schedules, patients, appointments, admissions, medical records, laboratory work, medicines, inventory, prescriptions, billing, attendance, leave, patient documents, and sample audit rows.

The seed is destructive for application data. It preserves roles, permissions, role-permission assignments, and Prisma migration history. It does not drop the database or Supabase system tables.

During seed, the script generates small sample PDF files and stores them as patient documents so the document workflow can be demonstrated without uploading files by hand.

### Administrator bootstrap

`backend/src/scripts/bootstrap-admin.ts` (`npm run bootstrap:admin -w backend`) creates the approved role/permission catalog and the first administrator when no administrator exists. It is explicit, transactional, and safe to repeat. It does not expose a public registration endpoint.

### Role-permission synchronization

`backend/src/scripts/sync-role-permissions.ts` (`npm run sync:permissions -w backend`) upserts the approved roles and permissions without creating users.

### Testing utilities

- `backend/test/` — Vitest unit/API tests and a guarded PostgreSQL runner in `backend/test/database/`
- Frontend tests live beside feature code and run with Vitest and Testing Library
- Tests use an in-memory document storage driver and do not require live Supabase Storage

### Deployment and configuration

| File | Purpose |
|------|---------|
| `vercel.json` | Vercel install, build, output, and SPA routing rewrites for the frontend |
| `render.yaml` | Alternative Node API hosting blueprint (build, start, health check, non-secret environment names). Current production uses Railway, not Render. |
| `.nvmrc` | Node.js 22 |
| `.env.example`, `frontend/.env.example`, `backend/.env.example` | Placeholder environment variable names only |
| `.github/workflows/ci.yml` | CI on push and pull request |

### Other project tooling

- `backend/src/scripts/copy-audit-font.mjs` copies the audit-export font into the backend build output
- `backend/src/modules/audit/fonts/` supplies the font used for Unicode-safe audit PDF export
- `backend/prisma.config.ts` configures Prisma CLI schema and migration paths

## Prerequisites

- Node.js 22 or newer (see `.nvmrc`)
- npm (this repository uses npm workspaces and a single root lockfile)
- Git
- PostgreSQL for local development and database tests

Use a dedicated local database. Do not point local development or tests at production credentials or real patient data.

## Running Locally

### 1. Clone the repository

```sh
git clone https://github.com/Sachin-Mahesh-J/Hospital_Management_System.git
cd Hospital_Management_System
```

### 2. Install dependencies

From the repository root:

```sh
npm install
```

This installs both workspace packages (`frontend` and `backend`).

### 3. Configure environment variables

Copy the example files and replace placeholders.

Unix:

```sh
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

PowerShell:

```powershell
Copy-Item frontend/.env.example frontend/.env
Copy-Item backend/.env.example backend/.env
```

Set `VITE_API_URL` to `http://localhost:5000/api/v1`. In `backend/.env`, set a local `DATABASE_URL` and matching `DIRECT_URL`, a unique `JWT_ACCESS_SECRET` of at least 32 characters, and the other required variables listed below. For local document uploads you may keep `DOCUMENT_STORAGE_DRIVER=memory`.

### 4. Create the local PostgreSQL database

Create a dedicated database named `hms_development`. The example URL is:

```text
postgresql://postgres:YOUR_DATABASE_PASSWORD@localhost:5432/hms_development?schema=public
```

Use the same URL for `DIRECT_URL` locally.

### 5. Apply Prisma migrations

```sh
npm run prisma:validate -w backend
npm run prisma:migrate:deploy
npm run prisma:generate
```

### 6. Seed demonstration data (recommended)

The seed replaces application data in the target database.

Preview without writing:

```sh
npm run db:seed:demo:dry-run
```

Unix:

```sh
HMS_DEMO_SEED_ALLOW_LOCAL=true npm run db:seed:demo
```

PowerShell:

```powershell
$env:HMS_DEMO_SEED_ALLOW_LOCAL = "true"
npm run db:seed:demo
Remove-Item Env:HMS_DEMO_SEED_ALLOW_LOCAL
```

To create only the first administrator instead of the full demo dataset:

Unix:

```sh
HMS_BOOTSTRAP_ADMIN_USERNAME=admin HMS_BOOTSTRAP_ADMIN_PASSWORD='YOUR_STRONG_PASSWORD' npm run bootstrap:admin -w backend
```

PowerShell:

```powershell
$env:HMS_BOOTSTRAP_ADMIN_USERNAME = "admin"
$env:HMS_BOOTSTRAP_ADMIN_PASSWORD = "YOUR_STRONG_PASSWORD"
npm run bootstrap:admin -w backend
Remove-Item Env:HMS_BOOTSTRAP_ADMIN_USERNAME, Env:HMS_BOOTSTRAP_ADMIN_PASSWORD
```

The password policy is 12–128 characters, requires at least one letter and one number, requires at least four distinct characters, and rejects a small set of common passwords.

### 7. Start the backend

```sh
npm run dev -w backend
```

The API listens on port `5000` with the example configuration.

### 8. Start the frontend

```sh
npm run dev -w frontend
```

Or start both from the repository root:

```sh
npm run dev
```

### 9. Open the application

- Frontend: `http://localhost:5173`
- API health: `http://localhost:5000/api/v1/health`
- Swagger UI: `http://localhost:5000/api/docs`
- OpenAPI JSON: `http://localhost:5000/api/v1/openapi.json`

Sign in with a demo account from [Demo Data and Demo Accounts](#demo-data-and-demo-accounts).

## Environment Variables

Never commit real passwords, tokens, or API keys. Production values belong only in the Vercel, Railway, and Supabase dashboards.

### Frontend (`frontend/.env`)

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | Versioned API base URL, for example `http://localhost:5000/api/v1` locally or `https://YOUR_API_HOST/api/v1` in production |

This value is baked in at frontend build time.

### Backend (`backend/.env`)

| Variable | Purpose |
|----------|---------|
| `NODE_ENV` | `development`, `test`, or `production` |
| `PORT` | API port. Local default `5000`. Production hosts typically inject this. |
| `DATABASE_URL` | PostgreSQL URL used at runtime by Prisma |
| `DIRECT_URL` | PostgreSQL URL used by `prisma migrate deploy`. Locally this is the same database. Production may use a direct or session-mode URI. Express does not read this variable. |
| `TEST_DATABASE_URL` | Optional. Used when `NODE_ENV=test`. Database tests also derive `hms_test` from the local development URL. |
| `ALLOWED_ORIGINS` | Comma-separated exact browser origins allowed by CORS. Do not use `*`. |
| `LOG_LEVEL` | Pino log level |
| `JWT_ACCESS_SECRET` | High-entropy JWT signing secret (at least 32 characters) |
| `JWT_ISSUER` | Access-token issuer, example `hms-api` |
| `JWT_AUDIENCE` | Access-token audience, example `hms-web` |
| `AUTH_COOKIE_NAME` | Refresh-cookie name; default `hms_refresh` |
| `AUTH_COOKIE_DOMAIN` | Optional cookie domain; omit for a host-only cookie |
| `TRUST_PROXY` | `true` only behind a trusted reverse proxy (production) |
| `HOSPITAL_TIMEZONE` | IANA time zone for calendar-day, report, and dashboard boundaries (example `Asia/Colombo`) |
| `DEFAULT_CURRENCY` | ISO 4217 currency for invoices and payments (example `LKR`) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SECRET_KEY` | Backend-only Supabase secret. Never put this in Vercel or the frontend bundle. |
| `SUPABASE_STORAGE_BUCKET` | Private patient-document bucket |
| `DOCUMENT_SIGNED_URL_TTL_SECONDS` | Signed download lifetime; default `300` |
| `DOCUMENT_STORAGE_DRIVER` | `supabase` in production. `memory` is allowed locally and rejected when `NODE_ENV=production`. |

Script-only variables (do not leave them set):

| Variable | Purpose |
|----------|---------|
| `HMS_BOOTSTRAP_ADMIN_USERNAME` | First-administrator bootstrap username |
| `HMS_BOOTSTRAP_ADMIN_PASSWORD` | First-administrator bootstrap password |
| `HMS_DEMO_SEED_ALLOW_LOCAL` | Must be `true` to seed a local database |
| `HMS_DEMO_SEED_CONFIRM` | Required confirmation value to seed a remote database |

## Database

- Engine: PostgreSQL
- Access path: Prisma only
- Local database: `hms_development`
- Isolated database tests: `hms_test` on localhost port `5432`
- Production database: Supabase PostgreSQL

Apply schema changes with:

```sh
npm run prisma:migrate:deploy
```

Do not use `prisma db push` against production. Do not run migrations during application startup. Review committed SQL in `backend/prisma/migrations/` before deploying.

## Demo Data and Demo Accounts

The demo seed creates fictional hospital data for development and interview evaluation. It is not real clinical information.

Login uses **username and password**, not email.

> These credentials are for the demonstration environment only and must never be reused for real systems or real patient data.

| Role | Username | Password |
|------|----------|----------|
| Administrator | `admin` | `HmsDemo@123` |
| Administrator (operations) | `admin.ops` | `HmsDemo@123` |
| Doctor | `doctor` | `HmsDemo@123` |
| Cardiology doctor | `doctor.cardio` | `HmsDemo@123` |
| Pediatrics doctor | `doctor.pediatrics` | `HmsDemo@123` |
| Orthopedics doctor | `doctor.ortho` | `HmsDemo@123` |
| Dermatology doctor | `doctor.derma` | `HmsDemo@123` |
| Nurse | `nurse` | `HmsDemo@123` |
| Receptionist | `reception` | `HmsDemo@123` |
| Laboratory Staff | `lab` | `HmsDemo@123` |
| Pharmacist | `pharmacist` | `HmsDemo@123` |
| Accountant | `accountant` | `HmsDemo@123` |

The seed also creates disabled accounts `reception.inactive` and `nurse.inactive` so inactive-user behaviour can be demonstrated. Disabled accounts cannot sign in.

Start with `admin`, then repeat representative workflows as `doctor`, `reception`, `lab`, `pharmacist`, and `accountant`.

## Development Commands

From the repository root unless noted.

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start frontend and backend together |
| `npm run dev -w frontend` | Start the Vite frontend |
| `npm run dev -w backend` | Start the API with reload |
| `npm run build` | Production build of backend then frontend |
| `npm run start -w backend` | Run the compiled API (`node dist/server.js`) |
| `npm run typecheck` | Typecheck both workspaces |
| `npm run lint` | Lint both workspaces |
| `npm test` | Run frontend and backend unit/API tests |
| `npm run test:database` | Guarded PostgreSQL schema/API tests against local `hms_test` |
| `npm run prisma:generate` | Generate the Prisma client |
| `npm run prisma:migrate:deploy` | Apply committed migrations |
| `npm run prisma:validate -w backend` | Validate the Prisma schema |
| `npm run db:seed:demo` | Seed fictional demo data (destructive) |
| `npm run db:seed:demo:dry-run` | Print the seed plan without writing |
| `npm run bootstrap:admin -w backend` | Create the first administrator |
| `npm run sync:permissions -w backend` | Sync approved roles and permissions |
| `npm run preview -w frontend` | Preview the frontend production build |

## Testing

```sh
npm test
npm run test:database
npm run lint
npm run typecheck
```

`npm test` runs Vitest in both workspaces. Backend tests use Supertest against the Express app.

`npm run test:database` requires local PostgreSQL. The runner reads `DATABASE_URL` for `hms_development` on `localhost:5432`, creates `hms_test` if needed, applies migrations, and refuses non-local or differently named targets. It does not migrate cloud databases.

GitHub Actions runs lint, typecheck, tests, database tests against ephemeral PostgreSQL 16, production builds, Prisma validate, and `npm audit`.

## API

The backend is a versioned REST API.

| Endpoint | Description |
|----------|-------------|
| `/api/v1` | Versioned application routes |
| `/api/v1/health` | Process health (`status`, `service`, `timestamp`) |
| `/api/docs` | Swagger UI |
| `/api/v1/openapi.json` | OpenAPI 3.1 document |

Protected routes require a Bearer access token. Cookie-authenticated POST routes under `/api/v1/auth` also require an allowlisted `Origin` and header `X-HMS-CSRF: 1`.

Route groups include `/auth`, `/patients`, `/patients/:patientId/documents`, `/departments`, `/employees`, `/doctors`, `/appointments`, `/admissions`, `/attendance`, `/leave`, `/users`, `/audit`, `/medical-records`, `/prescriptions`, `/medicines`, `/lab`, `/pharmacy`, `/billing`, `/invoices`, `/payments`, `/reports`, and `/dashboard`.

## Deployment

Production topology:

```text
Browser → Vercel (frontend) → Railway (API) → Supabase PostgreSQL / Supabase Storage
```

- Vercel hosts the React frontend. `VITE_API_URL` is set in Vercel and baked in at build time.
- Railway hosts the Express API.
- Supabase provides PostgreSQL and private patient-document storage.
- Production secrets are stored in provider environment variables, not in Git.
- Production schema changes are applied separately with `npm run prisma:migrate:deploy` against `DIRECT_URL`.
- The application does not migrate or otherwise mutate the production schema during startup.

`render.yaml` remains in the repository as an alternative Node API hosting blueprint. It is not the current production deployment.

## Security

- Passwords are hashed with Argon2id.
- Access JWTs are short-lived (15 minutes) and held in browser memory.
- Refresh tokens are rotating, stored as HttpOnly cookies, and persisted only as SHA-256 hashes. Idle timeout is 30 minutes; absolute lifetime is seven days. Production cookies are `Secure` and `SameSite=None`, scoped to `/api/v1/auth`.
- Cookie-authenticated auth POST requests require an allowlisted `Origin` and `X-HMS-CSRF: 1`.
- Login is locked after five failed attempts (15 minutes). Authentication routes are rate limited.
- Each user has one role. The API enforces RBAC. Request bodies and queries are validated with Zod.
- HTTP responses use Helmet headers. CORS allows only configured exact origins, with credentials.
- Patient documents are stored privately, checked for type and size, checksummed, and downloaded through short-lived signed URLs.
- Security-sensitive and material operational actions are written to the audit log. Client error responses do not include stack traces.

## Current Scope

HMS covers identity, organization and staff, patients, appointments and calendar, medical records and prescriptions, laboratory, pharmacy, billing for consultation/laboratory/pharmacy charges, inpatient admission records, attendance and leave, patient documents, operational user administration, audit viewing/export, and named dashboard and report views.

Outpatient care is modelled as appointments plus medical records. Inpatient care is a minimal admission record, not a ward or bed system.

## Future / Out of Scope

The following are deferred and are **not** implemented:

- Mobile application
- Patient portal
- SMS and email notifications
- Telemedicine
- Insurance integration
- Automated clinical decision support
- Biometric authentication
- Bed and ward management
- Admission charges on invoices
- Attendance and leave reports
- Report CSV/PDF file export

Database backup, restore, and infrastructure recovery are provider-managed operational concerns (Railway and Supabase). They are not implemented as HMS application features.

## Production Demo

A deployed demo is available for evaluation.

- Application: [https://hospitalmanagementsystem-ruby.vercel.app/](https://hospitalmanagementsystem-ruby.vercel.app/)
- API health: [https://hms-api-production-01a8.up.railway.app/api/v1/health](https://hms-api-production-01a8.up.railway.app/api/v1/health)
- API docs: [https://hms-api-production-01a8.up.railway.app/api/docs](https://hms-api-production-01a8.up.railway.app/api/docs)

Use the [demonstration credentials](#demo-data-and-demo-accounts). These credentials are for the demonstration environment only and must never be reused for real systems or real patient data.

Suggested evaluation path:

1. Sign in as `admin` and review dashboard, users, audit, and reports.
2. As `reception`, register or search a patient, book an appointment, and open the calendar.
3. As `doctor`, open a medical record, prescription, or laboratory request.
4. As `lab` and `pharmacist`, walk the laboratory and dispensing workflows.
5. As `accountant`, open an invoice, payment, and printable receipt.
6. On a patient record, review uploaded documents (signed download links expire).
