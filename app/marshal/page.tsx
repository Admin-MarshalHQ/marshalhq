import Link from "next/link";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/db";
import {
  ApplicationStatusBadge,
  ButtonLink,
  DateBlock,
  EmptyState,
  PageHeader,
  ShiftStatusBadge,
  StatCard,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
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

  const booked = apps
    .filter((a) => a.status === "ACCEPTED" && ["OPEN", "FILLED"].includes(a.shift.status))
    .sort((a, b) => a.shift.startDate.getTime() - b.shift.startDate.getTime());
  const awaitingDecision = apps.filter((a) => a.status === "APPLIED");
  const nextBooking = booked[0];

  return (
    <div>
      <PageHeader
        title={profile ? `Welcome back, ${profile.fullName}` : "Your dashboard"}
        subtitle="Your applications and upcoming work."
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

      {nextBooking && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-ok/30 bg-ok-soft p-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold text-ok"><Icon name="check" className="size-4 shrink-0" /> Booked shift</p>
            <p className="mt-1 font-bold">{nextBooking.shift.productionName}</p>
            <p className="mt-1 text-sm text-ink-muted">{formatShiftBlock(nextBooking.shift.startDate, nextBooking.shift.endDate, nextBooking.shift.dailyStartTime, nextBooking.shift.dailyEndTime)}</p>
          </div>
          <ButtonLink href={`/marshal/applications/${nextBooking.id}`} variant="secondary">View booking</ButtonLink>
        </div>
      )}

      <div className="grid gap-3 min-[530px]:grid-cols-3">
        <StatCard label="Awaiting a decision" value={awaitingDecision.length} />
        <StatCard label="Booked shifts" value={booked.length} icon="check" tone="ok" />
        <StatCard label="Completed shifts" value={profile?.completedCount ?? 0} href="/marshal/history" icon="calendar" tone="neutral" />
      </div>

      <div className="mb-2 mt-6 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold tracking-tight">Active applications</h2>
        <ButtonLink href="/marshal/applications" variant="ghost">View all <Icon name="arrow" className="ml-2 size-4" /></ButtonLink>
      </div>
      {booked.length + awaitingDecision.length === 0 ? (
        <EmptyState
          title="No active applications"
          body="Browse open shifts to find work near you. You'll see each application's status here after you apply."
          action={<ButtonLink href="/marshal/shifts">Browse shifts</ButtonLink>}
        />
      ) : (
        <div className="space-y-2">
          {[...booked, ...awaitingDecision].map((a) => (
            <Link
              key={a.id}
              href={`/marshal/applications/${a.id}`}
              className="card-link"
            >
              <div className="flex items-start gap-3">
                <DateBlock date={a.shift.startDate} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-bold leading-snug text-ink">
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
