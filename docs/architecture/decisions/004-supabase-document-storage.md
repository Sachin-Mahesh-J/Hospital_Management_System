# ADR-004: Private Supabase Document Storage

Status: Accepted

## Context

Patient document upload is required. Render's local filesystem is ephemeral and is not
an acceptable durable or scalable record store.

## Decision

Use a private Supabase Storage bucket for document objects and PostgreSQL for authorized
metadata. The backend controls short-lived signed upload/download operations.

## Reason

Supabase Storage fits the selected cloud platform, supports private object storage, and
avoids introducing another provider. Separating object bytes from relational metadata
keeps database access efficient.

## Alternatives considered

- Render filesystem: rejected because it is ephemeral and instance-local.
- PostgreSQL binary storage: rejected for operational and database-size concerns.
- Amazon S3 or another provider: valid, but unnecessary for the current project.
- Public bucket: rejected because documents contain sensitive patient information.

## Consequences

Upload validation, authorization, checksums, signed operations, orphan reconciliation,
retention, backup, and eventual malware scanning must be designed explicitly. Service
credentials remain backend-only.
