-- Nullable on every historical entry. Existing consent is never inferred.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE public."WaitlistEntry" ADD COLUMN "withdrawnAt" TIMESTAMP(3),
    ADD COLUMN "withdrawalCaseId" TEXT;
COMMIT;
