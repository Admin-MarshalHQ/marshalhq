BEGIN;
SET LOCAL lock_timeout = '5s';
-- CreateTable
CREATE TABLE "PilotJoinCode" (
    "tokenHash" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PilotJoinCode_pkey" PRIMARY KEY ("tokenHash")
);

-- CreateTable
CREATE TABLE "PilotAgreement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "termsVersion" TEXT NOT NULL,
    "noticeVersion" TEXT NOT NULL,
    "terms" TEXT NOT NULL,
    "notice" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PilotAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PilotJoinCode_expiresAt_idx" ON "PilotJoinCode"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PilotAgreement_userId_role_termsVersion_noticeVersion_key" ON "PilotAgreement"("userId", "role", "termsVersion", "noticeVersion");

-- AddForeignKey
ALTER TABLE "PilotAgreement" ADD CONSTRAINT "PilotAgreement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE public."PilotJoinCode" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PilotAgreement" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."PilotJoinCode", public."PilotAgreement" FROM PUBLIC;
DO $$
DECLARE api_role text;
BEGIN
  FOR api_role IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated') LOOP
    EXECUTE format('REVOKE ALL ON public."PilotJoinCode", public."PilotAgreement" FROM %I', api_role);
  END LOOP;
END;
$$;
COMMIT;
