# Schema Requirements Traceability

Status: Approved; Milestone 3 physical schema and initial migration implemented

Primary source: `Hospital_system.pdf`  
Supporting sources: accepted ADRs, requirements analysis, security architecture, logical
data model, and project-owner physical-design decisions D-012 through D-020.

Status meanings:

- **COVERED** — the proposed physical schema directly supports the requirement.
- **PARTIALLY COVERED** — the schema supplies required data support, but application or
  operational work and/or an unresolved policy remains.
- **PENDING DECISION** — a schema-affecting policy is not approved.
- **NOT APPLICABLE** — no persistent schema structure is appropriate.

## Functional requirements

| Requirement | Source | Tables/relationships | Status |
| --- | --- | --- | --- |
| Login/logout | PDF 3.1 | `users`, `refresh_sessions`; user 1:M sessions | COVERED |
| Password management/protection | PDF 3.1, 4 Security | `users.password_hash`, `password_changed_at`; session revocation support | COVERED |
| Automatic session timeout | PDF 4 Security; ADR-003 | `refresh_sessions.expires_at`, `idle_expires_at`, `revoked_at` | COVERED |
| User roles/access control | PDF 3.1, 4 Security | `users`, `roles`, `permissions`, `user_roles`, `role_permissions` | COVERED |
| Named hospital roles | PDF 2 | Seed/reference rows in `roles`; no separate table per role | COVERED |
| Register/update/search patient | PDF 3.2 | `patients`, unique patient number, name search index | COVERED |
| View patient medical history | PDF 3.2, 3.5 | Patient 1:M medical records with diagnoses, treatments, reports, prescriptions, and lab requests | COVERED |
| Upload patient documents | PDF 3.2; ADR-004 | `patient_documents`; private object bytes remain in Supabase Storage | COVERED |
| Add/update doctors | PDF 3.3 | Employee 0..1:1 `doctor_profiles` | COVERED |
| Assign doctor to department | PDF 3.3 | Doctor → employee → department | COVERED |
| Manage doctor schedules | PDF 3.3 | Doctor 1:M `doctor_schedules` | PARTIALLY COVERED |
| Book/cancel/reschedule appointments | PDF 3.4 | `appointments`, cancellation fields, self-linked replacement | COVERED |
| Track appointment status | PDF 3.4 | Checked appointment status set | COVERED |
| Select a doctor | PDF UI, Appointment Screen | Appointment M:1 doctor FK | COVERED |
| Calendar appointment queries | PDF UI, Appointment Screen | Doctor/start/status and status/start indexes | COVERED |
| Prevent concurrent booking conflicts | Transaction integrity; D-013 | GiST exclusion constraints for active doctor and patient intervals | COVERED |
| Patient diagnosis | PDF 3.5; D-014 | Medical record 1:M `diagnoses` | COVERED |
| Prescriptions | PDF 3.5 | Medical record 1:M prescriptions 1:M items; medicine FK | COVERED |
| Treatment history | PDF 3.5; D-014 | Medical record 1:M `treatments` | COVERED |
| Medical reports | PDF 3.5; D-014 | Medical record 1:M `medical_reports` | COVERED |
| Preserve finalized clinical history | Approved logical/security design | Linked medical-record amendments; restricted deletion | COVERED |
| Laboratory test requests | PDF 3.6 | `lab_requests`, `lab_request_items`, test catalog | COVERED |
| Laboratory sample collection | PDF 3.6 | Collection timestamp and employee on request item | COVERED |
| Laboratory result entry | PDF 3.6; D-014 | Request item 1:M append-oriented `lab_results` | COVERED |
| Correct/finalize laboratory results | Historical-integrity requirement; D-014 | Version, finalizer, and superseding result links | COVERED |
| Generate laboratory reports | PDF 3.6 | Indexed requests/items/results queried by reporting layer | PARTIALLY COVERED |
| Medicine inventory | PDF 3.7 | `medicines`, `medicine_batches`, `stock_movements` | COVERED |
| Process prescriptions/dispensing | PDF 3.7 | Prescription item 1:M dispense records; dispense M:1 employee | COVERED |
| Stock management | PDF 3.7; D-015 | Append-only signed batch movements in canonical medicine unit | COVERED |
| Dispense correct medicine/quantity | Transaction integrity | Locked batch allocations match prescribed medicine/unit and sum to dispense quantity | COVERED |
| Reverse a dispensing | D-020 | One full reversal per dispense with mirrored positive batch return movements | COVERED |
| Monitor medicine expiry | PDF 3.7 | Batch expiry/status index | COVERED |
| Consultation charge | PDF 3.8 | Invoice item optional appointment source | COVERED |
| Laboratory charge | PDF 3.8 | Invoice item optional lab-request-item source | COVERED |
| Pharmacy charge | PDF 3.8 | Invoice item optional dispense source | COVERED |
| Admission charge | PDF 3.8 | Invoice item optional admission source | COVERED |
| Generate invoice | PDF 3.8 | `invoices`, `invoice_items`, exact totals and currency | COVERED |
| Prevent cross-patient billing | Financial/privacy integrity | Transaction validates every line source belongs to invoice patient | COVERED |
| Record partial payments | PDF 3.8; D-016 | Invoice 1:M `payments`; controlled stored balance | COVERED |
| Reverse payments | D-016 technical integrity | Self-linked payment reversal and original status | COVERED |
| Print payment receipt | PDF UI, Billing Screen | Payment/invoice identifiers and snapshots provide receipt data | PARTIALLY COVERED |
| Inpatient management | PDF scope/modules | Minimal `admissions` lifecycle and medical-record context | COVERED |
| Outpatient management | PDF scope; D-009 | Appointments plus contextual medical records | COVERED |
| Bed/ward/room management | Not specified; D-009 excludes | No tables | NOT APPLICABLE |
| Employee registration | PDF 3.9 | `employees` | COVERED |
| Staff department assignment | PDF 3.9 | Employee M:1 department | COVERED |
| Attendance | PDF 3.9 | One `attendance_records` row per employee/work date | COVERED |
| Leave records | PDF 3.9 | `leave_records` with baseline decision metadata | PARTIALLY COVERED |
| Patient reports | PDF 3.10 | Indexed patient and clinical operational tables | PARTIALLY COVERED |
| Appointment reports | PDF 3.10 | Indexed appointment date/status/doctor/patient fields | PARTIALLY COVERED |
| Revenue reports | PDF 3.10 | Invoices, invoice lines, payments, date/status indexes | PARTIALLY COVERED |
| Pharmacy reports/alerts | PDF 3.10 and Dashboard | Medicines, batches, movements, expiry/threshold data | PARTIALLY COVERED |
| Laboratory reports/dashboard count | PDF 3.10 and Dashboard | Requests/items/results with status/time indexes | PARTIALLY COVERED |
| Staff reports | PDF 3.10 | Employees, attendance, leave, departments | PARTIALLY COVERED |
| Total-patient dashboard value | PDF UI, Dashboard | Aggregate over `patients` | COVERED |
| Today's appointments dashboard value | PDF UI, Dashboard | Hospital-timezone bounded appointment query | COVERED |
| Revenue-summary dashboard value | PDF UI, Dashboard | Bounded invoice/payment aggregate; revenue semantics pending | PARTIALLY COVERED |
| Reports own no duplicate storage | Approved architecture | Queries over operational data; no report tables | COVERED |

Report rows are `PARTIALLY COVERED` because the PDF names reports but does not define
columns, filters, date periods, export formats, or revenue-recognition semantics. The
schema provides the source data without inventing those outputs.

## Security, audit, and sensitive information

| Requirement | Source | Tables/relationships | Status |
| --- | --- | --- | --- |
| Never store plaintext passwords | PDF 4 Security; security architecture | `users.password_hash` only | COVERED |
| Store refresh tokens only as hashes | ADR-003 | `refresh_sessions.token_hash` | COVERED |
| Account status/lock support | Secure-login technical requirement | User status, failure count, lock expiry | COVERED |
| Server-side RBAC data | PDF 4 Security; D-005 | Explicit role/permission joins | COVERED |
| Audit logs/audit trail | PDF 4 Security, 10 | `audit_logs` actor/action/resource/outcome/request/time metadata | COVERED |
| Append-oriented audit history | Security architecture | Runtime update/delete denied; historical actor FK restricted | COVERED |
| Sensitive patient information | PDF benefits/security; security architecture | Normalized patient/clinical tables; app-enforced authorization | PARTIALLY COVERED |
| Private patient documents | ADR-004 | Metadata in PostgreSQL; private object storage outside database | COVERED |
| Least-privilege database access | Security architecture | Deployment/database-role concern, not additional domain tables | PARTIALLY COVERED |
| Retention/compliance controls | Decision register legal gap | Table design supports status/history; policy not specified | PENDING DECISION |

Database constraints protect integrity. Authentication, authorization, resource-level
access, response minimization, TLS, secrets, log redaction, and object authorization
remain application/infrastructure controls and must not be represented as guarantees of
the schema alone.

## Data integrity and platform decisions

| Requirement | Source | Tables/relationships | Status |
| --- | --- | --- | --- |
| PostgreSQL relational database | PDF software options; ADR-002 | Entire proposed schema | COVERED |
| Prisma ORM compatibility | ADR-002 | Standard mapped types/relations plus reviewed migration SQL for checks, expression/partial indexes, and exclusion constraints | COVERED |
| UUID technical identifiers | D-006 | UUID primary keys throughout | COVERED |
| Separate business identifiers | D-006 | Patient, employee, admission, invoice, payment numbers | COVERED |
| UTC timestamps/hospital timezone | D-007 | `timestamptz` plus local `date`; bounded queries use configuration | COVERED |
| Exact money and currency | D-008, D-018 | `numeric(19,4)` and ISO currency columns | COVERED |
| Historical records not cascade-deleted | D-010 | Restricted FKs; status, amendment, movement, reversal patterns | COVERED |
| Transaction-safe critical workflows | Approved architecture | Documented appointment, clinical, lab, stock, invoice, and payment boundaries | COVERED |
| Appropriate normalization | Logical design; technical requirement | Explicit joins, subtype clinical tables, batch ledger, line snapshots | COVERED |
| Reports from persisted data | PDF UI/reports | Operational tables and indexes; no hardcoded values | COVERED |
| Local PostgreSQL development | Project architecture | Environment/deployment concern | COVERED |
| Supabase PostgreSQL production target | ADR-005 | Compatible target; not deployed | COVERED |

## Reliability and operations

| Requirement | Source | Tables/relationships | Status |
| --- | --- | --- | --- |
| Multiple concurrent users | PDF 4 Performance | Transactions, keys, and appointment exclusion constraints support concurrency | PARTIALLY COVERED |
| Fast response/optimized database | PDF 4 Performance | Focused index strategy; measurable targets absent | PARTIALLY COVERED |
| Daily database backup | PDF 4 Reliability, 10 | Provider/runbook responsibility, not a schema table | PARTIALLY COVERED |
| Weekly full backup | PDF 10 | Provider/runbook responsibility, not a schema table | PARTIALLY COVERED |
| High availability | PDF 4 Reliability | Deployment/provider responsibility | PARTIALLY COVERED |
| Data recovery/disaster recovery | PDF 4 Reliability, 10 | Backup/restore/runbook responsibility | PARTIALLY COVERED |

The operational requirements cannot be marked covered by table design. Provider
capabilities, retention, RPO/RTO, and restore-test evidence remain required.

## Explicit exclusions

| Requirement | Source | Tables/relationships | Status |
| --- | --- | --- | --- |
| Mobile application | PDF 12 Future Enhancements | None | NOT APPLICABLE |
| Patient portal | PDF 12 Future Enhancements | None | NOT APPLICABLE |
| SMS/email notifications | PDF 12 Future Enhancements | None | NOT APPLICABLE |
| Telemedicine | PDF 12 Future Enhancements | None | NOT APPLICABLE |
| Insurance integration | PDF 12 Future Enhancements | None | NOT APPLICABLE |
| AI decision support | PDF 12 Future Enhancements | None | NOT APPLICABLE |
| Biometric authentication | PDF 12 Future Enhancements | None | NOT APPLICABLE |

Cloud deployment is the one documented difference: the PDF lists it as future, while
the project brief and ADR-005 explicitly place Vercel, Render, and Supabase in current
target scope. This does not claim that deployment has occurred.

## Remaining traceability gaps

### PENDING DECISION

- Exact report outputs and revenue-recognition semantics.
- Business identifier formats and sequences.
- Document category/type/size/retention rules.
- Legal jurisdiction, privacy, consent, retention, and data-residency obligations.
- Measurable performance, availability, RPO, and RTO targets.
- Detailed schedule, leave, laboratory, remaining pharmacy, tax, discount,
  payment-method, and receipt policies listed in the physical design. Full dispensing
  reversal is resolved by D-020.
