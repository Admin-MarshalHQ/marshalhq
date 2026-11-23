-- Apply with the Prisma database role before deploying founder passcode login.
BEGIN;

CREATE TABLE IF NOT EXISTS public."FounderLoginPasscode" (
    "userId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "codeHash" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FounderLoginPasscode_pkey" PRIMARY KEY ("userId"),
    CONSTRAINT "FounderLoginPasscode_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES public."User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- The application uses Prisma. No Data API roles need access to these rows.
ALTER TABLE public."FounderLoginPasscode" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."FounderLoginPasscode" FROM PUBLIC;

COMMIT;
