BEGIN;
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "disabledAt" TIMESTAMP(3),
ADD COLUMN     "sessionVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "FounderSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FounderSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestBudget" (
    "key" TEXT NOT NULL,
    "hits" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequestBudget_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "FounderSession_userId_idx" ON "FounderSession"("userId");

-- CreateIndex
CREATE INDEX "RequestBudget_expiresAt_idx" ON "RequestBudget"("expiresAt");

-- AddForeignKey
ALTER TABLE "FounderSession" ADD CONSTRAINT "FounderSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve revocation across a disable/re-enable cycle, including administrative SQL.
CREATE FUNCTION public.setru_disable_sessions() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."disabledAt" IS NULL AND NEW."disabledAt" IS NOT NULL THEN
    NEW."sessionVersion" := OLD."sessionVersion" + 1;
    DELETE FROM public."FounderLoginPasscode" WHERE "userId" = OLD.id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER setru_disable_sessions BEFORE UPDATE OF "disabledAt" ON public."User"
FOR EACH ROW EXECUTE FUNCTION public.setru_disable_sessions();

ALTER TABLE public."FounderSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."RequestBudget" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."FounderSession", public."RequestBudget" FROM PUBLIC;
DO $$
DECLARE api_role text;
BEGIN
  FOR api_role IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated') LOOP
    EXECUTE format('REVOKE ALL ON public."FounderSession", public."RequestBudget" FROM %I', api_role);
  END LOOP;
END;
$$;
COMMIT;
