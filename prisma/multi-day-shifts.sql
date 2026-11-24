-- Apply after functional-bug-log.sql and before deploying the new build.
BEGIN;
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "attendanceDays" JSONB,
                          ADD COLUMN IF NOT EXISTS "releasedFrom" TIMESTAMP(3);
ALTER TABLE "AttendanceChange" ADD COLUMN IF NOT EXISTS "callDate" TIMESTAMP(3);
COMMIT;
