# ADR-003: JWT Access and Rotating Refresh Sessions

Status: Accepted

## Context

The PDF requires secure login, logout, password management, and automatic session
timeout. Stateless access JWTs alone cannot provide reliable logout or session
revocation.

## Decision

Use short-lived JWT access tokens in frontend memory and opaque rotating refresh tokens
in `Secure`, `HttpOnly` cookies. Persist only refresh-token hashes and session metadata.

## Reason

Short-lived access tokens limit exposure, while server-side refresh sessions support
rotation, idle/absolute expiry, logout, and account-wide revocation.

## Alternatives considered

- Long-lived JWT only: rejected due to weak revocation and logout semantics.
- Access JWT in local storage: rejected because script access increases token theft
  impact.
- Fully server-side session cookie: valid, but does not follow the approved JWT
  requirement.

## Consequences

The API needs session persistence, CSRF defenses, careful credentialed CORS, and replay
detection. Cross-site cookie behavior on Vercel/Render platform domains must be tested
early; a same-origin proxy may be needed.
