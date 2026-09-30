# Patient Documents

Status: Implemented (Milestone 16; D-030 / ADR-004)

## Scope

Authorized staff can upload, list, update metadata, obtain short-lived download access,
and soft-delete patient documents. Stored objects are private. The browser never
receives a permanent public storage URL.

Permissions are dedicated and are not implied by `patient.read`:

- `patient_document.read`
- `patient_document.create`
- `patient_document.update`
- `patient_document.delete`

Roles: Administrator, Receptionist, Doctor, Nurse.

## Storage

Private Supabase Storage. The backend authorizes every operation, stores metadata in
PostgreSQL, and issues short-lived signed download URLs after authorization.

Configuration:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (backend only)
- `SUPABASE_STORAGE_BUCKET`
- `DOCUMENT_SIGNED_URL_TTL_SECONDS` (default 300; allowed 30–900)
- `DOCUMENT_STORAGE_DRIVER` (`supabase` or `memory`). `memory` is allowed only in
  development so local work can proceed without a live bucket. Production rejects
  `memory`. Automated tests always use the in-memory double.

Object keys are random (`patient-documents/<uuid>`). Service credentials, bucket URLs,
and signed URLs are not written to audit logs. Document bytes are not logged.

The in-memory driver stores bytes in process memory and issues non-production placeholder
signed URLs. It is not a substitute for private Supabase Storage in any deployed
environment.

## File policy

- Maximum size: 10 MB
- Allowed types, detected from magic bytes: PDF, JPEG, PNG
- Categories: `medical_report`, `laboratory_report`, `prescription`, `referral`, `other`
- Duplicate files are allowed
- Metadata (title, category, description) may be updated
- The stored file is immutable; replacement requires a new upload
- Delete is logical (`deleted`) only; the object is not removed
- Documents remain while the patient record exists
- No automatic retention job

## Malware scanning

Malware scanning is not implemented. Do not treat this application as providing
scanning. Production handling of untrusted real-world files requires scanning
infrastructure before go-live.

## API

- `GET/POST /api/v1/patients/:patientId/documents`
- `GET/PATCH/DELETE /api/v1/patients/:patientId/documents/:documentId`
- `POST /api/v1/patients/:patientId/documents/:documentId/access`

Upload is multipart field `file` plus title/category/description. Access returns
`{ url, expiresAt }`.

## Frontend

The patient detail page hosts the document panel. Open requests a signed URL and
opens it in a new tab. Demographic permission alone cannot list or open documents.
