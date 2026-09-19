# Development, Testing, and Git Workflow

Status: Approved working agreement

## Incremental delivery

Implement the smallest complete vertical milestone. Before changing code:

1. Link the change to an approved requirement.
2. Identify affected data, API, frontend, security, tests, and documentation.
3. Resolve only material ambiguity.
4. Avoid unrelated cleanup unless it blocks the milestone.

After changing code:

1. Run relevant tests, lint, type checks, and production builds.
2. Review changed files, security impact, error handling, and dead code.
3. Update documentation to match implemented behavior.
4. Report changed files, verification, remaining concerns, and milestone status.
5. Recommend one Conventional Commit message.

Cursor must not commit or push unless explicitly instructed.

## Milestone sequence

1. Requirements approval.
2. Architecture and ADR documentation.
3. Logical database design.
4. Frontend/backend project initialization and quality tooling.
5. Prisma physical schema, initial migration, and database connection verification.
6. Configuration, logging, errors, validation, OpenAPI, authentication, and
   authorization infrastructure.
7. User and access management.
8. Patient management and secure documents.
9. Departments, employees, doctor profiles, and schedules.
10. Appointments.
11. Medical records and prescriptions.
12. Clarified admission/inpatient-outpatient workflows.
13. Laboratory.
14. Pharmacy and transactional inventory.
15. Billing, payments, and receipts.
16. Attendance and leave.
17. Reports and dashboard.
18. Audit completion and security hardening.
19. Full quality and critical-workflow review.
20. Deployment preparation and cloud deployment.
21. Interview-readiness documentation and walkthrough.

Logical design precedes scaffolding, but the physical Prisma migration follows Prisma
project initialization.

Product Milestone 6 delivered Patient Management registration, search, details,
demographic/status updates, patient permissions, and TanStack Query. Medical history
and patient document storage remain deferred; they still belong with later workflow
milestones rather than this delivery.

## Testing strategy

### Unit tests

- Domain status transitions and calculations.
- Authorization policies.
- Appointment conflict logic.
- Invoice totals and payment limits.
- Stock allocation, movements, and expiry behavior.
- Zod schemas and safe error mapping where useful.

### Integration tests

- Application services with isolated PostgreSQL.
- Prisma constraints and repository behavior.
- Transaction commit and rollback.
- Refresh-session rotation and revocation.
- Document metadata/storage orchestration with isolated storage.

### HTTP tests

Use Supertest for login, invalid credentials, expiry/logout, RBAC, validation, patient
registration/search/update, appointment workflows, medical records, laboratory,
pharmacy, billing, reports, and predictable errors.

Tests must include unauthorized and conflict paths, not only success cases.

### Frontend tests

Test important forms, permission-aware navigation, API error presentation,
loading/error/empty states, and critical workflow interactions. Add browser end-to-end
tests for a small number of interview-critical workflows when the UI exists.

### Isolation

- Never run tests against development or production data.
- Use deterministic factories/fixtures.
- Reset or isolate database state between tests.
- Use real PostgreSQL for integration behavior that depends on PostgreSQL/Prisma.

## Git workflow

- GitHub is the primary writable remote and CI source.
- Use short-lived feature branches from the protected primary branch.
- If required, Bitbucket is a one-way mirror, not a second development source.
- Keep secrets, `.env` files, logs, uploads, build output, coverage, and editor-local
  files out of version control.
- Do not commit failing builds or knowingly stale documentation.

Recommended commit forms:

- `docs(requirements): document HMS scope and architecture plan`
- `feat(auth): implement rotating refresh sessions`
- `feat(patient): implement patient registration`
- `test(appointment): cover scheduling conflicts`
- `fix(billing): correct invoice balance calculation`

## Pull-request/CI gates

When repository automation is configured, require:

- dependency installation from a lockfile;
- lint and formatting checks;
- TypeScript type checks;
- unit and API/integration tests;
- frontend and backend production builds;
- migration consistency checks;
- dependency and secret scanning.

## Documentation rule

Planned behavior must be labeled as planned. OpenAPI and user-facing documentation must
not advertise endpoints or workflows that are not implemented.
