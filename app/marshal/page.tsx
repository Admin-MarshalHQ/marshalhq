import Link from "next/link";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/db";
import {
  ApplicationStatusBadge,
  ButtonLink,
  DateBlock,
  EmptyState,
  Kicker,
  PageHeader,
  ShiftStatusBadge,
  StatCard,
} from "@/components/ui";
import { formatShiftBlock } from "@/lib/format";

export default async function MarshalHome() {
  const user = await requireRole("MARSHAL");
  const profile = await prisma.marshalProfile.findUnique({
    where: { userId: user.id },
  });
  const apps = await prisma.application.findMany({
    where: { marshalId: user.id, status: { in: ["APPLIED", "ACCEPTED"] } },
    orderBy: { appliedAt: "desc" },
    include: { shift: true },
  });

  const acceptedCount = apps.filter((a) => a.status === "ACCEPTED").length;
  const pendingCount = apps.filter((a) => a.status === "APPLIED").length;

  return (
    <div>
      <PageHeader
        kicker="Marshal dashboard"
        title={profile?.fullName ?? "Your dashboard"}
        subtitle="Your applications and bookings in one place. Contact details release when a manager accepts you."
        action={
          <ButtonLink href="/marshal/shifts">Browse shifts</ButtonLink>
        }
      />

      {!profile && (
        <div className="mb-4 rounded-md border border-gold/40 bg-gold-soft/60 p-4">
          <p className="text-sm font-medium text-ink">
            Create your marshal profile before applying to shifts.
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            Managers decide from your profile — location, travel range, and a
            short experience summary are what get you booked.
          </p>
          <div className="mt-3">
            <ButtonLink href="/marshal/profile/edit">
              Create profile
            </ButtonLink>
          </div>
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Awaiting a decision"
          value={pendingCount}
          hint="Applications a manager hasn't decided on yet"
        />
        <StatCard
          label="Booked"
          value={acceptedCount}
          hint="Accepted bookings — contact details are on each one"
        />
        <StatCard
          label="Completed"
          value={profile?.completedCount ?? 0}
          hint="Your completed-shift record"
          href="/marshal/history"
        />
      </div>

      <Kicker className="mb-2 mt-8">Active applications</Kicker>
      {apps.length === 0 ? (
        <EmptyState
          title="No active applications"
          body="Browse open shifts to find work near you. You'll see each application's status here after you apply."
          action={<ButtonLink href="/marshal/shifts">Browse shifts</ButtonLink>}
        />
      ) : (
        <div className="space-y-2">
          {apps.map((a) => (
            <Link
              key={a.id}
              href={`/marshal/applications/${a.id}`}
              className="block rounded-md border border-line bg-white p-4 shadow-[0_1px_0_rgba(28,25,21,0.03)] hover:bg-surface-subtle"
            >
              <div className="flex items-start gap-3">
                <DateBlock date={a.shift.startDate} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-serif text-lg leading-snug text-ink">
                      {a.shift.productionName}
                    </p>
                    <ApplicationStatusBadge status={a.status} />
                    <ShiftStatusBadge status={a.shift.status} />
                  </div>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    {a.shift.location} ·{" "}
                    {formatShiftBlock(
                      a.shift.startDate,
                      a.shift.endDate,
                      a.shift.dailyStartTime,
                      a.shift.dailyEndTime,
                    )}
                  </p>
                  <p className="mt-1 text-xs text-ink-soft">
                    {a.status === "ACCEPTED"
                      ? "You're booked — contact details are on the application page."
                      : "Waiting for the manager's decision. You'll be notified either way."}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
