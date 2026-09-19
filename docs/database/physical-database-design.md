# Physical Database Design

Status: Approved physical design; Milestone 3 schema and initial migration implemented

## 1. Purpose

This document converts the approved HMS requirements and logical model into a proposed
physical PostgreSQL schema. It defines storage types, keys, constraints, indexes,
relationships, transaction boundaries, and security-sensitive data handling. The
approved design is implemented by the Milestone 3 Prisma schema and initial migration.

Sources, in precedence order:

1. `Hospital_system.pdf`, inspected on 2026-09-19.
2. Accepted architecture decisions under `docs/architecture/decisions/`.
3. `docs/database/logical-data-model.md` and
   `docs/requirements/requirements-analysis.md`.
4. Project-owner decisions recorded as D-012 through D-020 in the decision register.

The PDF names capabilities and database areas but does not define fields, workflow
states, cardinalities, or physical constraints. Those details below are either traced
to accepted decisions, justified by relational/transaction integrity, or marked
`PENDING DECISION`.

## 2. Database technology

- PostgreSQL is the relational source of truth.
- Prisma ORM is the normal future schema, migration, and application data-access layer.
- Development uses a dedicated local PostgreSQL database.
- Production is targeted for Supabase PostgreSQL. It is not deployed yet.
- `pgcrypto` is proposed for `gen_random_uuid()`.
- `btree_gist` is proposed for concurrency-safe appointment overlap constraints.
- Raw migration SQL will be required for expression indexes, partial indexes, and
  exclusion constraints that Prisma schema syntax cannot fully represent.

## 3. Naming conventions

- Tables: plural `snake_case`, such as `medical_records`.
- Columns: singular `snake_case`.
- Primary keys: `id`; constraint `pk_<table>`.
- Foreign keys: `<entity>_id`; constraint `fk_<table>_<column>`.
- Unique constraints: `uq_<table>_<columns>`.
- Check constraints: `ck_<table>_<rule>`.
- Indexes: `idx_<table>_<columns>`; partial-index predicates are named descriptively.
- Timestamps: `timestamptz`, stored in UTC, named with `_at`.
- Hospital-local calendar dates: `date`, named with `_on` or `_date`.
- Primary keys: UUID with `DEFAULT gen_random_uuid()`.
- Mutable rows normally have `created_at DEFAULT now()` and `updated_at DEFAULT now()`.
  The application must update `updated_at`; PostgreSQL has no implicit on-update rule.
- Historical event rows use `created_at` or `occurred_at` and are append-oriented.
- Currency codes are `varchar(3)` and must match `^[A-Z]{3}$`; application validation
  also restricts them to an approved ISO 4217 configuration/reference set.
- Money is `numeric(19,4)` following D-018. Application services apply the configured
  currency's rounding rules.
- All foreign keys use `ON UPDATE NO ACTION`. `ON DELETE RESTRICT` is the default and is
  repeated only where a different behavior is proposed.

## 4. Table design

### 4.1 Identity, authorization, sessions, and audit

#### `users`

Purpose: Authentication identities; patients are not users.

| Column | PostgreSQL type | Nullable | Key | Default | Description |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | No | PK | `gen_random_uuid()` | Internal identity |
| `username` | `varchar(100)` | No |  |  | Login name; trimmed by application |
| `password_hash` | `varchar(255)` | No |  |  | Argon2id hash; never plaintext |
| `status` | `varchar(20)` | No |  | `'pending'` | `pending`, `active`, `locked`, or `disabled` |
| `password_changed_at` | `timestamptz` | No |  | `now()` | Password/session invalidation boundary |
| `last_login_at` | `timestamptz` | Yes |  |  | Last successful login |
| `failed_login_count` | `integer` | No |  | `0` | Consecutive failed attempts |
| `locked_until` | `timestamptz` | Yes |  |  | Temporary lock expiry |
| `created_at` | `timestamptz` | No |  | `now()` | Creation time |
| `updated_at` | `timestamptz` | No |  | `now()` | Last modification |

- Unique: expression index `uq_users_username_ci` on `lower(username)`.
- Checks: nonblank username; valid status; `failed_login_count >= 0`.
- Indexes: `idx_users_status` on `status`.
- Delete: referenced users are retained and disabled; historical FKs restrict deletion.

#### `roles`

Purpose: Named RBAC roles, including the seven roles named by the PDF.

| Column | PostgreSQL type | Nullable | Key | Default | Description |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | No | PK | `gen_random_uuid()` | Role identity |
| `code` | `varchar(50)` | No | UK |  | Stable application code |
| `name` | `varchar(100)` | No | UK |  | Display name |
| `description` | `text` | Yes |  |  | Role purpose |
| `status` | `varchar(20)` | No |  | `'active'` | `active` or `inactive` |
| `is_system` | `boolean` | No |  | `false` | Protects baseline roles |
| `created_at` | `timestamptz` | No |  | `now()` | Creation time |
| `updated_at` | `timestamptz` | No |  | `now()` | Last modification |

- Unique: `code`, `name`; codes are lowercase application identifiers.
- Checks: nonblank code/name; valid status.
- Indexes: unique indexes satisfy lookup paths.
- Delete: restricted when assigned; use `inactive`.

#### `permissions`

Purpose: Stable operation-level permissions used by backend authorization policies.

| Column | PostgreSQL type | Nullable | Key | Default | Description |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | No | PK | `gen_random_uuid()` | Permission identity |
| `code` | `varchar(100)` | No | UK |  | Stable code such as `patient.read` |
| `description` | `varchar(500)` | No |  |  | Authorized operation |
| `created_at` | `timestamptz` | No |  | `now()` | Creation time |
| `updated_at` | `timestamptz` | No |  | `now()` | Last modification |

- Checks: nonblank code and description.
- Delete: restricted when granted.

#### `user_roles`

Purpose: Many-to-many assignment of roles to users with attribution.

| Column | PostgreSQL type | Nullable | Key | Default | Description |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | No | PK | `gen_random_uuid()` | Assignment identity |
| `user_id` | `uuid` | No | FK |  | Assigned user |
| `role_id` | `uuid` | No | FK |  | Assigned role |
| `assigned_by_user_id` | `uuid` | Yes | FK |  | Actor; null only for bootstrap/system |
| `assigned_at` | `timestamptz` | No |  | `now()` | Assignment time |

- Foreign keys: all to `users`/`roles`, `ON DELETE RESTRICT`.
- Unique: `(user_id, role_id)`.
- Indexes: `idx_user_roles_role_id` on `role_id`; the unique index starts with
  `user_id`.
- Relationship: `users` many-to-many `roles`.

#### `role_permissions`

Purpose: Many-to-many grants from roles to permissions.

| Column | PostgreSQL type | Nullable | Key | Default | Description |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | No | PK | `gen_random_uuid()` | Grant identity |
| `role_id` | `uuid` | No | FK |  | Role |
| `permission_id` | `uuid` | No | FK |  | Permission |
| `created_at` | `timestamptz` | No |  | `now()` | Grant time |

- Foreign keys: `role_id` to `roles`, `permission_id` to `permissions`, restricted.
- Unique: `(role_id, permission_id)`.
- Indexes: `idx_role_permissions_permission_id`; the unique index serves role lookup.
- Relationship: `roles` many-to-many `permissions`.

#### `refresh_sessions`

Purpose: Hashed rotating refresh-token sessions supporting logout and timeout.

| Column | PostgreSQL type | Nullable | Key | Default | Description |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | No | PK | `gen_random_uuid()` | Session identity |
| `user_id` | `uuid` | No | FK |  | Session owner |
| `token_hash` | `varchar(255)` | No | UK |  | Strong token hash; never raw token |
| `expires_at` | `timestamptz` | No |  |  | Absolute expiry |
| `idle_expires_at` | `timestamptz` | No |  |  | Idle expiry |
| `last_used_at` | `timestamptz` | Yes |  |  | Last successful rotation/use |
| `revoked_at` | `timestamptz` | Yes |  |  | Revocation time |
| `revoke_reason` | `varchar(100)` | Yes |  |  | Bounded reason code |
| `replaced_by_session_id` | `uuid` | Yes | FK |  | Rotated successor |
| `user_agent_hash` | `varchar(128)` | Yes |  |  | Optional bounded client fingerprint |
| `created_at` | `timestamptz` | No |  | `now()` | Session creation |

- Unique: `replaced_by_session_id` when non-null so rotation is a chain.
- Checks: expiries after `created_at`; `idle_expires_at <= expires_at`; replacement
  differs from self; revocation reason is present when revoked.
- Indexes: `idx_refresh_sessions_user_active` on
  `(user_id, expires_at, idle_expires_at)` where `revoked_at IS NULL`.
- Delete: user and replacement references restrict deletion; expired sessions are
  removed only under an approved retention policy.
- Rotation/replay rule: a successor belongs to the same user, is created after its
  predecessor, and cannot form a cycle. Rotation revokes the predecessor and creates
  its successor in one locked transaction.

#### `audit_logs`

Purpose: Append-only security and material domain-action history.

| Column | PostgreSQL type | Nullable | Key | Default | Description |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | No | PK | `gen_random_uuid()` | Audit event identity |
| `occurred_at` | `timestamptz` | No |  | `now()` | Event time |
| `actor_user_id` | `uuid` | Yes | FK |  | Null only for anonymous/system events |
| `action` | `varchar(100)` | No |  |  | Stable action code |
| `resource_type` | `varchar(100)` | No |  |  | Stable resource category |
| `resource_id` | `uuid` | Yes |  |  | Resource identifier without polymorphic FK |
| `outcome` | `varchar(20)` | No |  |  | `success`, `failure`, or `denied` |
| `request_id` | `uuid` | Yes |  |  | Request correlation ID |
| `metadata` | `jsonb` | No |  | `'{}'::jsonb` | Minimal non-secret structured context |
| `source_ip` | `inet` | Yes |  |  | Optional source address |

- Checks: nonblank action/resource type; valid outcome; metadata must be a JSON object.
- Indexes: `(actor_user_id, occurred_at DESC)`,
  `(resource_type, resource_id, occurred_at DESC)`, and `(request_id)`.
- Delete/update: application runtime role receives no update/delete permission.
  Retention remains `PENDING DECISION`.

### 4.2 Organization, doctors, and staff

#### `departments`

Purpose: Hospital organizational departments used for doctors and employees.

| Column | PostgreSQL type | Nullable | Key | Default | Description |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | No | PK | `gen_random_uuid()` | Department identity |
| `code` | `varchar(30)` | No | UK |  | Stable business code |
| `name` | `varchar(150)` | No | UK |  | Department name |
| `description` | `text` | Yes |  |  | Description |
| `status` | `varchar(20)` | No |  | `'active'` | `active` or `inactive` |
| `created_at` | `timestamptz` | No |  | `now()` | Creation time |
| `updated_at` | `timestamptz` | No |  | `now()` | Last modification |

- Checks: nonblank code/name; valid status.
- Delete: restricted when referenced; use inactive status.

#### `employees`

Purpose: Staff registration and shared employment/department data.

| Column | PostgreSQL type | Nullable | Key | Default | Description |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | No | PK | `gen_random_uuid()` | Employee identity |
| `employee_number` | `varchar(50)` | No | UK |  | Human-readable identifier |
| `user_id` | `uuid` | Yes | FK/UK |  | Optional application identity |
| `department_id` | `uuid` | No | FK |  | Current department |
| `first_name` | `varchar(100)` | No |  |  | Given name |
| `last_name` | `varchar(100)` | No |  |  | Family name |
| `phone` | `varchar(30)` | Yes |  |  | Work/contact phone |
| `email` | `varchar(254)` | Yes |  |  | Work/contact email |
| `job_title` | `varchar(100)` | No |  |  | Employment title |
| `employment_status` | `varchar(20)` | No |  | `'active'` | `active`, `inactive`, or `terminated` |
| `hire_date` | `date` | No |  |  | Employment start |
| `end_date` | `date` | Yes |  |  | Employment end |
| `created_at` | `timestamptz` | No |  | `now()` | Creation time |
| `updated_at` | `timestamptz` | No |  | `now()` | Last modification |

- Foreign keys: user and department restricted.
- Checks: nonblank names/title; valid status; `end_date >= hire_date`.
- Indexes: `(department_id, employment_status)`, expression index on `lower(last_name),
  lower(first_name)`.
- Relationship: one department has many employees; a user represents at most one
  employee.

#### `doctor_profiles`

Purpose: Doctor-specific professional data without duplicating employee data.

| Column | PostgreSQL type | Nullable | Key | Default | Description |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | No | PK | `gen_random_uuid()` | Doctor identity |
| `employee_id` | `uuid` | No | FK/UK |  | Underlying employee |
| `license_number` | `varchar(100)` | No | UK |  | Professional license |
| `specialization` | `varchar(150)` | No |  |  | Clinical specialization |
| `professional_summary` | `text` | Yes |  |  | Optional summary |
| `contact_extension` | `varchar(20)` | Yes |  |  | Internal extension |
| `status` | `varchar(20)` | No |  | `'active'` | `active` or `inactive` |
| `created_at` | `timestamptz` | No |  | `now()` | Creation time |
| `updated_at` | `timestamptz` | No |  | `now()` | Last modification |

- Checks: nonblank license/specialization; valid status.
- Delete: employee deletion restricted; use inactive status.
- Relationship: employee zero-or-one to doctor profile. Department assignment is
  inherited through the employee.

#### `doctor_schedules`

Purpose: Concrete doctor availability/unavailability intervals.

| Column | PostgreSQL type | Nullable | Key | Default | Description |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | No | PK | `gen_random_uuid()` | Schedule interval |
| `doctor_id` | `uuid` | No | FK |  | Doctor |
| `starts_at` | `timestamptz` | No |  |  | Interval start |
| `ends_at` | `timestamptz` | No |  |  | Interval end |
| `status` | `varchar(20)` | No |  | `'available'` | `available`, `unavailable`, or `cancelled` |
| `note` | `varchar(500)` | Yes |  |  | Optional explanation |
| `created_at` | `timestamptz` | No |  | `now()` | Creation time |
| `updated_at` | `timestamptz` | No |  | `now()` | Last modification |

- Checks: `ends_at > starts_at`; valid status.
- Indexes: `(doctor_id, starts_at, ends_at)`.
- Delete: doctor restricted. Recurrence and interval-overlap policy remain pending;
  schedules are not silently expanded into recurring rules.

#### `attendance_records`

Purpose: One attendance record per employee and hospital-local work date.

| Column | PostgreSQL type | Nullable | Key | Default | Description |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | No | PK | `gen_random_uuid()` | Attendance identity |
| `employee_id` | `uuid` | No | FK |  | Employee |
| `work_date` | `date` | No |  |  | Hospital-local date |
| `check_in_at` | `timestamptz` | Yes |  |  | Check-in time |
| `check_out_at` | `timestamptz` | Yes |  |  | Check-out time |
| `status` | `varchar(20)` | No |  |  | `present`, `absent`, or `leave` |
| `note` | `varchar(500)` | Yes |  |  | Optional note |
| `recorded_by_user_id` | `uuid` | Yes | FK |  | Recording actor/system |
| `created_at` | `timestamptz` | No |  | `now()` | Creation time |
| `updated_at` | `timestamptz` | No |  | `now()` | Last modification |

- Unique: `(employee_id, work_date)`.
- Checks: valid status; checkout requires check-in and is later than check-in.
- Indexes: unique index serves employee/date; `(status, work_date)` supports reports.
- Delete: employee and actor restricted.

#### `leave_records`

Purpose: Employee leave requests and approval outcomes.

| Column | PostgreSQL type | Nullable | Key | Default | Description |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | No | PK | `gen_random_uuid()` | Leave identity |
| `employee_id` | `uuid` | No | FK |  | Requesting employee |
| `starts_on` | `date` | No |  |  | First leave date |
| `ends_on` | `date` | No |  |  | Last leave date |
| `leave_type` | `varchar(50)` | No |  |  | Policy-defined type |
| `reason` | `text` | No |  |  | Request reason |
| `status` | `varchar(20)` | No |  | `'requested'` | `requested`, `approved`, `rejected`, or `cancelled` |
| `decided_by_user_id` | `uuid` | Yes | FK |  | Approver/rejector |
| `decided_at` | `timestamptz` | Yes |  |  | Decision time |
| `decision_note` | `varchar(500)` | Yes |  |  | Optional explanation |
| `created_at` | `timestamptz` | No |  | `now()` | Creation time |
| `updated_at` | `timestamptz` | No |  | `now()` | Last modification |

- Checks: `ends_on >= starts_on`; valid status; approved/rejected rows require both
  decision fields, while requested rows have neither.
- Indexes: `(employee_id, starts_on, ends_on)`, `(status, starts_on)`.
- Delete: employee/decision actor restricted.
- `PENDING DECISION`: leave types, allowance calculations, overlap rules, and capture
  method are policy inputs, not inferred from the PDF.

### 4.3 Patients, appointments, admissions, and clinical records

#### `patients`

Purpose: Patient registration and search identity.

| Column | PostgreSQL type | Nullable | Key | Default | Description |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | No | PK | `gen_random_uuid()` | Patient identity |
| `patient_number` | `varchar(50)` | No | UK |  | Human-readable identifier |
| `first_name` | `varchar(100)` | No |  |  | Given name |
| `last_name` | `varchar(100)` | No |  |  | Family name |
| `date_of_birth` | `date` | Yes |  |  | Known/estimated birth date |
| `date_of_birth_precision` | `varchar(10)` | No |  |  | `exact`, `month`, `year`, or `unknown` |
| `sex_at_registration` | `varchar(20)` | Yes |  |  | Approved bounded value |
| `phone` | `varchar(30)` | Yes |  |  | Contact phone |
| `email` | `varchar(254)` | Yes |  |  | Contact email |
| `address_text` | `text` | Yes |  |  | Postal address |
| `emergency_contact_name` | `varchar(200)` | Yes |  |  | Optional contact |
| `emergency_contact_phone` | `varchar(30)` | Yes |  |  | Optional contact phone |
| `status` | `varchar(20)` | No |  | `'active'` | `active`, `inactive`, or `deceased` |
| `created_at` | `timestamptz` | No |  | `now()` | Registration time |
| `updated_at` | `timestamptz` | No |  | `now()` | Last modification |

- Checks: nonblank names; `unknown` precision requires null date and other precision
  values require a date; sex is null or one of
  `female`, `male`, `intersex`, `unknown`, `not_disclosed`; valid status.
- Indexes: expression index on `lower(last_name), lower(first_name)`; optional phone and
  email search indexes are deferred until query evidence justifies them.
- Delete: patient rows with history are restricted and deactivated.
- Application validation rejects known birth dates in the future; a clock-dependent
  rule is not encoded as a PostgreSQL check. Month precision is stored as the first day
  of that month and year precision as January 1; the precision column preserves meaning.
- `PENDING DECISION`: patient-number format and duplicate-matching policy.

#### `patient_documents`

Purpose: Authorized metadata for patient objects stored in private Supabase Storage.

| Column | PostgreSQL type | Nullable | Key | Default | Description |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | No | PK | `gen_random_uuid()` | Document identity |
| `patient_id` | `uuid` | No | FK |  | Owning patient |
| `uploaded_by_user_id` | `uuid` | No | FK |  | Uploader |
| `object_key` | `varchar(500)` | No | UK |  | System-generated private key |
| `original_name` | `varchar(255)` | No |  |  | Display filename only |
| `detected_media_type` | `varchar(100)` | No |  |  | Server-detected MIME type |
| `size_bytes` | `bigint` | No |  |  | Object size |
| `checksum` | `varchar(128)` | No |  |  | Content checksum |
| `category` | `varchar(50)` | No |  |  | Policy-defined document category |
| `status` | `varchar(20)` | No |  | `'pending'` | `pending`, `available`, `quarantined`, or `deleted` |
| `description` | `varchar(500)` | Yes |  |  | Optional description |
| `uploaded_at` | `timestamptz` | Yes |  |  | Completed upload time |
| `deleted_at` | `timestamptz` | Yes |  |  | Logical deletion time |
| `created_at` | `timestamptz` | No |  | `now()` | Metadata creation |
| `updated_at` | `timestamptz` | No |  | `now()` | Last state change |

- Checks: positive size; nonblank names/key/checksum/category; valid status; available
  requires `uploaded_at`; deleted requires `deleted_at`.
- Indexes: `(patient_id, created_at DESC)`, `(status, created_at)`.
- Delete: patient and uploader restricted; use document status lifecycle.
- `PENDING DECISION`: category list, maximum size, media allowlist, retention, and
  malware-scanning release policy.

#### `appointments`

Purpose: Patient bookings with doctors, cancellation, and preserved rescheduling history.

| Column | PostgreSQL type | Nullable | Key | Default | Description |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | No | PK | `gen_random_uuid()` | Appointment identity |
| `patient_id` | `uuid` | No | FK |  | Patient |
| `doctor_id` | `uuid` | No | FK |  | Selected doctor |
| `starts_at` | `timestamptz` | No |  |  | Start time |
| `ends_at` | `timestamptz` | No |  |  | End time |
| `status` | `varchar(20)` | No |  | `'scheduled'` | `scheduled`, `checked_in`, `completed`, `cancelled`, or `no_show` |
| `reason` | `varchar(1000)` | Yes |  |  | Visit reason |
| `cancellation_reason` | `varchar(500)` | Yes |  |  | Cancellation reason |
| `cancelled_at` | `timestamptz` | Yes |  |  | Cancellation time |
| `cancelled_by_user_id` | `uuid` | Yes | FK |  | Cancelling actor |
| `rescheduled_from_appointment_id` | `uuid` | Yes | FK/UK |  | Replaced appointment |
| `created_by_user_id` | `uuid` | No | FK |  | Booking actor |
| `created_at` | `timestamptz` | No |  | `now()` | Creation time |
| `updated_at` | `timestamptz` | No |  | `now()` | Last modification |

- Checks: `ends_at > starts_at`; valid status; cancellation fields required only for
  cancelled status; self-reference differs from self.
- Exclusion constraints: active (`scheduled`, `checked_in`) intervals may not overlap
  for the same `doctor_id` or the same `patient_id`, using GiST and half-open
  `tstzrange(starts_at, ends_at, '[)')`.
- Indexes: `(doctor_id, starts_at, status)`, `(patient_id, starts_at DESC)`,
  `(status, starts_at)`.
- Delete: all references restricted. Rescheduling creates a replacement and preserves
  the original.
- Rescheduling rule: the predecessor is cancelled, both appointments identify the same
  patient, and the replacement link cannot form a cycle. Doctor/time may change.
- Appointment fit within an available doctor schedule is validated in the booking
  transaction; it is a cross-table rule.

#### `admissions`

Purpose: Minimal inpatient admission lifecycle; no bed/ward model is required.

| Column | PostgreSQL type | Nullable | Key | Default | Description |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | No | PK | `gen_random_uuid()` | Admission identity |
| `admission_number` | `varchar(50)` | No | UK |  | Human-readable identifier |
| `patient_id` | `uuid` | No | FK |  | Patient |
| `attending_doctor_id` | `uuid` | Yes | FK |  | Responsible doctor if assigned |
| `admitted_at` | `timestamptz` | No |  |  | Admission time |
| `discharged_at` | `timestamptz` | Yes |  |  | Discharge time |
| `status` | `varchar(20)` | No |  | `'admitted'` | `admitted`, `discharged`, or `cancelled` |
| `reason` | `text` | No |  |  | Admission reason |
| `discharge_summary` | `text` | Yes |  |  | Discharge summary |
| `created_by_user_id` | `uuid` | No | FK |  | Registering actor |
| `created_at` | `timestamptz` | No |  | `now()` | Creation time |
| `updated_at` | `timestamptz` | No |  | `now()` | Last modification |

- Checks: valid status; discharge not before admission; discharged status requires
  discharge time, and other statuses must not have one.
- Indexes: `(patient_id, admitted_at DESC)`, `(status, admitted_at)`.
- Delete: patient, doctor, and actor restricted.

#### `medical_records`

Purpose: Clinical record container tying separately normalized diagnoses, treatments,
reports, prescriptions, and lab requests to a patient and optional care context.

| Column | PostgreSQL type | Nullable | Key | Default | Description |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | No | PK | `gen_random_uuid()` | Record identity |
| `patient_id` | `uuid` | No | FK |  | Patient |
| `author_employee_id` | `uuid` | No | FK |  | Authoring employee |
| `appointment_id` | `uuid` | Yes | FK |  | Optional outpatient context |
| `admission_id` | `uuid` | Yes | FK |  | Optional inpatient context |
| `occurred_at` | `timestamptz` | No |  |  | Clinical event time |
| `status` | `varchar(20)` | No |  | `'draft'` | `draft`, `final`, or `amended` |
| `finalized_at` | `timestamptz` | Yes |  |  | Finalization time |
| `amends_medical_record_id` | `uuid` | Yes | FK/UK |  | Record being amended |
| `created_at` | `timestamptz` | No |  | `now()` | Creation time |
| `updated_at` | `timestamptz` | No |  | `now()` | Last modification |

- Checks: no more than one care context; valid status; final/amended rows require
  `finalized_at`; amendment differs from self.
- Indexes: `(patient_id, occurred_at DESC)`, `(author_employee_id, occurred_at DESC)`,
  partial indexes on non-null appointment/admission IDs.
- Delete: all historical references restricted.
- Cross-row rule: patient IDs on the selected appointment/admission and all child
  records must match this patient. Final records are immutable; corrections create a
  linked replacement. An amendment targets a finalized record for the same patient,
  occurs later, and cannot form a cycle.

#### `diagnoses`

Purpose: Diagnoses recorded within a medical record.

| Column | PostgreSQL type | Nullable | Key | Default | Description |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | No | PK | `gen_random_uuid()` | Diagnosis identity |
| `medical_record_id` | `uuid` | No | FK |  | Parent clinical record |
| `diagnosis_text` | `text` | No |  |  | Free-text diagnosis; no code system assumed |
| `created_at` | `timestamptz` | No |  | `now()` | Creation time |

- Checks: nonblank diagnosis text.
- Indexes: `(medical_record_id, created_at)`.
- Delete: parent restricted after persistence; application may replace draft children
  only while the parent remains draft.

#### `treatments`

Purpose: Treatment-history entries within a medical record.

| Column | PostgreSQL type | Nullable | Key | Default | Description |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | No | PK | `gen_random_uuid()` | Treatment identity |
| `medical_record_id` | `uuid` | No | FK |  | Parent clinical record |
| `treatment_text` | `text` | No |  |  | Treatment narrative |
| `created_at` | `timestamptz` | No |  | `now()` | Creation time |

- Checks: nonblank treatment text.
- Indexes: `(medical_record_id, created_at)`.
- Delete: same draft-only application rule as diagnoses; FK restricts by default.

#### `medical_reports`

Purpose: Authored medical report content associated with a medical record.

| Column | PostgreSQL type | Nullable | Key | Default | Description |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | No | PK | `gen_random_uuid()` | Report identity |
| `medical_record_id` | `uuid` | No | FK |  | Parent clinical record |
| `title` | `varchar(200)` | No |  |  | Report title |
| `report_text` | `text` | No |  |  | Report content |
| `created_at` | `timestamptz` | No |  | `now()` | Creation time |

- Checks: nonblank title/report.
- Indexes: `(medical_record_id, created_at)`.
- Delete: same draft-only application rule as other clinical children.

#### `prescriptions`

Purpose: Prescriptions generated from a medical record.

| Column | PostgreSQL type | Nullable | Key | Default | Description |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | No | PK | `gen_random_uuid()` | Prescription identity |
| `medical_record_id` | `uuid` | No | FK |  | Originating record |
| `patient_id` | `uuid` | No | FK |  | Direct safe patient scope |
| `prescribed_by_doctor_id` | `uuid` | No | FK |  | Prescribing doctor |
| `prescribed_at` | `timestamptz` | No |  | `now()` | Prescription time |
| `status` | `varchar(30)` | No |  | `'active'` | `active`, `partially_dispensed`, `dispensed`, `cancelled`, or `expired` |
| `notes` | `text` | Yes |  |  | Optional instructions |
| `created_at` | `timestamptz` | No |  | `now()` | Creation time |
| `updated_at` | `timestamptz` | No |  | `now()` | Last modification |

- Checks: valid status.
- Indexes: `(patient_id, prescribed_at DESC, status)`, `(medical_record_id)`,
  `(prescribed_by_doctor_id, prescribed_at DESC)`.
- Delete: all references restricted.
- Cross-row rule: prescription patient must match the medical record patient.

#### `prescription_items`

Purpose: Medicines and directions on a prescription.

| Column | PostgreSQL type | Nullable | Key | Default | Description |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | No | PK | `gen_random_uuid()` | Item identity |
| `prescription_id` | `uuid` | No | FK |  | Parent prescription |
| `medicine_id` | `uuid` | No | FK |  | Prescribed medicine |
| `dosage` | `varchar(100)` | No |  |  | Dose description |
| `route` | `varchar(50)` | Yes |  |  | Administration route |
| `frequency` | `varchar(100)` | No |  |  | Frequency description |
| `duration` | `varchar(100)` | No |  |  | Duration description |
| `instructions` | `text` | Yes |  |  | Additional directions |
| `quantity_prescribed` | `numeric(14,4)` | No |  |  | Quantity in medicine inventory unit |
| `unit` | `varchar(30)` | No |  |  | Snapshot of canonical medicine unit |
| `created_at` | `timestamptz` | No |  | `now()` | Creation time |
| `updated_at` | `timestamptz` | No |  | `now()` | Last modification |

- Checks: positive quantity; nonblank dosage/frequency/duration/unit.
- Indexes: `(prescription_id)`, `(medicine_id)`.
- Unique: no uniqueness on medicine because separate directions may legitimately occur.
- Delete: parent and medicine restricted.

### 4.4 Laboratory

#### `lab_test_definitions`

Purpose: Laboratory test catalog and optional billing defaults.

| Column | PostgreSQL type | Nullable | Key | Default | Description |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | No | PK | `gen_random_uuid()` | Test identity |
| `code` | `varchar(50)` | No | UK |  | Stable test code |
| `name` | `varchar(200)` | No | UK |  | Test name |
| `specimen_type` | `varchar(100)` | Yes |  |  | Default specimen |
| `default_unit` | `varchar(50)` | Yes |  |  | Default result unit |
| `reference_range_description` | `text` | Yes |  |  | Default reference guidance |
| `price` | `numeric(19,4)` | Yes |  |  | Optional current catalog price |
| `currency` | `varchar(3)` | Yes |  |  | Required when price exists |
| `status` | `varchar(20)` | No |  | `'active'` | `active` or `inactive` |
| `created_at` | `timestamptz` | No |  | `now()` | Creation time |
| `updated_at` | `timestamptz` | No |  | `now()` | Last modification |

- Checks: nonblank code/name; nonnegative price; price and currency either both null or
  both present; valid currency/status.
- Delete: restricted when used; deactivate instead.

#### `lab_requests`

Purpose: Doctor-requested laboratory work for a patient.

| Column | PostgreSQL type | Nullable | Key | Default | Description |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | No | PK | `gen_random_uuid()` | Request identity |
| `patient_id` | `uuid` | No | FK |  | Patient |
| `requested_by_doctor_id` | `uuid` | No | FK |  | Requesting doctor |
| `medical_record_id` | `uuid` | Yes | FK |  | Originating clinical record |
| `requested_at` | `timestamptz` | No |  | `now()` | Request time |
| `status` | `varchar(30)` | No |  | `'requested'` | `requested`, `sample_collected`, `in_progress`, `completed`, or `cancelled` |
| `clinical_note` | `text` | Yes |  |  | Minimum necessary clinical context |
| `created_at` | `timestamptz` | No |  | `now()` | Creation time |
| `updated_at` | `timestamptz` | No |  | `now()` | Last modification |

- Checks: valid status.
- Indexes: `(patient_id, requested_at DESC)`, `(status, requested_at)`,
  `(requested_by_doctor_id, requested_at DESC)`, and a partial index on
  `medical_record_id` where non-null.
- Delete: patient, doctor, and record restricted.
- Cross-row rule: request patient must match its medical record patient.

#### `lab_request_items`

Purpose: Individual tests, sample collection state, and billable price snapshots.

| Column | PostgreSQL type | Nullable | Key | Default | Description |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | No | PK | `gen_random_uuid()` | Requested test identity |
| `lab_request_id` | `uuid` | No | FK |  | Parent request |
| `test_definition_id` | `uuid` | No | FK |  | Test definition |
| `status` | `varchar(30)` | No |  | `'requested'` | Same workflow values as request |
| `sample_collected_at` | `timestamptz` | Yes |  |  | Collection time |
| `sample_collected_by_employee_id` | `uuid` | Yes | FK |  | Collector |
| `price_snapshot` | `numeric(19,4)` | Yes |  |  | Billable price at request |
| `currency` | `varchar(3)` | Yes |  |  | Snapshot currency |
| `created_at` | `timestamptz` | No |  | `now()` | Creation time |
| `updated_at` | `timestamptz` | No |  | `now()` | Last modification |

- Checks: valid status; collection time/collector appear together; nonnegative price;
  price/currency appear together.
- Indexes: `(lab_request_id)`, `(status, sample_collected_at)`, `(test_definition_id)`.
- Delete: all references restricted.

#### `lab_results`

Purpose: Append-oriented versions of entered, finalized, and corrected laboratory results.

| Column | PostgreSQL type | Nullable | Key | Default | Description |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | No | PK | `gen_random_uuid()` | Result version identity |
| `lab_request_item_id` | `uuid` | No | FK |  | Requested test |
| `version_number` | `integer` | No |  |  | Monotonic version per item |
| `result_value` | `text` | No |  |  | Text supports numeric/qualitative results |
| `result_unit` | `varchar(50)` | Yes |  |  | Unit snapshot |
| `reference_range_snapshot` | `text` | Yes |  |  | Interpretation range at result time |
| `result_note` | `text` | Yes |  |  | Optional note |
| `entered_by_employee_id` | `uuid` | No | FK |  | Result author |
| `entered_at` | `timestamptz` | No |  | `now()` | Entry time |
| `finalized_by_employee_id` | `uuid` | Yes | FK |  | Finalizer |
| `finalized_at` | `timestamptz` | Yes |  |  | Finalization time |
| `supersedes_lab_result_id` | `uuid` | Yes | FK/UK |  | Corrected prior version |

- Unique: `(lab_request_item_id, version_number)`.
- Checks: positive version; nonblank value; finalizer/time appear together; superseded
  result differs from self.
- Indexes: `(lab_request_item_id, version_number DESC)`.
- Delete/update: finalized versions are immutable and never deleted by runtime roles.
- Transaction rule: a correction locks the item, appends the next version, links the
  prior finalized version, finalizes the new row, updates item/request state, and audits
  atomically. The superseded result must be finalized, belong to the same request item,
  precede the new version, and the chain must be acyclic.

### 4.5 Pharmacy and inventory

#### `medicines`

Purpose: Medicine catalog and one canonical inventory unit per medicine.

| Column | PostgreSQL type | Nullable | Key | Default | Description |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | No | PK | `gen_random_uuid()` | Medicine identity |
| `code` | `varchar(50)` | No | UK |  | Stable business code |
| `generic_name` | `varchar(200)` | No |  |  | Generic name |
| `brand_name` | `varchar(200)` | Yes |  |  | Optional brand |
| `dosage_form` | `varchar(100)` | No |  |  | Tablet, liquid, etc. |
| `strength` | `varchar(100)` | Yes |  |  | Display strength |
| `inventory_unit` | `varchar(30)` | No |  |  | Canonical stock/dispense unit |
| `default_sale_price` | `numeric(19,4)` | No |  | `0` | Current catalog price |
| `currency` | `varchar(3)` | No |  |  | ISO currency |
| `low_stock_threshold` | `numeric(14,4)` | No |  | `0` | Alert threshold in inventory unit |
| `status` | `varchar(20)` | No |  | `'active'` | `active` or `inactive` |
| `created_at` | `timestamptz` | No |  | `now()` | Creation time |
| `updated_at` | `timestamptz` | No |  | `now()` | Last modification |

- Checks: nonblank names/form/unit; nonnegative prices/threshold; valid currency/status.
- Indexes: expression index on `lower(generic_name), lower(brand_name)`.
- Delete: restricted when referenced; deactivate instead.
- Unit conversion is out of current scope.

#### `medicine_batches`

Purpose: Expiring received stock batches and acquisition/sale-price snapshots.

| Column | PostgreSQL type | Nullable | Key | Default | Description |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | No | PK | `gen_random_uuid()` | Batch identity |
| `medicine_id` | `uuid` | No | FK |  | Medicine |
| `batch_number` | `varchar(100)` | No |  |  | Supplier/manufacturer batch |
| `expiry_date` | `date` | No |  |  | Expiry date |
| `received_quantity` | `numeric(14,4)` | No |  |  | Initial quantity in canonical unit |
| `unit_cost` | `numeric(19,4)` | No |  |  | Cost per unit |
| `sale_price_snapshot` | `numeric(19,4)` | No |  |  | Sale price per unit |
| `currency` | `varchar(3)` | No |  |  | Cost/price currency |
| `received_at` | `timestamptz` | No |  | `now()` | Receipt time |
| `status` | `varchar(20)` | No |  | `'active'` | `active`, `depleted`, `expired`, or `quarantined` |
| `created_at` | `timestamptz` | No |  | `now()` | Creation time |
| `updated_at` | `timestamptz` | No |  | `now()` | Last metadata change |

- Unique: `(medicine_id, batch_number)`.
- Checks: positive received quantity; nonnegative prices; valid currency/status.
- Indexes: `(medicine_id, expiry_date, status)`, `(status, expiry_date)`.
- Delete: restricted. Current quantity is derived from movements.
- Expiry acceptance relative to receiving date is `PENDING DECISION`; expiry monitoring
  itself is covered.

#### `dispense_records`

Purpose: Prescription-item dispensing events.

| Column | PostgreSQL type | Nullable | Key | Default | Description |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | No | PK | `gen_random_uuid()` | Dispense identity |
| `prescription_item_id` | `uuid` | No | FK |  | Prescribed item |
| `quantity_dispensed` | `numeric(14,4)` | No |  |  | Quantity in canonical unit |
| `unit` | `varchar(30)` | No |  |  | Canonical unit snapshot |
| `dispensed_at` | `timestamptz` | No |  | `now()` | Dispensing time |
| `dispensed_by_employee_id` | `uuid` | No | FK |  | Dispensing employee |
| `status` | `varchar(20)` | No |  | `'completed'` | Always `completed` |
| `note` | `varchar(500)` | Yes |  |  | Optional note |
| `created_at` | `timestamptz` | No |  | `now()` | Creation time |
| `updated_at` | `timestamptz` | No |  | `now()` | Last permitted metadata change |

- Checks: positive quantity; nonblank unit; status equals `completed`.
- Indexes: `(prescription_item_id, dispensed_at)`,
  `(dispensed_by_employee_id, dispensed_at DESC)`.
- Delete/update: completed rows are immutable and references restrict deletion. A
  reversal never changes the original row.

#### `dispense_reversals`

Purpose: Immutable full reversals of completed dispensing events.

| Column | PostgreSQL type | Nullable | Key | Default | Description |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | No | PK | `gen_random_uuid()` | Reversal identity |
| `dispense_record_id` | `uuid` | No | FK, UK |  | Original completed dispense |
| `quantity_reversed` | `numeric(14,4)` | No |  | Full original quantity |
| `reason` | `varchar(500)` | No |  | Required reversal reason |
| `reversed_by_user_id` | `uuid` | No | FK |  | Responsible user |
| `reversed_at` | `timestamptz` | No |  | `now()` | Reversal time |
| `created_at` | `timestamptz` | No |  | `now()` | Creation time |

- Unique: `dispense_record_id`, so an original dispense has zero or one reversal.
- Checks: positive reversal quantity; nonblank reason; reversal identifier differs
  from the referenced dispense identifier.
- Cross-row rules: the referenced dispense exists with status `completed`; the reversal
  quantity equals its complete `quantity_dispensed`. The locked reversal transaction
  enforces these comparisons.
- Delete/update: rows are append-only and all references restrict deletion.

#### `stock_movements`

Purpose: Append-only batch-level inventory ledger.

| Column | PostgreSQL type | Nullable | Key | Default | Description |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | No | PK | `gen_random_uuid()` | Movement identity |
| `medicine_batch_id` | `uuid` | No | FK |  | Affected batch |
| `movement_type` | `varchar(20)` | No |  |  | `receipt`, `dispense`, `adjustment`, `return`, or `disposal` |
| `quantity` | `numeric(14,4)` | No |  |  | Signed canonical-unit quantity |
| `dispense_record_id` | `uuid` | Yes | FK |  | Original dispense allocation |
| `dispense_reversal_id` | `uuid` | Yes | FK |  | Reversal return allocation |
| `occurred_at` | `timestamptz` | No |  | `now()` | Movement time |
| `performed_by_user_id` | `uuid` | No | FK |  | Responsible actor |
| `reason` | `varchar(500)` | No |  |  | Business reason |
| `reference_identifier` | `varchar(100)` | Yes |  |  | External/internal correlation |

- Checks: nonzero quantity; valid type; receipt/return normally positive and
  dispense/disposal normally negative; exactly one of `dispense_record_id` and
  `dispense_reversal_id` is present for dispense/return allocations; a dispense link
  requires type `dispense` and a negative quantity; a reversal link requires type
  `return` and a positive quantity; other movement types have neither link.
- Indexes: `(medicine_batch_id, occurred_at)`, `(dispense_record_id)`,
  `(dispense_reversal_id)`, `(occurred_at, movement_type)`.
- Delete/update: runtime roles cannot update/delete. Available stock is
  `sum(quantity)` per batch and cannot fall below zero in the locked stock transaction.
- Allocation rules: movements linked to an original dispense use its prescribed
  medicine's batches and canonical unit and sum to the negative dispensed quantity.
  Movements linked to a reversal exactly mirror every original batch allocation with
  the opposite positive quantity and sum to the full reversed quantity. Cumulative
  effective dispensing counts only original dispenses without a linked reversal and
  must not exceed the prescribed quantity. Batch creation atomically creates an equal
  positive receipt movement for `received_quantity`.

### 4.6 Billing and payments

#### `invoices`

Purpose: Patient invoices with immutable financial snapshots and stored controlled totals.

| Column | PostgreSQL type | Nullable | Key | Default | Description |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | No | PK | `gen_random_uuid()` | Invoice identity |
| `invoice_number` | `varchar(50)` | No | UK |  | Human-readable identifier |
| `patient_id` | `uuid` | No | FK |  | Billed patient |
| `issued_at` | `timestamptz` | No |  | `now()` | Issue time |
| `due_at` | `timestamptz` | Yes |  |  | Optional due time |
| `currency` | `varchar(3)` | No |  |  | ISO invoice currency |
| `subtotal` | `numeric(19,4)` | No |  | `0` | Sum before adjustments |
| `discount_amount` | `numeric(19,4)` | No |  | `0` | Approved discount snapshot |
| `tax_amount` | `numeric(19,4)` | No |  | `0` | Approved tax snapshot |
| `total_amount` | `numeric(19,4)` | No |  | `0` | `subtotal - discount + tax` |
| `amount_paid` | `numeric(19,4)` | No |  | `0` | Net recorded payments |
| `balance_amount` | `numeric(19,4)` | No |  | `0` | `total - amount_paid` |
| `status` | `varchar(20)` | No |  | `'draft'` | `draft`, `issued`, `partially_paid`, `paid`, or `void` |
| `created_by_user_id` | `uuid` | No | FK |  | Creating actor |
| `created_at` | `timestamptz` | No |  | `now()` | Creation time |
| `updated_at` | `timestamptz` | No |  | `now()` | Last controlled change |

- Checks: valid currency/status; all amounts nonnegative; discount not above subtotal;
  `total_amount = subtotal - discount_amount + tax_amount`;
  `balance_amount = total_amount - amount_paid`; paid amount cannot exceed total;
  due time is not before issue.
- Indexes: `(patient_id, issued_at DESC)`, `(status, issued_at)`.
- Delete: patient and creator restricted; issued invoices are never deleted.
- `PENDING DECISION`: invoice-number format, enabled tax/discount rules, and revenue
  recognition. Defaults do not assert that tax or discounts are operationally enabled.

#### `invoice_items`

Purpose: Immutable billed-service snapshots linked to at most one originating service.

| Column | PostgreSQL type | Nullable | Key | Default | Description |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | No | PK | `gen_random_uuid()` | Line identity |
| `invoice_id` | `uuid` | No | FK |  | Parent invoice |
| `category` | `varchar(20)` | No |  |  | `consultation`, `laboratory`, `pharmacy`, or `admission` |
| `description` | `varchar(500)` | No |  |  | Service description snapshot |
| `quantity` | `numeric(14,4)` | No |  | `1` | Billed quantity |
| `unit_price` | `numeric(19,4)` | No |  |  | Price snapshot |
| `line_total` | `numeric(19,4)` | No |  |  | Rounded quantity times unit price |
| `appointment_id` | `uuid` | Yes | FK |  | Consultation source |
| `lab_request_item_id` | `uuid` | Yes | FK |  | Laboratory source |
| `dispense_record_id` | `uuid` | Yes | FK |  | Pharmacy source |
| `admission_id` | `uuid` | Yes | FK |  | Admission source |
| `created_at` | `timestamptz` | No |  | `now()` | Creation time |

- Checks: valid category; positive quantity; nonnegative price/total;
  `line_total = round(quantity * unit_price, 4)`; exactly one source reference is
  present and agrees with category.
- Indexes: `(invoice_id)` and partial indexes on each non-null source FK.
- Delete: all references restricted after issue; draft-line replacement is controlled by
  the application.
- Cross-row rule: the source service belongs to the invoice patient. For pharmacy this
  follows dispense → prescription item → prescription patient. Duplicate-charge
  prevention uses a reviewed billing idempotency policy; broad source uniqueness is not
  assumed because one admission or appointment may legitimately have multiple charges.

#### `payments`

Purpose: Payment receipts and linked reversal records; partial payment is allowed.

| Column | PostgreSQL type | Nullable | Key | Default | Description |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | No | PK | `gen_random_uuid()` | Payment identity |
| `payment_number` | `varchar(50)` | No | UK |  | Receipt/reference number |
| `invoice_id` | `uuid` | No | FK |  | Paid invoice |
| `amount` | `numeric(19,4)` | No |  |  | Positive payment/reversal amount |
| `currency` | `varchar(3)` | No |  |  | Must match invoice |
| `method` | `varchar(50)` | No |  |  | Policy-defined payment method |
| `external_reference` | `varchar(200)` | Yes |  |  | Processor/bank reference |
| `status` | `varchar(20)` | No |  | `'recorded'` | `recorded`, `void`, or `reversed` |
| `paid_at` | `timestamptz` | No |  | `now()` | Original/reversal event time |
| `received_by_user_id` | `uuid` | No | FK |  | Recording actor |
| `reverses_payment_id` | `uuid` | Yes | FK/UK |  | Original payment reversed |
| `note` | `varchar(500)` | Yes |  |  | Optional note/reversal reason |
| `created_at` | `timestamptz` | No |  | `now()` | Creation time |
| `updated_at` | `timestamptz` | No |  | `now()` | Controlled status change |

- Checks: positive amount; valid currency/status; self-reference differs from self;
  reversal requires a note.
- Indexes: `(invoice_id, paid_at, status)`, `(received_by_user_id, paid_at DESC)`.
- Delete: all references restricted; rows are voided/reversed rather than deleted.
- Transaction rules: currency and invoice match; reversal amount equals its original;
  both rows belong to the same invoice; the target is an unreversed recorded payment;
  original transitions to `reversed`; the reversal cannot itself be reversed and links
  cannot form a cycle; net recorded payments may not exceed invoice total. Refunds
  beyond reversal of a recorded payment are outside current scope.
- `PENDING DECISION`: accepted payment methods and payment-number format.

## 5. Relationship design

The matching physical ERD is in [physical-erd.md](physical-erd.md).

- User many-to-many Role through UserRole.
- Role many-to-many Permission through RolePermission.
- User one-to-many RefreshSession and optional one-to-one Employee.
- Department one-to-many Employee; Employee optional one-to-one DoctorProfile.
- DoctorProfile one-to-many DoctorSchedule and Appointment.
- Employee one-to-many AttendanceRecord and LeaveRecord.
- Patient one-to-many Document, Appointment, Admission, MedicalRecord, LabRequest, and
  Invoice.
- MedicalRecord optionally belongs to one Appointment or one Admission, never both.
- MedicalRecord one-to-many Diagnosis, Treatment, MedicalReport, Prescription, and
  LabRequest.
- A committed Prescription has one-to-many PrescriptionItems; the parent and at least
  one item are created atomically because there is no draft prescription state. The FK
  alone cannot enforce the minimum. Medicine one-to-many PrescriptionItem.
- A committed LabRequest has one-to-many LabRequestItems; the parent and at least one
  item are created atomically because there is no draft request state. The FK alone
  cannot enforce the minimum. LabRequestItem one-to-many versioned LabResult.
- Medicine one-to-many MedicineBatch; batch one-to-many StockMovement.
- PrescriptionItem one-to-many DispenseRecord; a dispense can allocate multiple batches
  through StockMovement. DispenseRecord has zero-or-one DispenseReversal through the
  reversal's unique original FK; a reversal has one-to-many return StockMovements.
- Invoice has zero-to-many stored InvoiceItems; at least one is required before issue.
  Invoice has zero-to-many Payments.

No FK cycle requires cascade deletion. Self-references preserve rescheduling,
amendment, rotation, correction, and reversal chains. Their deletes remain restricted.

## 6. Index strategy

- Primary and unique indexes protect identities and business identifiers.
- Foreign-key indexes are added where joins, queues, or parent-history reads are
  expected; low-value standalone actor FKs are combined with time where useful.
- Patient and employee name expression indexes support case-insensitive ordered lookup.
  Fuzzy/trigram or full-text indexes require measured search behavior before adoption.
- Appointment indexes and GiST exclusion constraints support calendars and prevent
  concurrent active overlaps.
- Patient/time indexes support medical history and operational reports.
- Status/time indexes support appointment, admission, laboratory, invoice, stock-expiry,
  attendance, and leave work queues.
- Partial invoice-source indexes support ownership and billing queries. Duplicate-charge
  prevention depends on the reviewed billing idempotency/granularity policy.
- Reporting initially queries indexed operational tables with bounded date ranges. No
  report tables, materialized views, or analytics warehouse are proposed.
- Indexes will be validated with representative `EXPLAIN (ANALYZE, BUFFERS)` plans after
  implementation; redundant indexes are removed.

## 7. Integrity rules

- Every row has a UUID technical key; externally visible numbers remain separate unique
  values.
- Required relationships use non-null FKs and default to restricted deletion.
- Master data is deactivated rather than deleted after use.
- Final clinical/lab history, dispenses, dispense reversals, stock movements, audit
  logs, issued invoices, and payments are append-oriented or corrected by linked
  records.
- Start/end and date ranges are ordered by checks.
- Quantities are positive where representing requested/dispensed amounts; stock
  movements are nonzero signed values.
- Monetary values use exact decimals; currency is explicit and transactionally matched.
- The application transaction validates cross-table invariants PostgreSQL checks cannot
  express directly: matching patient/currency/unit/medicine, parent workflow state,
  minimum child counts, allocation totals, total stock, chain ownership/acyclicity, and
  allowed state transitions.
- Database roles must not receive direct write access that bypasses application
  invariants.

## 8. Transaction boundaries

- Appointment booking/rescheduling: verify schedule, lock relevant range, enforce
  doctor and patient conflict constraints, create replacement/state change, and audit.
- Medical record finalization/amendment: validate child content, finalize or append the
  replacement, and audit.
- Laboratory collection/result finalization/correction: lock request items, append
  result version, update aggregate statuses, and audit.
- Prescription creation: create prescription and at least one item with matching
  patient/doctor context.
- Dispensing: lock selected batches, validate non-expired available stock and canonical
  unit/medicine, ensure allocation totals equal the dispense and do not exceed the
  prescribed quantity, create dispense and movements, update prescription status,
  create approved bill line if applicable, and audit.
- Dispensing reversal: lock the completed dispense and original allocations, reject an
  existing reversal, create one full-quantity reversal, append positive return
  movements that mirror each original batch and quantity, update prescription status
  from effective unreversed dispensing, and audit. Do not modify the original dispense,
  original movements, invoice items, or payments.
- Invoice creation/issue: create line snapshots, calculate totals, enforce source
  patient ownership and billing idempotency, require at least one line, change status,
  and audit.
- Payment/reversal: lock invoice, validate amount/currency/status, insert payment or
  reversal, recompute stored paid/balance/status, and audit.
- Document upload: use staged metadata around non-transactional object storage and
  reconcile abandoned/orphaned objects.

Serializable isolation is not prescribed globally. Each workflow should use the
smallest locking/isolation mechanism that protects its invariant.

## 9. Sensitive data

- Passwords are Argon2id hashes; refresh tokens are stored only as hashes. Raw passwords
  and tokens never enter database columns, logs, or audit metadata.
- Patient identity/contact data, documents, diagnoses, treatments, reports,
  prescriptions, lab data, admissions, employee data, and financial records are
  sensitive.
- PostgreSQL constraints provide integrity, not authorization. The Express application
  authenticates users, checks explicit permissions and resource scope, minimizes query
  results, and audits material access/change.
- Production traffic uses TLS and least-privilege credentials. Private object storage
  holds document bytes; PostgreSQL stores metadata only.
- Database ownership/privilege baseline: a non-login owner owns the application schema;
  a controlled migrator can apply reviewed migrations; the runtime role receives only
  required DML/sequence privileges and cannot alter schema or update/delete append-only
  tables directly; a reporting role is read-only over approved views/tables. Supabase
  browser-facing `anon`/`authenticated` roles receive no direct HMS-table access.
- Audit metadata must omit secrets, document content, and unnecessary clinical details.
- Encryption at rest, retention, consent, data residency, and jurisdictional controls
  depend on provider/legal policy and are not claimed by this schema.

## 10. Open decisions

### PENDING DECISION

These items are not silently decided and must be resolved before their affected
application workflow or production use:

- Business-number formats and sequence rules for patients, employees, admissions,
  invoices, and payments.
- Patient duplicate matching and handling of estimated month/year birth dates.
- Doctor schedule recurrence, breaks, overlapping schedule entries, standard duration,
  and cancellation policy.
- Admission cancellation policy and discharge-content requirements.
- Clinical content templates, author/sign-off permissions, and nurse write authority.
- Laboratory catalog governance, structured numeric/qualitative result validation,
  reference-range policy, and finalizer eligibility.
- Patient document categories, size/MIME allowlists, retention, and malware scanning.
- Leave types, allowances, overlap rules, attendance capture method, and corrections.
- Pharmacy batch receiving/expiry acceptance, adjustment authorization, threshold
  policy, and expired/damaged stock disposal. Full dispensing reversal is resolved by
  D-020.
- Enabled tax/discount rules, invoice numbering, payment methods, receipt format, and
  revenue recognition, plus billing idempotency/granularity. Refunds are outside the
  approved baseline.
- Exact report columns, filters, export formats, and date/revenue semantics.
- Audit, session, clinical, financial, document, and operational retention periods.
- Jurisdiction, privacy obligations, consent, data residency, breach response, backup
  encryption, and administrator-access review.
- Measurable workload, latency, availability, RPO, and RTO targets.

Open decisions may require new tables, constraints, reference data, or redesign. Their
affected module must not be implemented until that impact is reviewed.

## 11. Prisma readiness and approval gate

- `backend/prisma/schema.prisma` is the approved source for Milestone 3 models.
- Prisma models and reviewed migration SQL may now implement this design.
- UUIDs, decimals, timestamps, dates, JSONB, and ordinary keys map to Prisma-supported
  PostgreSQL concepts.
- Expression indexes, partial indexes, check constraints, and appointment exclusion
  constraints are implemented in the reviewed initial SQL migration.
- Enum-like values are specified as checked `varchar` values so lifecycle changes can
  be reviewed explicitly; Prisma enums may be considered during implementation, but are
  not assumed here.
- This document, the ERD, and the initial migration passed the Milestone 3 approval
  gate; later schema changes still require review.
