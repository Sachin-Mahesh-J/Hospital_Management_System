# ADR-002: PostgreSQL and Prisma

Status: Accepted

## Context

HMS data is highly relational and requires constraints, transactions, reporting, and
traceable migrations.

## Decision

Use PostgreSQL as the relational database and Prisma as the normal schema, migration,
and type-safe data-access layer.

## Reason

PostgreSQL provides mature relational constraints, transactions, indexing, and
fixed-precision data support. Prisma integrates well with TypeScript and makes schema
changes and common queries explicit and reviewable.

## Alternatives considered

- Document database: rejected because the domain is relational and consistency-heavy.
- Direct SQL query layer: possible, but increases mapping and migration work without a
  current benefit.
- Other relational databases: viable, but PostgreSQL is the approved local and Supabase
  platform database.

## Consequences

Developers must understand generated queries, indexes, and transaction behavior rather
than treating the ORM as a performance guarantee. Raw SQL requires a documented,
measured need and focused tests.
