-- D-026: at most one admission with status 'admitted' per patient.
-- Discharged and cancelled rows are excluded from the unique key.
CREATE UNIQUE INDEX "uq_admissions_one_active_per_patient"
ON "admissions" ("patient_id")
WHERE "status" = 'admitted';
