-- Apply before deploying the correction action. Existing outcomes stay untouched.
BEGIN;
CREATE TABLE IF NOT EXISTS public."AttendanceChange" (
  "id" TEXT PRIMARY KEY,
  "applicationId" TEXT NOT NULL REFERENCES public."Application"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "reviewerId" TEXT NOT NULL,
  "previous" TEXT,
  "outcome" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "AttendanceChange_applicationId_createdAt_idx"
  ON public."AttendanceChange" ("applicationId","createdAt");
ALTER TABLE public."AttendanceChange" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."AttendanceChange" FROM PUBLIC;
DO $$
DECLARE api_role text;
BEGIN
  FOR api_role IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated') LOOP
    EXECUTE format('REVOKE ALL ON public."AttendanceChange" FROM %I', api_role);
  END LOOP;
END;
$$;
COMMIT;
