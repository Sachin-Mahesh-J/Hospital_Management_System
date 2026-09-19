# ADR-001: TypeScript Modular Monolith

Status: Accepted

## Context

The HMS spans several related modules and requires clear boundaries, transactions, and
an interview-friendly design without unnecessary operational complexity.

## Decision

Use React + TypeScript + Material UI for the SPA and Node.js + Express + TypeScript for
one modular-monolith REST API. Organize backend code into presentation, application,
domain-policy, and Prisma data-access responsibilities.

## Reason

TypeScript provides shared language skills and compile-time contracts across the stack.
React and Material UI support the required responsive interfaces. A modular monolith
keeps deployment and cross-module transactions simple while retaining maintainable
boundaries.

## Alternatives considered

- Microservices: rejected because independent scaling/deployment does not justify
  distributed transactions and operational overhead.
- Server-rendered full-stack framework: not selected because the required architecture
  explicitly separates a React frontend and Express REST API.
- Java/.NET backend: valid technologies, but outside the approved stack.

## Consequences

Module boundaries require discipline inside one repository. The backend scales as one
unit initially. Services may be extracted later only with measured need.
