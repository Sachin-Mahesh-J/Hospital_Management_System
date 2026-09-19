# ADR-005: Vercel, Render, and Supabase Deployment

Status: Accepted

## Context

The interview project needs public platform URLs without purchasing a domain and must
remain portable between local and production environments.

## Decision

Host the React SPA on Vercel, the Express API on Render, and PostgreSQL plus private
document storage on Supabase.

## Reason

The platforms align with the approved stack and provide a clear separation between
static frontend delivery, long-running API execution, relational data, and object
storage.

## Alternatives considered

- A paid custom domain: rejected because it is unnecessary.
- One additional hosting provider: rejected because it adds operational complexity.
- Hosting uploads on Render: rejected because the filesystem is not durable.
- Local-only deployment assumptions: rejected because cloud deployment is current
  scope.

## Consequences

Configuration, CORS, cross-site cookies, connection limits, cold starts, migrations,
provider quotas, backup capabilities, and restore procedures require explicit
verification. Free plans may not meet the PDF's high-availability and backup targets.
