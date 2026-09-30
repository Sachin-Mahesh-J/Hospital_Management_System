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

Upload validation, authorization, checksums, and signed download operations are
backend-mediated. Default signed URL TTL is 300 seconds. Orphan reconciliation,
retention jobs, backup of storage objects, and malware scanning remain production
considerations and are not implemented as application jobs.

Service credentials remain backend-only. Tests always use an in-memory storage double.
Local development may set `DOCUMENT_STORAGE_DRIVER=memory` when a live non-production
bucket is not available. Production must use private Supabase Storage.
