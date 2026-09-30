-- D-031: each user has exactly one role.
-- Local hms_development (24 users, 24 role rows) and hms_test (no user_roles
-- rows) were inspected on 2026-09-29. No user had more than one role, so no
-- role rows were rewritten before this constraint.

-- CreateIndex
CREATE UNIQUE INDEX "uq_user_roles_user_id" ON "user_roles"("user_id");
