BEGIN;
-- AlterTable
ALTER TABLE "Shift" ADD COLUMN     "engagementTerms" TEXT;

-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "appliedBrief" JSONB,
ADD COLUMN     "noticeVersion" TEXT,
ADD COLUMN     "termsVersion" TEXT;

-- CreateTable
CREATE TABLE "VacancyRelease" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "activeSlot" TEXT,
    "briefVersion" TEXT NOT NULL,
    "evidenceRef" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "viewers" TEXT[],
    "applicants" TEXT[],
    "bookable" TEXT[],
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retiredAt" TIMESTAMP(3),
    "retiredBy" TEXT,

    CONSTRAINT "VacancyRelease_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VacancyRelease_activeSlot_key" ON "VacancyRelease"("activeSlot");

-- CreateIndex
CREATE INDEX "VacancyRelease_shiftId_createdAt_idx" ON "VacancyRelease"("shiftId", "createdAt");

-- AddForeignKey
ALTER TABLE "VacancyRelease" ADD CONSTRAINT "VacancyRelease_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE public."VacancyRelease" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."VacancyRelease" FROM PUBLIC;
DO $$
DECLARE api_role text;
BEGIN
  FOR api_role IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated') LOOP
    EXECUTE format('REVOKE ALL ON public."VacancyRelease" FROM %I', api_role);
  END LOOP;
END;
$$;
COMMIT;
