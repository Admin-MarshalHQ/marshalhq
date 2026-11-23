-- Apply after attendance-change.sql, before the new application build.
BEGIN;
-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "link" TEXT;

-- AlterTable
ALTER TABLE "SupportRequest" ADD COLUMN     "revision" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "MailDelivery" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT,
    "waitlistId" TEXT,
    "shiftId" TEXT,
    "retryAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lease" TEXT,

    CONSTRAINT "MailDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MailDelivery_notificationId_key" ON "MailDelivery"("notificationId");

-- CreateIndex
CREATE UNIQUE INDEX "MailDelivery_waitlistId_key" ON "MailDelivery"("waitlistId");

-- CreateIndex
CREATE INDEX "MailDelivery_sentAt_retryAt_idx" ON "MailDelivery"("sentAt", "retryAt");

-- CreateIndex
CREATE INDEX "MailDelivery_shiftId_idx" ON "MailDelivery"("shiftId");

-- AddForeignKey
ALTER TABLE "MailDelivery" ADD CONSTRAINT "MailDelivery_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailDelivery" ADD CONSTRAINT "MailDelivery_waitlistId_fkey" FOREIGN KEY ("waitlistId") REFERENCES "WaitlistEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "MailDelivery" ADD CONSTRAINT "MailDelivery_one_owner"
  CHECK (num_nonnulls("notificationId", "waitlistId") = 1);
ALTER TABLE "MailDelivery" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "MailDelivery" FROM PUBLIC;
DO $$
DECLARE api_role text;
BEGIN
  FOR api_role IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated') LOOP
    EXECUTE format('REVOKE ALL ON "MailDelivery" FROM %I', api_role);
  END LOOP;
END;
$$;

-- Old notices have no application key. Link only unambiguous matches for
-- this recipient. Historical mail dispatch cannot be inferred from an inbox row.
WITH matches AS (
  SELECT n.id, min(a.id) AS application_id
  FROM "Notification" n
  JOIN "Application" a ON a."marshalId" = n."userId"
  JOIN "Shift" s ON s.id = a."shiftId"
  WHERE n.kind = 'APPLICATION_ACCEPTED' AND n.link IS NULL
    AND n.subject IN ('You’re booked: ' || s."productionName", 'You''re booked: ' || s."productionName")
    AND a."appliedAt" <= n."createdAt"
  GROUP BY n.id HAVING count(*) = 1
)
UPDATE "Notification" n SET link = '/marshal/applications/' || m.application_id
FROM matches m WHERE n.id = m.id;

UPDATE "Notification" n SET link = '/founder/shifts/' || s.id
FROM "Shift" s
WHERE n.kind = 'SHIFT_STATUS_CHANGED' AND n.link IS NULL
  AND n.body = 'Review the disputed bookings in the founder shift record (/founder/shifts/' || s.id || ').';

COMMIT;
