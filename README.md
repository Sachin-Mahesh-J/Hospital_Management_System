# Hospital Management System

Foundation for a modular hospital management application built with React,
TypeScript, Material UI, Node.js, Express, Prisma, and PostgreSQL.

## Milestone status

Milestone 6 adds Patient Management to the Milestone 5 authentication foundation:
registration, demographic and status updates, search, paginated listing, details,
patient-specific RBAC and audit events, plus TanStack Query server-state management.
Medical history and patient document storage remain deferred.

The primary requirements source remains `Hospital_system.pdf`. Approved planning and
architecture documents are under `docs/`.

## Prerequisites

- Node.js 22 or newer
- npm 11 or newer
- PostgreSQL for local database work

Use a dedicated local development database. Never use production Supabase credentials
or patient data in local development or automated tests.

## Installation

From the repository root:

```sh
npm install
```

The root npm workspace installs both applications and produces one lockfile.

## Environment configuration

Copy the example files and replace placeholder values:

```powershell
Copy-Item frontend/.env.example frontend/.env
Copy-Item backend/.env.example backend/.env
```

Frontend:

- `VITE_API_URL` — versioned backend base URL, for example
  `http://localhost:5000/api/v1` during local development.

Backend:

- `NODE_ENV` — `development`, `test`, or `production`.
- `PORT` — API listening port.
- `DATABASE_URL` — PostgreSQL connection URL used by Prisma tooling.
- `ALLOWED_ORIGINS` — comma-separated exact browser origins allowed by CORS.
- `LOG_LEVEL` — Pino log level.
- `JWT_ACCESS_SECRET` — high-entropy JWT signing secret (at least 32 characters).
- `JWT_ISSUER` / `JWT_AUDIENCE` — exact access-token verification values.
- `AUTH_COOKIE_NAME` — refresh-cookie name; defaults to `hms_refresh`.
- `AUTH_COOKIE_DOMAIN` — optional cookie domain; normally omitted for a host-only
  cookie.
- `TRUST_PROXY` — set to `true` only behind Render's trusted reverse proxy.

Real credentials belong only in uncommitted `.env` files or deployment-provider secret
configuration.

## Local development

Start both applications:

```sh
npm run dev
```

Or start them separately:

```sh
npm run dev -w backend
npm run dev -w frontend
```

With the example configuration, the frontend runs at `http://localhost:5173`, the API
runs at `http://localhost:5000`, the health endpoint is
`http://localhost:5000/api/v1/health`, and Swagger UI is available at
`http://localhost:5000/api/docs`.

The frontend health panel calls the API through `VITE_API_URL`; it does not contain a
hardcoded backend URL.

## Quality commands

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

To validate or regenerate the Prisma client foundation, first provide `DATABASE_URL`,
then run:

```sh
npm run prisma:validate -w backend
npm run prisma:generate
```

The complete Prisma schema and initial migration are present under `backend/prisma/`.
Apply migrations only to a dedicated development database after reviewing the SQL.

For local database setup, create `hms_development`, copy `backend/.env.example` to
`backend/.env`, replace only the password placeholder, and run:

```sh
npm run prisma:validate -w backend
npm run prisma:migrate:deploy
npm run prisma:generate
```

Schema-level constraint tests use a separate `hms_test` database. The guarded runner
derives its connection from the local `hms_development` URL, creates `hms_test` when
needed, applies the migration, and refuses non-local or differently named targets:

```sh
npm run test:database
```

Neither command deploys to Supabase or any other cloud database.

## Authentication setup

Authentication uses a 15-minute access JWT held only in browser memory. A rotating
opaque refresh token is held in an HttpOnly cookie; only its SHA-256 hash is stored.
Refresh sessions have a 30-minute idle timeout and a seven-day absolute lifetime.

Bootstrap the seven approved system roles and the first administrator only after local
migrations are applied:

```powershell
$env:HMS_BOOTSTRAP_ADMIN_USERNAME = "admin"
$env:HMS_BOOTSTRAP_ADMIN_PASSWORD = "choose-a-strong-password-42"
npm run bootstrap:admin -w backend
Remove-Item Env:HMS_BOOTSTRAP_ADMIN_USERNAME, Env:HMS_BOOTSTRAP_ADMIN_PASSWORD
```

The command is explicit, transactional, safe to repeat, and does not expose a public
registration endpoint. It refuses to replace an existing administrator or reuse a
non-administrator username. The password policy is 12–128 characters, requires at
least one letter and number, and rejects common or trivially repetitive values.

For direct Vercel-to-Render deployment, production refresh cookies use
`Secure; SameSite=None`, credentialed CORS accepts only configured exact origins, and
cookie-auth POST requests require `X-HMS-CSRF: 1` plus an allowlisted `Origin`.
Browsers that block third-party cookies may require the already-approved same-origin
Vercel proxy fallback after deployment testing.

## Project structure

```text
backend/
  prisma/             Prisma PostgreSQL tooling foundation
  src/                Express API, authentication, middleware, and modules
  test/               Supertest/Vitest API tests
frontend/
  src/api/            Central REST client and error mapping
  src/app/            Theme and reusable application shell
  src/auth/           In-memory authentication and permission-aware UI
  src/features/       Business UI, API hooks, and server-state queries
  src/config/         Browser environment configuration
docs/                 Requirements, architecture, security, data, and workflow docs
```

The frontend communicates only with the REST API. Controllers delegate to application
services, and focused business-module repositories are the only module layer that
accesses Prisma. Patient API, permissions, query keys, and deferred scope are documented
in `docs/development/patient-management.md`.

## Approved stack

- Frontend: React, TypeScript, Material UI, Vite, TanStack Query
- Backend: Node.js, Express, TypeScript
- API: versioned REST with Zod validation and OpenAPI/Swagger
- Data: PostgreSQL through Prisma
- Tests: Vitest and Supertest
- Target cloud: Vercel, Render, and Supabase PostgreSQL
- Version control: Git with GitHub as the primary remote

## Scope control

Implementation proceeds one reviewed milestone at a time. Cursor must not commit or
push unless the project owner explicitly requests it.
