# Hospital Management System

Foundation for a modular hospital management application built with React,
TypeScript, Material UI, Node.js, Express, Prisma, and PostgreSQL.

## Milestone status

Milestone 1 initializes the frontend, backend, REST API, validation, logging, error
handling, OpenAPI, testing, and Prisma tooling foundations. It does not implement HMS
business modules, authentication, a physical database model, migrations, or cloud
deployment.

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

No Prisma models or migrations are present. The physical-schema approval gate in
`docs/database/logical-data-model.md` must pass before either is added.

## Project structure

```text
backend/
  prisma/             Prisma PostgreSQL tooling foundation
  src/                Express API, configuration, middleware, and modules
  test/               Supertest/Vitest API tests
frontend/
  src/api/            Central REST client and error mapping
  src/app/            Theme and reusable application shell
  src/config/         Browser environment configuration
docs/                 Requirements, architecture, security, data, and workflow docs
```

The frontend communicates only with the REST API. Controllers delegate to application
services, and future repositories will be the only business-module layer that accesses
Prisma.

## Approved stack

- Frontend: React, TypeScript, Material UI, Vite
- Backend: Node.js, Express, TypeScript
- API: versioned REST with Zod validation and OpenAPI/Swagger
- Data: PostgreSQL through Prisma
- Tests: Vitest and Supertest
- Target cloud: Vercel, Render, and Supabase PostgreSQL
- Version control: Git with GitHub as the primary remote

## Scope control

Implementation proceeds one reviewed milestone at a time. Cursor must not commit or
push unless the project owner explicitly requests it.
