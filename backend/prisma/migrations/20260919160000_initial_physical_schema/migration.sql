CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

CREATE TABLE "users" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(), "username" varchar(100) NOT NULL, "password_hash" varchar(255) NOT NULL,
  "status" varchar(20) NOT NULL DEFAULT 'pending', "password_changed_at" timestamptz NOT NULL DEFAULT now(), "last_login_at" timestamptz,
  "failed_login_count" integer NOT NULL DEFAULT 0, "locked_until" timestamptz, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_users" PRIMARY KEY ("id"), CONSTRAINT "ck_users_username_nonblank" CHECK (btrim("username") <> ''),
  CONSTRAINT "ck_users_status" CHECK ("status" IN ('pending','active','locked','disabled')), CONSTRAINT "ck_users_failed_login_count" CHECK ("failed_login_count" >= 0)
);
CREATE UNIQUE INDEX "uq_users_username_ci" ON "users" (lower("username"));
CREATE INDEX "idx_users_status" ON "users" ("status");

CREATE TABLE "roles" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(), "code" varchar(50) NOT NULL, "name" varchar(100) NOT NULL, "description" text,
  "status" varchar(20) NOT NULL DEFAULT 'active', "is_system" boolean NOT NULL DEFAULT false, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_roles" PRIMARY KEY ("id"), CONSTRAINT "uq_roles_code" UNIQUE ("code"), CONSTRAINT "uq_roles_name" UNIQUE ("name"),
  CONSTRAINT "ck_roles_code_nonblank" CHECK (btrim("code") <> ''), CONSTRAINT "ck_roles_name_nonblank" CHECK (btrim("name") <> ''),
  CONSTRAINT "ck_roles_status" CHECK ("status" IN ('active','inactive'))
);
CREATE TABLE "permissions" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(), "code" varchar(100) NOT NULL, "description" varchar(500) NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_permissions" PRIMARY KEY ("id"), CONSTRAINT "uq_permissions_code" UNIQUE ("code"),
  CONSTRAINT "ck_permissions_code_nonblank" CHECK (btrim("code") <> ''), CONSTRAINT "ck_permissions_description_nonblank" CHECK (btrim("description") <> '')
);
CREATE TABLE "user_roles" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "role_id" uuid NOT NULL, "assigned_by_user_id" uuid, "assigned_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_user_roles" PRIMARY KEY ("id"), CONSTRAINT "uq_user_roles_user_id_role_id" UNIQUE ("user_id","role_id"),
  CONSTRAINT "fk_user_roles_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "fk_user_roles_role_id" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "fk_user_roles_assigned_by_user_id" FOREIGN KEY ("assigned_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
);
CREATE INDEX "idx_user_roles_role_id" ON "user_roles" ("role_id");
CREATE TABLE "role_permissions" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(), "role_id" uuid NOT NULL, "permission_id" uuid NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_role_permissions" PRIMARY KEY ("id"), CONSTRAINT "uq_role_permissions_role_id_permission_id" UNIQUE ("role_id","permission_id"),
  CONSTRAINT "fk_role_permissions_role_id" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "fk_role_permissions_permission_id" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
);
CREATE INDEX "idx_role_permissions_permission_id" ON "role_permissions" ("permission_id");
CREATE TABLE "refresh_sessions" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "token_hash" varchar(255) NOT NULL, "expires_at" timestamptz NOT NULL,
  "idle_expires_at" timestamptz NOT NULL, "last_used_at" timestamptz, "revoked_at" timestamptz, "revoke_reason" varchar(100),
  "replaced_by_session_id" uuid, "user_agent_hash" varchar(128), "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_refresh_sessions" PRIMARY KEY ("id"), CONSTRAINT "uq_refresh_sessions_token_hash" UNIQUE ("token_hash"),
  CONSTRAINT "uq_refresh_sessions_replaced_by_session_id" UNIQUE ("replaced_by_session_id"),
  CONSTRAINT "fk_refresh_sessions_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "fk_refresh_sessions_replaced_by_session_id" FOREIGN KEY ("replaced_by_session_id") REFERENCES "refresh_sessions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "ck_refresh_sessions_expiries" CHECK ("expires_at" > "created_at" AND "idle_expires_at" > "created_at" AND "idle_expires_at" <= "expires_at"),
  CONSTRAINT "ck_refresh_sessions_not_self" CHECK ("replaced_by_session_id" IS NULL OR "replaced_by_session_id" <> "id"),
  CONSTRAINT "ck_refresh_sessions_revoke_reason" CHECK ("revoked_at" IS NULL OR ("revoke_reason" IS NOT NULL AND btrim("revoke_reason") <> ''))
);
CREATE INDEX "idx_refresh_sessions_user_active" ON "refresh_sessions" ("user_id","expires_at","idle_expires_at") WHERE "revoked_at" IS NULL;
CREATE TABLE "audit_logs" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(), "occurred_at" timestamptz NOT NULL DEFAULT now(), "actor_user_id" uuid, "action" varchar(100) NOT NULL,
  "resource_type" varchar(100) NOT NULL, "resource_id" uuid, "outcome" varchar(20) NOT NULL, "request_id" uuid, "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb, "source_ip" inet,
  CONSTRAINT "pk_audit_logs" PRIMARY KEY ("id"), CONSTRAINT "fk_audit_logs_actor_user_id" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "ck_audit_logs_action_nonblank" CHECK (btrim("action") <> ''), CONSTRAINT "ck_audit_logs_resource_type_nonblank" CHECK (btrim("resource_type") <> ''),
  CONSTRAINT "ck_audit_logs_outcome" CHECK ("outcome" IN ('success','failure','denied')), CONSTRAINT "ck_audit_logs_metadata_object" CHECK (jsonb_typeof("metadata") = 'object')
);
CREATE INDEX "idx_audit_logs_actor_user_id_occurred_at" ON "audit_logs" ("actor_user_id","occurred_at" DESC);
CREATE INDEX "idx_audit_logs_resource_type_resource_id_occurred_at" ON "audit_logs" ("resource_type","resource_id","occurred_at" DESC);
CREATE INDEX "idx_audit_logs_request_id" ON "audit_logs" ("request_id");

CREATE TABLE "departments" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(), "code" varchar(30) NOT NULL, "name" varchar(150) NOT NULL, "description" text, "status" varchar(20) NOT NULL DEFAULT 'active',
  "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_departments" PRIMARY KEY ("id"), CONSTRAINT "uq_departments_code" UNIQUE ("code"), CONSTRAINT "uq_departments_name" UNIQUE ("name"),
  CONSTRAINT "ck_departments_nonblank" CHECK (btrim("code") <> '' AND btrim("name") <> ''), CONSTRAINT "ck_departments_status" CHECK ("status" IN ('active','inactive'))
);
CREATE TABLE "employees" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(), "employee_number" varchar(50) NOT NULL, "user_id" uuid, "department_id" uuid NOT NULL,
  "first_name" varchar(100) NOT NULL, "last_name" varchar(100) NOT NULL, "phone" varchar(30), "email" varchar(254), "job_title" varchar(100) NOT NULL,
  "employment_status" varchar(20) NOT NULL DEFAULT 'active', "hire_date" date NOT NULL, "end_date" date, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_employees" PRIMARY KEY ("id"), CONSTRAINT "uq_employees_employee_number" UNIQUE ("employee_number"), CONSTRAINT "uq_employees_user_id" UNIQUE ("user_id"),
  CONSTRAINT "fk_employees_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "fk_employees_department_id" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "ck_employees_nonblank" CHECK (btrim("first_name") <> '' AND btrim("last_name") <> '' AND btrim("job_title") <> ''),
  CONSTRAINT "ck_employees_status" CHECK ("employment_status" IN ('active','inactive','terminated')), CONSTRAINT "ck_employees_dates" CHECK ("end_date" IS NULL OR "end_date" >= "hire_date")
);
CREATE INDEX "idx_employees_department_id_employment_status" ON "employees" ("department_id","employment_status");
CREATE INDEX "idx_employees_name_ci" ON "employees" (lower("last_name"),lower("first_name"));
CREATE TABLE "doctor_profiles" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(), "employee_id" uuid NOT NULL, "license_number" varchar(100) NOT NULL, "specialization" varchar(150) NOT NULL,
  "professional_summary" text, "contact_extension" varchar(20), "status" varchar(20) NOT NULL DEFAULT 'active', "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_doctor_profiles" PRIMARY KEY ("id"), CONSTRAINT "uq_doctor_profiles_employee_id" UNIQUE ("employee_id"), CONSTRAINT "uq_doctor_profiles_license_number" UNIQUE ("license_number"),
  CONSTRAINT "fk_doctor_profiles_employee_id" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "ck_doctor_profiles_nonblank" CHECK (btrim("license_number") <> '' AND btrim("specialization") <> ''), CONSTRAINT "ck_doctor_profiles_status" CHECK ("status" IN ('active','inactive'))
);
CREATE TABLE "doctor_schedules" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(), "doctor_id" uuid NOT NULL, "starts_at" timestamptz NOT NULL, "ends_at" timestamptz NOT NULL,
  "status" varchar(20) NOT NULL DEFAULT 'available', "note" varchar(500), "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_doctor_schedules" PRIMARY KEY ("id"), CONSTRAINT "fk_doctor_schedules_doctor_id" FOREIGN KEY ("doctor_id") REFERENCES "doctor_profiles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "ck_doctor_schedules_interval" CHECK ("ends_at" > "starts_at"), CONSTRAINT "ck_doctor_schedules_status" CHECK ("status" IN ('available','unavailable','cancelled'))
);
CREATE INDEX "idx_doctor_schedules_doctor_id_starts_at_ends_at" ON "doctor_schedules" ("doctor_id","starts_at","ends_at");
CREATE TABLE "attendance_records" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(), "employee_id" uuid NOT NULL, "work_date" date NOT NULL, "check_in_at" timestamptz, "check_out_at" timestamptz,
  "status" varchar(20) NOT NULL, "note" varchar(500), "recorded_by_user_id" uuid, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_attendance_records" PRIMARY KEY ("id"), CONSTRAINT "uq_attendance_records_employee_id_work_date" UNIQUE ("employee_id","work_date"),
  CONSTRAINT "fk_attendance_records_employee_id" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "fk_attendance_records_recorded_by_user_id" FOREIGN KEY ("recorded_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "ck_attendance_records_status" CHECK ("status" IN ('present','absent','leave')),
  CONSTRAINT "ck_attendance_records_times" CHECK ("check_out_at" IS NULL OR ("check_in_at" IS NOT NULL AND "check_out_at" > "check_in_at"))
);
CREATE INDEX "idx_attendance_records_status_work_date" ON "attendance_records" ("status","work_date");
CREATE TABLE "leave_records" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(), "employee_id" uuid NOT NULL, "starts_on" date NOT NULL, "ends_on" date NOT NULL, "leave_type" varchar(50) NOT NULL,
  "reason" text NOT NULL, "status" varchar(20) NOT NULL DEFAULT 'requested', "decided_by_user_id" uuid, "decided_at" timestamptz, "decision_note" varchar(500),
  "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_leave_records" PRIMARY KEY ("id"), CONSTRAINT "fk_leave_records_employee_id" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "fk_leave_records_decided_by_user_id" FOREIGN KEY ("decided_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "ck_leave_records_dates" CHECK ("ends_on" >= "starts_on"), CONSTRAINT "ck_leave_records_status" CHECK ("status" IN ('requested','approved','rejected','cancelled')),
  CONSTRAINT "ck_leave_records_decision" CHECK ((("status" IN ('approved','rejected')) AND "decided_by_user_id" IS NOT NULL AND "decided_at" IS NOT NULL) OR ("status" = 'requested' AND "decided_by_user_id" IS NULL AND "decided_at" IS NULL) OR "status" = 'cancelled')
);
CREATE INDEX "idx_leave_records_employee_id_starts_on_ends_on" ON "leave_records" ("employee_id","starts_on","ends_on");
CREATE INDEX "idx_leave_records_status_starts_on" ON "leave_records" ("status","starts_on");

CREATE TABLE "patients" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(), "patient_number" varchar(50) NOT NULL, "first_name" varchar(100) NOT NULL, "last_name" varchar(100) NOT NULL,
  "date_of_birth" date, "date_of_birth_precision" varchar(10) NOT NULL, "sex_at_registration" varchar(20), "phone" varchar(30), "email" varchar(254), "address_text" text,
  "emergency_contact_name" varchar(200), "emergency_contact_phone" varchar(30), "status" varchar(20) NOT NULL DEFAULT 'active',
  "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_patients" PRIMARY KEY ("id"), CONSTRAINT "uq_patients_patient_number" UNIQUE ("patient_number"),
  CONSTRAINT "ck_patients_names_nonblank" CHECK (btrim("first_name") <> '' AND btrim("last_name") <> ''),
  CONSTRAINT "ck_patients_birth_precision" CHECK (("date_of_birth_precision" = 'unknown' AND "date_of_birth" IS NULL) OR ("date_of_birth_precision" IN ('exact','month','year') AND "date_of_birth" IS NOT NULL)),
  CONSTRAINT "ck_patients_sex" CHECK ("sex_at_registration" IS NULL OR "sex_at_registration" IN ('female','male','intersex','unknown','not_disclosed')),
  CONSTRAINT "ck_patients_status" CHECK ("status" IN ('active','inactive','deceased'))
);
CREATE INDEX "idx_patients_name_ci" ON "patients" (lower("last_name"),lower("first_name"));
CREATE TABLE "patient_documents" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(), "patient_id" uuid NOT NULL, "uploaded_by_user_id" uuid NOT NULL, "object_key" varchar(500) NOT NULL,
  "original_name" varchar(255) NOT NULL, "detected_media_type" varchar(100) NOT NULL, "size_bytes" bigint NOT NULL, "checksum" varchar(128) NOT NULL,
  "category" varchar(50) NOT NULL, "status" varchar(20) NOT NULL DEFAULT 'pending', "description" varchar(500), "uploaded_at" timestamptz, "deleted_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_patient_documents" PRIMARY KEY ("id"), CONSTRAINT "uq_patient_documents_object_key" UNIQUE ("object_key"),
  CONSTRAINT "fk_patient_documents_patient_id" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "fk_patient_documents_uploaded_by_user_id" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "ck_patient_documents_size" CHECK ("size_bytes" > 0), CONSTRAINT "ck_patient_documents_nonblank" CHECK (btrim("object_key") <> '' AND btrim("original_name") <> '' AND btrim("checksum") <> '' AND btrim("category") <> ''),
  CONSTRAINT "ck_patient_documents_status" CHECK ("status" IN ('pending','available','quarantined','deleted')),
  CONSTRAINT "ck_patient_documents_lifecycle" CHECK (("status" <> 'available' OR "uploaded_at" IS NOT NULL) AND ("status" <> 'deleted' OR "deleted_at" IS NOT NULL))
);
CREATE INDEX "idx_patient_documents_patient_id_created_at" ON "patient_documents" ("patient_id","created_at" DESC);
CREATE INDEX "idx_patient_documents_status_created_at" ON "patient_documents" ("status","created_at");
CREATE TABLE "appointments" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(), "patient_id" uuid NOT NULL, "doctor_id" uuid NOT NULL, "starts_at" timestamptz NOT NULL, "ends_at" timestamptz NOT NULL,
  "status" varchar(20) NOT NULL DEFAULT 'scheduled', "reason" varchar(1000), "cancellation_reason" varchar(500), "cancelled_at" timestamptz,
  "cancelled_by_user_id" uuid, "rescheduled_from_appointment_id" uuid, "created_by_user_id" uuid NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_appointments" PRIMARY KEY ("id"), CONSTRAINT "uq_appointments_rescheduled_from_appointment_id" UNIQUE ("rescheduled_from_appointment_id"),
  CONSTRAINT "fk_appointments_patient_id" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "fk_appointments_doctor_id" FOREIGN KEY ("doctor_id") REFERENCES "doctor_profiles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "fk_appointments_cancelled_by_user_id" FOREIGN KEY ("cancelled_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "fk_appointments_rescheduled_from_appointment_id" FOREIGN KEY ("rescheduled_from_appointment_id") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "fk_appointments_created_by_user_id" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "ck_appointments_interval" CHECK ("ends_at" > "starts_at"), CONSTRAINT "ck_appointments_status" CHECK ("status" IN ('scheduled','checked_in','completed','cancelled','no_show')),
  CONSTRAINT "ck_appointments_cancellation" CHECK (("status" = 'cancelled' AND "cancellation_reason" IS NOT NULL AND btrim("cancellation_reason") <> '' AND "cancelled_at" IS NOT NULL AND "cancelled_by_user_id" IS NOT NULL) OR ("status" <> 'cancelled' AND "cancellation_reason" IS NULL AND "cancelled_at" IS NULL AND "cancelled_by_user_id" IS NULL)),
  CONSTRAINT "ck_appointments_not_self" CHECK ("rescheduled_from_appointment_id" IS NULL OR "rescheduled_from_appointment_id" <> "id"),
  CONSTRAINT "ex_appointments_doctor_active_overlap" EXCLUDE USING gist ("doctor_id" WITH =, tstzrange("starts_at","ends_at",'[)') WITH &&) WHERE ("status" IN ('scheduled','checked_in')),
  CONSTRAINT "ex_appointments_patient_active_overlap" EXCLUDE USING gist ("patient_id" WITH =, tstzrange("starts_at","ends_at",'[)') WITH &&) WHERE ("status" IN ('scheduled','checked_in'))
);
CREATE INDEX "idx_appointments_doctor_id_starts_at_status" ON "appointments" ("doctor_id","starts_at","status");
CREATE INDEX "idx_appointments_patient_id_starts_at" ON "appointments" ("patient_id","starts_at" DESC);
CREATE INDEX "idx_appointments_status_starts_at" ON "appointments" ("status","starts_at");
CREATE TABLE "admissions" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(), "admission_number" varchar(50) NOT NULL, "patient_id" uuid NOT NULL, "attending_doctor_id" uuid,
  "admitted_at" timestamptz NOT NULL, "discharged_at" timestamptz, "status" varchar(20) NOT NULL DEFAULT 'admitted', "reason" text NOT NULL, "discharge_summary" text,
  "created_by_user_id" uuid NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_admissions" PRIMARY KEY ("id"), CONSTRAINT "uq_admissions_admission_number" UNIQUE ("admission_number"),
  CONSTRAINT "fk_admissions_patient_id" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "fk_admissions_attending_doctor_id" FOREIGN KEY ("attending_doctor_id") REFERENCES "doctor_profiles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "fk_admissions_created_by_user_id" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "ck_admissions_status" CHECK ("status" IN ('admitted','discharged','cancelled')), CONSTRAINT "ck_admissions_discharge_time" CHECK ("discharged_at" IS NULL OR "discharged_at" >= "admitted_at"),
  CONSTRAINT "ck_admissions_discharge_state" CHECK (("status" = 'discharged' AND "discharged_at" IS NOT NULL) OR ("status" <> 'discharged' AND "discharged_at" IS NULL))
);
CREATE INDEX "idx_admissions_patient_id_admitted_at" ON "admissions" ("patient_id","admitted_at" DESC);
CREATE INDEX "idx_admissions_status_admitted_at" ON "admissions" ("status","admitted_at");
CREATE TABLE "medical_records" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(), "patient_id" uuid NOT NULL, "author_employee_id" uuid NOT NULL, "appointment_id" uuid, "admission_id" uuid,
  "occurred_at" timestamptz NOT NULL, "status" varchar(20) NOT NULL DEFAULT 'draft', "finalized_at" timestamptz, "amends_medical_record_id" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_medical_records" PRIMARY KEY ("id"), CONSTRAINT "uq_medical_records_amends_medical_record_id" UNIQUE ("amends_medical_record_id"),
  CONSTRAINT "fk_medical_records_patient_id" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "fk_medical_records_author_employee_id" FOREIGN KEY ("author_employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "fk_medical_records_appointment_id" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "fk_medical_records_admission_id" FOREIGN KEY ("admission_id") REFERENCES "admissions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "fk_medical_records_amends_medical_record_id" FOREIGN KEY ("amends_medical_record_id") REFERENCES "medical_records"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "ck_medical_records_context" CHECK (num_nonnulls("appointment_id","admission_id") <= 1), CONSTRAINT "ck_medical_records_status" CHECK ("status" IN ('draft','final','amended')),
  CONSTRAINT "ck_medical_records_finalized" CHECK ("status" NOT IN ('final','amended') OR "finalized_at" IS NOT NULL),
  CONSTRAINT "ck_medical_records_not_self" CHECK ("amends_medical_record_id" IS NULL OR "amends_medical_record_id" <> "id")
);
CREATE INDEX "idx_medical_records_patient_id_occurred_at" ON "medical_records" ("patient_id","occurred_at" DESC);
CREATE INDEX "idx_medical_records_author_employee_id_occurred_at" ON "medical_records" ("author_employee_id","occurred_at" DESC);
CREATE INDEX "idx_medical_records_appointment_id_present" ON "medical_records" ("appointment_id") WHERE "appointment_id" IS NOT NULL;
CREATE INDEX "idx_medical_records_admission_id_present" ON "medical_records" ("admission_id") WHERE "admission_id" IS NOT NULL;
CREATE TABLE "diagnoses" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(), "medical_record_id" uuid NOT NULL, "diagnosis_text" text NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_diagnoses" PRIMARY KEY ("id"), CONSTRAINT "fk_diagnoses_medical_record_id" FOREIGN KEY ("medical_record_id") REFERENCES "medical_records"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "ck_diagnoses_text_nonblank" CHECK (btrim("diagnosis_text") <> '')
);
CREATE INDEX "idx_diagnoses_medical_record_id_created_at" ON "diagnoses" ("medical_record_id","created_at");
CREATE TABLE "treatments" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(), "medical_record_id" uuid NOT NULL, "treatment_text" text NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_treatments" PRIMARY KEY ("id"), CONSTRAINT "fk_treatments_medical_record_id" FOREIGN KEY ("medical_record_id") REFERENCES "medical_records"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "ck_treatments_text_nonblank" CHECK (btrim("treatment_text") <> '')
);
CREATE INDEX "idx_treatments_medical_record_id_created_at" ON "treatments" ("medical_record_id","created_at");
CREATE TABLE "medical_reports" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(), "medical_record_id" uuid NOT NULL, "title" varchar(200) NOT NULL, "report_text" text NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_medical_reports" PRIMARY KEY ("id"), CONSTRAINT "fk_medical_reports_medical_record_id" FOREIGN KEY ("medical_record_id") REFERENCES "medical_records"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "ck_medical_reports_nonblank" CHECK (btrim("title") <> '' AND btrim("report_text") <> '')
);
CREATE INDEX "idx_medical_reports_medical_record_id_created_at" ON "medical_reports" ("medical_record_id","created_at");

CREATE TABLE "medicines" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(), "code" varchar(50) NOT NULL, "generic_name" varchar(200) NOT NULL, "brand_name" varchar(200), "dosage_form" varchar(100) NOT NULL,
  "strength" varchar(100), "inventory_unit" varchar(30) NOT NULL, "default_sale_price" numeric(19,4) NOT NULL DEFAULT 0, "currency" varchar(3) NOT NULL,
  "low_stock_threshold" numeric(14,4) NOT NULL DEFAULT 0, "status" varchar(20) NOT NULL DEFAULT 'active', "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_medicines" PRIMARY KEY ("id"), CONSTRAINT "uq_medicines_code" UNIQUE ("code"),
  CONSTRAINT "ck_medicines_nonblank" CHECK (btrim("generic_name") <> '' AND btrim("dosage_form") <> '' AND btrim("inventory_unit") <> ''),
  CONSTRAINT "ck_medicines_amounts" CHECK ("default_sale_price" >= 0 AND "low_stock_threshold" >= 0), CONSTRAINT "ck_medicines_currency" CHECK ("currency" ~ '^[A-Z]{3}$'),
  CONSTRAINT "ck_medicines_status" CHECK ("status" IN ('active','inactive'))
);
CREATE INDEX "idx_medicines_name_ci" ON "medicines" (lower("generic_name"),lower("brand_name"));
CREATE TABLE "prescriptions" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(), "medical_record_id" uuid NOT NULL, "patient_id" uuid NOT NULL, "prescribed_by_doctor_id" uuid NOT NULL,
  "prescribed_at" timestamptz NOT NULL DEFAULT now(), "status" varchar(30) NOT NULL DEFAULT 'active', "notes" text, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_prescriptions" PRIMARY KEY ("id"), CONSTRAINT "fk_prescriptions_medical_record_id" FOREIGN KEY ("medical_record_id") REFERENCES "medical_records"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "fk_prescriptions_patient_id" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "fk_prescriptions_prescribed_by_doctor_id" FOREIGN KEY ("prescribed_by_doctor_id") REFERENCES "doctor_profiles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "ck_prescriptions_status" CHECK ("status" IN ('active','partially_dispensed','dispensed','cancelled','expired'))
);
CREATE INDEX "idx_prescriptions_patient_id_prescribed_at_status" ON "prescriptions" ("patient_id","prescribed_at" DESC,"status");
CREATE INDEX "idx_prescriptions_medical_record_id" ON "prescriptions" ("medical_record_id");
CREATE INDEX "idx_prescriptions_prescribed_by_doctor_id_prescribed_at" ON "prescriptions" ("prescribed_by_doctor_id","prescribed_at" DESC);
CREATE TABLE "prescription_items" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(), "prescription_id" uuid NOT NULL, "medicine_id" uuid NOT NULL, "dosage" varchar(100) NOT NULL, "route" varchar(50),
  "frequency" varchar(100) NOT NULL, "duration" varchar(100) NOT NULL, "instructions" text, "quantity_prescribed" numeric(14,4) NOT NULL, "unit" varchar(30) NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_prescription_items" PRIMARY KEY ("id"), CONSTRAINT "fk_prescription_items_prescription_id" FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "fk_prescription_items_medicine_id" FOREIGN KEY ("medicine_id") REFERENCES "medicines"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "ck_prescription_items_quantity" CHECK ("quantity_prescribed" > 0),
  CONSTRAINT "ck_prescription_items_nonblank" CHECK (btrim("dosage") <> '' AND btrim("frequency") <> '' AND btrim("duration") <> '' AND btrim("unit") <> '')
);
CREATE INDEX "idx_prescription_items_prescription_id" ON "prescription_items" ("prescription_id");
CREATE INDEX "idx_prescription_items_medicine_id" ON "prescription_items" ("medicine_id");

CREATE TABLE "lab_test_definitions" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(), "code" varchar(50) NOT NULL, "name" varchar(200) NOT NULL, "specimen_type" varchar(100), "default_unit" varchar(50),
  "reference_range_description" text, "price" numeric(19,4), "currency" varchar(3), "status" varchar(20) NOT NULL DEFAULT 'active',
  "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_lab_test_definitions" PRIMARY KEY ("id"), CONSTRAINT "uq_lab_test_definitions_code" UNIQUE ("code"), CONSTRAINT "uq_lab_test_definitions_name" UNIQUE ("name"),
  CONSTRAINT "ck_lab_test_definitions_nonblank" CHECK (btrim("code") <> '' AND btrim("name") <> ''), CONSTRAINT "ck_lab_test_definitions_price" CHECK ("price" IS NULL OR "price" >= 0),
  CONSTRAINT "ck_lab_test_definitions_price_currency" CHECK (("price" IS NULL) = ("currency" IS NULL)), CONSTRAINT "ck_lab_test_definitions_currency" CHECK ("currency" IS NULL OR "currency" ~ '^[A-Z]{3}$'),
  CONSTRAINT "ck_lab_test_definitions_status" CHECK ("status" IN ('active','inactive'))
);
CREATE TABLE "lab_requests" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(), "patient_id" uuid NOT NULL, "requested_by_doctor_id" uuid NOT NULL, "medical_record_id" uuid,
  "requested_at" timestamptz NOT NULL DEFAULT now(), "status" varchar(30) NOT NULL DEFAULT 'requested', "clinical_note" text, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_lab_requests" PRIMARY KEY ("id"), CONSTRAINT "fk_lab_requests_patient_id" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "fk_lab_requests_requested_by_doctor_id" FOREIGN KEY ("requested_by_doctor_id") REFERENCES "doctor_profiles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "fk_lab_requests_medical_record_id" FOREIGN KEY ("medical_record_id") REFERENCES "medical_records"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "ck_lab_requests_status" CHECK ("status" IN ('requested','sample_collected','in_progress','completed','cancelled'))
);
CREATE INDEX "idx_lab_requests_patient_id_requested_at" ON "lab_requests" ("patient_id","requested_at" DESC);
CREATE INDEX "idx_lab_requests_status_requested_at" ON "lab_requests" ("status","requested_at");
CREATE INDEX "idx_lab_requests_requested_by_doctor_id_requested_at" ON "lab_requests" ("requested_by_doctor_id","requested_at" DESC);
CREATE INDEX "idx_lab_requests_medical_record_id_present" ON "lab_requests" ("medical_record_id") WHERE "medical_record_id" IS NOT NULL;
CREATE TABLE "lab_request_items" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(), "lab_request_id" uuid NOT NULL, "test_definition_id" uuid NOT NULL, "status" varchar(30) NOT NULL DEFAULT 'requested',
  "sample_collected_at" timestamptz, "sample_collected_by_employee_id" uuid, "price_snapshot" numeric(19,4), "currency" varchar(3),
  "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_lab_request_items" PRIMARY KEY ("id"), CONSTRAINT "fk_lab_request_items_lab_request_id" FOREIGN KEY ("lab_request_id") REFERENCES "lab_requests"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "fk_lab_request_items_test_definition_id" FOREIGN KEY ("test_definition_id") REFERENCES "lab_test_definitions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "fk_lab_request_items_sample_collected_by_employee_id" FOREIGN KEY ("sample_collected_by_employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "ck_lab_request_items_status" CHECK ("status" IN ('requested','sample_collected','in_progress','completed','cancelled')),
  CONSTRAINT "ck_lab_request_items_collection" CHECK (("sample_collected_at" IS NULL) = ("sample_collected_by_employee_id" IS NULL)),
  CONSTRAINT "ck_lab_request_items_price" CHECK ("price_snapshot" IS NULL OR "price_snapshot" >= 0), CONSTRAINT "ck_lab_request_items_price_currency" CHECK (("price_snapshot" IS NULL) = ("currency" IS NULL)),
  CONSTRAINT "ck_lab_request_items_currency" CHECK ("currency" IS NULL OR "currency" ~ '^[A-Z]{3}$')
);
CREATE INDEX "idx_lab_request_items_lab_request_id" ON "lab_request_items" ("lab_request_id");
CREATE INDEX "idx_lab_request_items_status_sample_collected_at" ON "lab_request_items" ("status","sample_collected_at");
CREATE INDEX "idx_lab_request_items_test_definition_id" ON "lab_request_items" ("test_definition_id");
CREATE TABLE "lab_results" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(), "lab_request_item_id" uuid NOT NULL, "version_number" integer NOT NULL, "result_value" text NOT NULL,
  "result_unit" varchar(50), "reference_range_snapshot" text, "result_note" text, "entered_by_employee_id" uuid NOT NULL, "entered_at" timestamptz NOT NULL DEFAULT now(),
  "finalized_by_employee_id" uuid, "finalized_at" timestamptz, "supersedes_lab_result_id" uuid,
  CONSTRAINT "pk_lab_results" PRIMARY KEY ("id"), CONSTRAINT "uq_lab_results_lab_request_item_id_version_number" UNIQUE ("lab_request_item_id","version_number"),
  CONSTRAINT "uq_lab_results_supersedes_lab_result_id" UNIQUE ("supersedes_lab_result_id"),
  CONSTRAINT "fk_lab_results_lab_request_item_id" FOREIGN KEY ("lab_request_item_id") REFERENCES "lab_request_items"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "fk_lab_results_entered_by_employee_id" FOREIGN KEY ("entered_by_employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "fk_lab_results_finalized_by_employee_id" FOREIGN KEY ("finalized_by_employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "fk_lab_results_supersedes_lab_result_id" FOREIGN KEY ("supersedes_lab_result_id") REFERENCES "lab_results"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "ck_lab_results_version" CHECK ("version_number" > 0), CONSTRAINT "ck_lab_results_value_nonblank" CHECK (btrim("result_value") <> ''),
  CONSTRAINT "ck_lab_results_finalization" CHECK (("finalized_by_employee_id" IS NULL) = ("finalized_at" IS NULL)),
  CONSTRAINT "ck_lab_results_not_self" CHECK ("supersedes_lab_result_id" IS NULL OR "supersedes_lab_result_id" <> "id")
);
CREATE INDEX "idx_lab_results_lab_request_item_id_version_number" ON "lab_results" ("lab_request_item_id","version_number" DESC);

CREATE TABLE "medicine_batches" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(), "medicine_id" uuid NOT NULL, "batch_number" varchar(100) NOT NULL, "expiry_date" date NOT NULL,
  "received_quantity" numeric(14,4) NOT NULL, "unit_cost" numeric(19,4) NOT NULL, "sale_price_snapshot" numeric(19,4) NOT NULL, "currency" varchar(3) NOT NULL,
  "received_at" timestamptz NOT NULL DEFAULT now(), "status" varchar(20) NOT NULL DEFAULT 'active', "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_medicine_batches" PRIMARY KEY ("id"), CONSTRAINT "uq_medicine_batches_medicine_id_batch_number" UNIQUE ("medicine_id","batch_number"),
  CONSTRAINT "fk_medicine_batches_medicine_id" FOREIGN KEY ("medicine_id") REFERENCES "medicines"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "ck_medicine_batches_quantity" CHECK ("received_quantity" > 0), CONSTRAINT "ck_medicine_batches_amounts" CHECK ("unit_cost" >= 0 AND "sale_price_snapshot" >= 0),
  CONSTRAINT "ck_medicine_batches_currency" CHECK ("currency" ~ '^[A-Z]{3}$'), CONSTRAINT "ck_medicine_batches_status" CHECK ("status" IN ('active','depleted','expired','quarantined'))
);
CREATE INDEX "idx_medicine_batches_medicine_id_expiry_date_status" ON "medicine_batches" ("medicine_id","expiry_date","status");
CREATE INDEX "idx_medicine_batches_status_expiry_date" ON "medicine_batches" ("status","expiry_date");
CREATE TABLE "dispense_records" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(), "prescription_item_id" uuid NOT NULL, "quantity_dispensed" numeric(14,4) NOT NULL, "unit" varchar(30) NOT NULL,
  "dispensed_at" timestamptz NOT NULL DEFAULT now(), "dispensed_by_employee_id" uuid NOT NULL, "status" varchar(20) NOT NULL DEFAULT 'completed',
  "note" varchar(500), "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_dispense_records" PRIMARY KEY ("id"), CONSTRAINT "fk_dispense_records_prescription_item_id" FOREIGN KEY ("prescription_item_id") REFERENCES "prescription_items"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "fk_dispense_records_dispensed_by_employee_id" FOREIGN KEY ("dispensed_by_employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "ck_dispense_records_quantity" CHECK ("quantity_dispensed" > 0), CONSTRAINT "ck_dispense_records_unit_nonblank" CHECK (btrim("unit") <> ''),
  CONSTRAINT "ck_dispense_records_status_completed" CHECK ("status" = 'completed')
);
CREATE INDEX "idx_dispense_records_prescription_item_id_dispensed_at" ON "dispense_records" ("prescription_item_id","dispensed_at");
CREATE INDEX "idx_dispense_records_dispensed_by_employee_id_dispensed_at" ON "dispense_records" ("dispensed_by_employee_id","dispensed_at" DESC);
CREATE TABLE "dispense_reversals" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(), "dispense_record_id" uuid NOT NULL, "quantity_reversed" numeric(14,4) NOT NULL, "reason" varchar(500) NOT NULL,
  "reversed_by_user_id" uuid NOT NULL, "reversed_at" timestamptz NOT NULL DEFAULT now(), "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_dispense_reversals" PRIMARY KEY ("id"), CONSTRAINT "uq_dispense_reversals_dispense_record_id" UNIQUE ("dispense_record_id"),
  CONSTRAINT "fk_dispense_reversals_dispense_record_id" FOREIGN KEY ("dispense_record_id") REFERENCES "dispense_records"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "fk_dispense_reversals_reversed_by_user_id" FOREIGN KEY ("reversed_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "ck_dispense_reversals_quantity" CHECK ("quantity_reversed" > 0), CONSTRAINT "ck_dispense_reversals_reason_nonblank" CHECK (btrim("reason") <> '')
);
CREATE TABLE "stock_movements" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(), "medicine_batch_id" uuid NOT NULL, "movement_type" varchar(20) NOT NULL, "quantity" numeric(14,4) NOT NULL,
  "dispense_record_id" uuid, "dispense_reversal_id" uuid, "occurred_at" timestamptz NOT NULL DEFAULT now(), "performed_by_user_id" uuid NOT NULL,
  "reason" varchar(500) NOT NULL, "reference_identifier" varchar(100),
  CONSTRAINT "pk_stock_movements" PRIMARY KEY ("id"), CONSTRAINT "fk_stock_movements_medicine_batch_id" FOREIGN KEY ("medicine_batch_id") REFERENCES "medicine_batches"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "fk_stock_movements_dispense_record_id" FOREIGN KEY ("dispense_record_id") REFERENCES "dispense_records"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "fk_stock_movements_dispense_reversal_id" FOREIGN KEY ("dispense_reversal_id") REFERENCES "dispense_reversals"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "fk_stock_movements_performed_by_user_id" FOREIGN KEY ("performed_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "ck_stock_movements_type" CHECK ("movement_type" IN ('receipt','dispense','adjustment','return','disposal')),
  CONSTRAINT "ck_stock_movements_quantity_nonzero" CHECK ("quantity" <> 0),
  CONSTRAINT "ck_stock_movements_sign" CHECK (("movement_type" IN ('receipt','return') AND "quantity" > 0) OR ("movement_type" IN ('dispense','disposal') AND "quantity" < 0) OR "movement_type" = 'adjustment'),
  CONSTRAINT "ck_stock_movements_allocation" CHECK (
    ("movement_type" = 'dispense' AND "quantity" < 0 AND "dispense_record_id" IS NOT NULL AND "dispense_reversal_id" IS NULL) OR
    ("movement_type" = 'return' AND "quantity" > 0 AND "dispense_record_id" IS NULL AND "dispense_reversal_id" IS NOT NULL) OR
    ("movement_type" IN ('receipt','adjustment','disposal') AND "dispense_record_id" IS NULL AND "dispense_reversal_id" IS NULL)
  )
);
CREATE INDEX "idx_stock_movements_medicine_batch_id_occurred_at" ON "stock_movements" ("medicine_batch_id","occurred_at");
CREATE INDEX "idx_stock_movements_dispense_record_id" ON "stock_movements" ("dispense_record_id");
CREATE INDEX "idx_stock_movements_dispense_reversal_id" ON "stock_movements" ("dispense_reversal_id");
CREATE INDEX "idx_stock_movements_occurred_at_movement_type" ON "stock_movements" ("occurred_at","movement_type");

CREATE TABLE "invoices" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(), "invoice_number" varchar(50) NOT NULL, "patient_id" uuid NOT NULL, "issued_at" timestamptz NOT NULL DEFAULT now(),
  "due_at" timestamptz, "currency" varchar(3) NOT NULL, "subtotal" numeric(19,4) NOT NULL DEFAULT 0, "discount_amount" numeric(19,4) NOT NULL DEFAULT 0,
  "tax_amount" numeric(19,4) NOT NULL DEFAULT 0, "total_amount" numeric(19,4) NOT NULL DEFAULT 0, "amount_paid" numeric(19,4) NOT NULL DEFAULT 0,
  "balance_amount" numeric(19,4) NOT NULL DEFAULT 0, "status" varchar(20) NOT NULL DEFAULT 'draft', "created_by_user_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_invoices" PRIMARY KEY ("id"), CONSTRAINT "uq_invoices_invoice_number" UNIQUE ("invoice_number"),
  CONSTRAINT "fk_invoices_patient_id" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "fk_invoices_created_by_user_id" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "ck_invoices_currency" CHECK ("currency" ~ '^[A-Z]{3}$'), CONSTRAINT "ck_invoices_status" CHECK ("status" IN ('draft','issued','partially_paid','paid','void')),
  CONSTRAINT "ck_invoices_amounts" CHECK ("subtotal" >= 0 AND "discount_amount" >= 0 AND "tax_amount" >= 0 AND "total_amount" >= 0 AND "amount_paid" >= 0 AND "balance_amount" >= 0 AND "discount_amount" <= "subtotal" AND "amount_paid" <= "total_amount"),
  CONSTRAINT "ck_invoices_total" CHECK ("total_amount" = "subtotal" - "discount_amount" + "tax_amount"),
  CONSTRAINT "ck_invoices_balance" CHECK ("balance_amount" = "total_amount" - "amount_paid"), CONSTRAINT "ck_invoices_due_at" CHECK ("due_at" IS NULL OR "due_at" >= "issued_at")
);
CREATE INDEX "idx_invoices_patient_id_issued_at" ON "invoices" ("patient_id","issued_at" DESC);
CREATE INDEX "idx_invoices_status_issued_at" ON "invoices" ("status","issued_at");
CREATE TABLE "invoice_items" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(), "invoice_id" uuid NOT NULL, "category" varchar(20) NOT NULL, "description" varchar(500) NOT NULL,
  "quantity" numeric(14,4) NOT NULL DEFAULT 1, "unit_price" numeric(19,4) NOT NULL, "line_total" numeric(19,4) NOT NULL,
  "appointment_id" uuid, "lab_request_item_id" uuid, "dispense_record_id" uuid, "admission_id" uuid, "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_invoice_items" PRIMARY KEY ("id"), CONSTRAINT "fk_invoice_items_invoice_id" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "fk_invoice_items_appointment_id" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "fk_invoice_items_lab_request_item_id" FOREIGN KEY ("lab_request_item_id") REFERENCES "lab_request_items"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "fk_invoice_items_dispense_record_id" FOREIGN KEY ("dispense_record_id") REFERENCES "dispense_records"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "fk_invoice_items_admission_id" FOREIGN KEY ("admission_id") REFERENCES "admissions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "ck_invoice_items_category" CHECK ("category" IN ('consultation','laboratory','pharmacy','admission')),
  CONSTRAINT "ck_invoice_items_amounts" CHECK ("quantity" > 0 AND "unit_price" >= 0 AND "line_total" >= 0),
  CONSTRAINT "ck_invoice_items_line_total" CHECK ("line_total" = round("quantity" * "unit_price",4)),
  CONSTRAINT "ck_invoice_items_source" CHECK (
    ("category" = 'consultation' AND "appointment_id" IS NOT NULL AND num_nonnulls("appointment_id","lab_request_item_id","dispense_record_id","admission_id") = 1) OR
    ("category" = 'laboratory' AND "lab_request_item_id" IS NOT NULL AND num_nonnulls("appointment_id","lab_request_item_id","dispense_record_id","admission_id") = 1) OR
    ("category" = 'pharmacy' AND "dispense_record_id" IS NOT NULL AND num_nonnulls("appointment_id","lab_request_item_id","dispense_record_id","admission_id") = 1) OR
    ("category" = 'admission' AND "admission_id" IS NOT NULL AND num_nonnulls("appointment_id","lab_request_item_id","dispense_record_id","admission_id") = 1)
  )
);
CREATE INDEX "idx_invoice_items_invoice_id" ON "invoice_items" ("invoice_id");
CREATE INDEX "idx_invoice_items_appointment_id_present" ON "invoice_items" ("appointment_id") WHERE "appointment_id" IS NOT NULL;
CREATE INDEX "idx_invoice_items_lab_request_item_id_present" ON "invoice_items" ("lab_request_item_id") WHERE "lab_request_item_id" IS NOT NULL;
CREATE INDEX "idx_invoice_items_dispense_record_id_present" ON "invoice_items" ("dispense_record_id") WHERE "dispense_record_id" IS NOT NULL;
CREATE INDEX "idx_invoice_items_admission_id_present" ON "invoice_items" ("admission_id") WHERE "admission_id" IS NOT NULL;
CREATE TABLE "payments" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(), "payment_number" varchar(50) NOT NULL, "invoice_id" uuid NOT NULL, "amount" numeric(19,4) NOT NULL,
  "currency" varchar(3) NOT NULL, "method" varchar(50) NOT NULL, "external_reference" varchar(200), "status" varchar(20) NOT NULL DEFAULT 'recorded',
  "paid_at" timestamptz NOT NULL DEFAULT now(), "received_by_user_id" uuid NOT NULL, "reverses_payment_id" uuid, "note" varchar(500),
  "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_payments" PRIMARY KEY ("id"), CONSTRAINT "uq_payments_payment_number" UNIQUE ("payment_number"), CONSTRAINT "uq_payments_reverses_payment_id" UNIQUE ("reverses_payment_id"),
  CONSTRAINT "fk_payments_invoice_id" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "fk_payments_received_by_user_id" FOREIGN KEY ("received_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "fk_payments_reverses_payment_id" FOREIGN KEY ("reverses_payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "ck_payments_amount" CHECK ("amount" > 0), CONSTRAINT "ck_payments_currency" CHECK ("currency" ~ '^[A-Z]{3}$'),
  CONSTRAINT "ck_payments_status" CHECK ("status" IN ('recorded','void','reversed')), CONSTRAINT "ck_payments_not_self" CHECK ("reverses_payment_id" IS NULL OR "reverses_payment_id" <> "id"),
  CONSTRAINT "ck_payments_reversal_note" CHECK ("reverses_payment_id" IS NULL OR ("note" IS NOT NULL AND btrim("note") <> ''))
);
CREATE INDEX "idx_payments_invoice_id_paid_at_status" ON "payments" ("invoice_id","paid_at","status");
CREATE INDEX "idx_payments_received_by_user_id_paid_at" ON "payments" ("received_by_user_id","paid_at" DESC);

-- Cross-row invariants intentionally remain in locked application transactions:
-- chain ownership/acyclicity; patient/currency/unit/medicine agreement; minimum child
-- counts; nonnegative available stock; dispense allocation totals; reversal quantity
-- equality; and exact mirrored reversal batch allocations. The approved design does not
-- authorize database triggers for these rules.
