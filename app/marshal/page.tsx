import { worked } from "@/lib/attendance";
import type { Metadata } from "next";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/db";
import {
  ButtonLink,
  EmptyState,
  PageHeader,
  StatCard,
  StatusBadge,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { formatShiftBlock } from "@/lib/format";
import { marshalApplicationOutcome } from "@/lib/application-outcome";
import { currentBookings } from "@/lib/workspace-shifts";
import { MarshalApplicationRow } from "@/components/MarshalApplicationRow";

export const metadata: Metadata = { title: "My dashboard" };

export default async function MarshalHome() {
  const user = await requireRole("MARSHAL");
  const profile = await prisma.marshalProfile.findUnique({
    where: { userId: user.id },
  });
  const apps = await prisma.application.findMany({
    where: { marshalId: user.id },
    orderBy: { appliedAt: "desc" },
    include: { shift: true },
  });

  const booked = currentBookings(apps, new Date());
  const awaitingDecision = apps.filter((a) => a.status === "APPLIED" && a.shift.status === "OPEN" && !a.shift.paused);
  const nextBooking = booked[0];
  const featuredOutcome = nextBooking && marshalApplicationOutcome(nextBooking.status, nextBooking.shift);
  const recentApplications = apps.slice(0, 10);

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

      {nextBooking && featuredOutcome && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-ok/30 bg-ok-soft p-4">
          <div className="min-w-0">
            <StatusBadge label={featuredOutcome.label} tone={featuredOutcome.tone} />
            <p className="mt-1 font-bold max-sm:line-clamp-2">{nextBooking.shift.productionName}</p>
            <p className="mt-1 text-sm text-ink-muted">{formatShiftBlock(nextBooking.shift.startDate, nextBooking.shift.endDate, nextBooking.shift.dailyStartTime, nextBooking.shift.dailyEndTime)}</p>
          </div>
          <ButtonLink href={`/marshal/applications/${nextBooking.id}`} variant="secondary">View booking</ButtonLink>
        </div>
      )}

      <div className="summary-grid">
        <StatCard label="Awaiting a decision" value={awaitingDecision.length} />
        <StatCard label="Current and upcoming bookings" value={booked.length} icon="check" tone="ok" />
        <StatCard label="Completed shifts" value={apps.filter(a => a.status === "ACCEPTED" && a.shift.status === "COMPLETED" && worked(a.attendance)).length} href="/marshal/history" icon="calendar" tone="neutral" />
      </div>

      <div className="mb-2 mt-6 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold tracking-tight">Recent applications</h2>
        <ButtonLink href="/marshal/applications" variant="ghost">View all <Icon name="arrow" className="ml-2 size-4" /></ButtonLink>
      </div>
      {recentApplications.length === 0 ? (
        <EmptyState
          title="No applications yet"
          body="Browse open shifts to find work near you. You'll see each application's status here after you apply."
          action={<ButtonLink href="/marshal/shifts">Browse shifts</ButtonLink>}
        />
      ) : (
        <div className="space-y-2">
          {recentApplications.map((application) => (
            <MarshalApplicationRow key={application.id} application={application} />
          ))}
        </div>
      )}
    </div>
  );
}
