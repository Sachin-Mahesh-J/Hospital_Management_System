-- M16: D-029 leave application status/overlap, D-030 document title,
-- D-032 audit list indexes. Attendance uniqueness already exists.

ALTER TABLE "leave_records" ALTER COLUMN "reason" DROP NOT NULL;
UPDATE "leave_records" SET "status" = 'pending' WHERE "status" = 'requested';
ALTER TABLE "leave_records" ALTER COLUMN "status" SET DEFAULT 'pending';

ALTER TABLE "leave_records" DROP CONSTRAINT "ck_leave_records_status";
ALTER TABLE "leave_records" ADD CONSTRAINT "ck_leave_records_status"
  CHECK ("status" IN ('pending', 'approved', 'rejected', 'cancelled'));

ALTER TABLE "leave_records" DROP CONSTRAINT "ck_leave_records_decision";
ALTER TABLE "leave_records" ADD CONSTRAINT "ck_leave_records_decision"
  CHECK (
    (("status" IN ('approved', 'rejected')) AND "decided_by_user_id" IS NOT NULL AND "decided_at" IS NOT NULL)
    OR ("status" = 'pending' AND "decided_by_user_id" IS NULL AND "decided_at" IS NULL)
    OR "status" = 'cancelled'
  );

ALTER TABLE "leave_records" ADD CONSTRAINT "ex_leave_records_employee_active_overlap"
  EXCLUDE USING gist (
    "employee_id" WITH =,
    daterange("starts_on", "ends_on", '[]') WITH &&
  ) WHERE ("status" IN ('pending', 'approved'));

ALTER TABLE "patient_documents" ADD COLUMN "title" varchar(200) NOT NULL DEFAULT 'Untitled';
ALTER TABLE "patient_documents" ALTER COLUMN "title" DROP DEFAULT;
ALTER TABLE "patient_documents" DROP CONSTRAINT "ck_patient_documents_nonblank";
ALTER TABLE "patient_documents" ADD CONSTRAINT "ck_patient_documents_nonblank"
  CHECK (
    btrim("object_key") <> ''
    AND btrim("original_name") <> ''
    AND btrim("checksum") <> ''
    AND btrim("category") <> ''
    AND btrim("title") <> ''
  );

CREATE INDEX "idx_audit_logs_occurred_at" ON "audit_logs" ("occurred_at" DESC);
CREATE INDEX "idx_audit_logs_action_occurred_at" ON "audit_logs" ("action", "occurred_at" DESC);
CREATE INDEX "idx_audit_logs_outcome_occurred_at" ON "audit_logs" ("outcome", "occurred_at" DESC);
