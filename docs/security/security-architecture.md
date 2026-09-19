# Security Architecture

Status: Approved design; Milestone 5 identity, RBAC, authentication audit, CORS, safe
errors, request IDs, security headers, and log redaction are implemented. Business
resource policies and upload controls remain planned.

## Security objectives

- Protect patient, clinical, employee, and financial information.
- Authenticate users securely and enforce least privilege.
- Preserve an attributable audit trail for material actions.
- Prevent secrets and sensitive internals from reaching source control, logs, or clients.
- Treat all browser input and uploaded content as untrusted.

This project follows security-conscious engineering but makes no regulatory-compliance
claim because jurisdiction and legal obligations are not specified.

## Authentication

- Hash passwords with Argon2id (`m=19456 KiB`, `t=2`, `p=1`, 32-byte hash).
- Return the same generic login failure for unknown users and invalid passwords.
- Rate-limit login and refresh operations.
- Issue short-lived signed JWT access tokens with issuer, audience, subject, expiry, and
  a token/session identifier.
- Keep access tokens in frontend memory.
- Place the opaque rotating refresh token in a `Secure`, `HttpOnly` cookie.
- Persist only a strong hash of each refresh token with user, expiry, creation,
  last-use, revocation, and replacement metadata.
- Revoke active sessions after password reset or account disablement.
- Enforce both idle and absolute session expiry.

Production cross-site cookie behavior must be proven with platform URLs. Refresh/logout
requests use credentialed CORS, exact Origin validation, and the non-simple
`X-HMS-CSRF: 1` header. Production cookies are host-only where possible and use
`Secure`, `HttpOnly`, `SameSite=None`, and `/api/v1/auth` scope. If browser restrictions
make direct Vercel-to-Render refresh cookies unreliable, evaluate a same-origin Vercel
API proxy before changing token storage.

The implementation-defined password policy is 12–128 characters, at least one letter
and number, and rejection of common or trivially repetitive values. It is an
engineering policy for this milestone, not a claim from the source PDF.

## Authorization

- Backend middleware establishes authenticated identity.
- Application policies check explicit permissions for each operation.
- Patient Management currently authorizes `patient.read`, `patient.create`, and
  `patient.update` on the backend. Resource-level “relevant patient” scoping remains
  future work because assignment and care-team context do not exist yet.
- Resource checks restrict access to relevant patients, assignments, or work queues.
- Role membership never bypasses contextual checks.
- Administrator authority does not automatically include clinical editing.
- Frontend hiding and route guards are not security controls.
- Permission changes and access denials important to investigation are auditable.

## Input and API protection

- Zod validates bodies, parameters, and query strings at the API boundary.
- Schemas reject unexpected fields where practical.
- Collection sizes, text lengths, dates, decimals, and enums are bounded.
- Use Prisma parameterization; raw SQL requires explicit justification and parameterized
  values.
- Restrict JSON/body sizes and request rates.
- Apply secure response headers and a narrow production CORS allowlist.
- Return safe, stable errors with a correlation ID.

## Patient document security

- Use a private Supabase Storage bucket; no public object URLs.
- Generate unguessable object keys independently from submitted filenames.
- Normalize filenames for display and never use them as filesystem paths.
- Enforce approved file-size and MIME allowlists and inspect file signatures where
  practical.
- Reject executable or active content unless a later approved use case requires and
  safely processes it.
- Authorize metadata creation, upload completion, download, replacement, and deletion.
- Use short-lived signed operations only after authorization.
- Store checksum, size, detected type, storage key, patient, uploader, and timestamps in
  PostgreSQL.
- Audit document access and state changes without logging document contents.
- Define malware scanning before production handling of untrusted real-world files.

## Sensitive data handling

- Collect only fields justified by approved workflows.
- Use TLS for all production traffic.
- Use least-privilege database and storage credentials.
- Keep secrets in provider environment configuration and local uncommitted `.env`
  files; commit variable names only in `.env.example`.
- Do not log passwords, tokens, cookies, diagnoses, document data, or full request
  bodies.
- Avoid copying sensitive data into audit metadata.
- Use controlled correction and deactivation rather than destructive history deletion.

## Audit model

Audit at minimum:

- login success/failure, refresh-session revocation, and password/account changes;
- user, role, and permission changes;
- patient and document creation/access/material updates;
- clinical record, prescription, and report changes;
- laboratory collection, result entry, finalization, and correction;
- dispensing and inventory adjustments;
- invoice, payment, receipt, refund/reversal actions when supported;
- administrative report exports when supported.

Each event records actor, action, resource type and identifier, timestamp, request ID,
outcome, and minimal structured change metadata. Audit records are append-oriented and
cannot be changed by ordinary application roles.

## Error and logging policy

- Validation errors identify safe field issues.
- Authentication and authorization errors do not reveal protected resource existence
  unnecessarily.
- Conflict errors describe correctable business conflicts without database details.
- Unexpected production errors return a generic message and request ID.
- Operational logs and audit logs have separate purposes and retention controls.

## Security verification

- Unit-test permission and domain policies.
- API-test unauthenticated, unauthorized, expired, revoked, malformed, and cross-resource
  access.
- Test refresh rotation/replay handling and logout revocation.
- Test upload size/type/access restrictions.
- Test production error redaction and log filtering.
- Add dependency and secret scanning when CI is initialized.
- Conduct a focused security review before public deployment.

## Remaining policy inputs

Before processing real patient data, define jurisdiction, retention, consent, data
subject rights, breach response, storage region, backup encryption, administrator access
review, and incident ownership.
