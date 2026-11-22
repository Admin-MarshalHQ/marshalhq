import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/access";
import {
  AttentionItem,
  AttentionList,
  ButtonLink,
  CapacityMeter,
  DateBlock,
  EmptyState,
  PageHeader,
  ShiftStatusBadge,
  StatCard,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { formatRate, formatShiftBlock } from "@/lib/format";
import { canCompleteShift, shiftStartDateTime } from "@/lib/state";

// Per-shift attention cues. The loop stalls on exactly two manager actions —
// reviewing applicants and settling a shift's outcome — so the dashboard must
// say where those are needed instead of leaving the manager to open every
// shift. "stale-open" = an OPEN shift whose first day started with no one
// booked: it will never fill and should be closed (or reposted with new
// dates). "awaiting-completion" = a FILLED shift past its scheduled end,
// ready to be marked complete so the marshal's trust record accrues.
type ShiftAttention = "stale-open" | "awaiting-completion" | null;

function shiftAttention(shift: {
  status: string;
  startDate: Date;
  endDate: Date;
  dailyStartTime: string;
  dailyEndTime: string;
}): ShiftAttention {
  if (
    shift.status === "OPEN" &&
    shiftStartDateTime(shift.startDate, shift.dailyStartTime).getTime() <=
      Date.now()
  ) {
    return "stale-open";
  }
  if (canCompleteShift(shift)) return "awaiting-completion";
  return null;
}

export default async function ManagerDashboard() {
  const user = await requireRole("MANAGER");
  const profile = await prisma.managerProfile.findUnique({
    where: { userId: user.id },
  });
  const records = await prisma.shift.findMany({
    where: { managerId: user.id },
    orderBy: [{ startDate: "asc" }, { createdAt: "desc" }],
    include: {
      applications: {
        select: {
          status: true,
          marshal: { select: { marshalProfile: { select: { paused: true } } } },
        },
      },
    },
  });

  const shifts = records.map((shift) => ({
    ...shift,
    pendingCount: shift.applications.filter((application) => {
      const profile = application.marshal.marshalProfile;
      return application.status === "APPLIED" && profile && !profile.paused;
    }).length,
    bookedCount: shift.applications.filter((application) => application.status === "ACCEPTED").length,
  }));

  const byGroup = {
    active: shifts.filter(
      (s) => s.status === "DRAFT" || s.status === "OPEN" || s.status === "FILLED",
    ),
    archive: shifts.filter(
      (s) => s.status === "COMPLETED" || s.status === "CLOSED",
    ),
  };

  // Attention queue: one linked row per place the staffing loop is waiting on
  // the manager, so nothing requires opening every shift to find out.
  const attention: {
    href: string;
    title: string;
    meta?: string;
    count?: number;
  }[] = [];
  for (const s of shifts) {
    if (s.status === "OPEN" && !s.paused && s.pendingCount > 0) {
      attention.push({
        href: `/manager/shifts/${s.id}/applicants`,
        title: `Review applicants — ${s.productionName}`,
        meta: `${s.pendingCount} waiting for a decision`,
        count: s.pendingCount,
      });
    }
    const cue = shiftAttention(s);
    if (cue === "stale-open") {
      attention.push({
        href: `/manager/shifts/${s.id}`,
        title: `Start date passed — ${s.productionName}`,
        meta: "This shift can no longer fill. Close it or repost with new dates.",
      });
    }
    if (cue === "awaiting-completion") {
      attention.push({
        href: `/manager/shifts/${s.id}`,
        title: `Ready to mark complete — ${s.productionName}`,
        meta: "Confirm the outcome so the marshal's record stays accurate.",
      });
    }
  }

  return (
    <div>
      <PageHeader
        title="Production dashboard"
        subtitle={profile?.companyName ?? "Manage your shifts and applicants."}
        action={
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/manager/profile/edit" variant="secondary">
              Edit profile
            </ButtonLink>
            <ButtonLink href="/manager/shifts/new"><Icon name="plus" className="mr-2 size-4" /> Post a shift</ButtonLink>
          </div>
        }
      />

      {attention.length > 0 && (
        <div className="mb-6">
          <AttentionList>
            {attention.map((a) => (
              <AttentionItem key={`${a.href}-${a.title}`} {...a} />
            ))}
          </AttentionList>
        </div>
      )}

      {shifts.length === 0 ? (
        <EmptyState
          title="No shifts yet"
          body="Post your first shift to start receiving applications. Contact details release only after you accept an applicant."
          action={
            <ButtonLink href="/manager/shifts/new">Post a shift</ButtonLink>
          }
        />
      ) : (
        <div className="space-y-8">
          <div className="grid gap-3 min-[530px]:grid-cols-3">
            <StatCard label="Open shifts" value={shifts.filter((shift) => shift.status === "OPEN" && !shift.paused && shiftAttention(shift) !== "stale-open").length} icon="calendar" />
            <StatCard label="Applications to review" value={attention.reduce((total, item) => total + (item.count ?? 0), 0)} icon="people" tone="booked" />
            <StatCard label="Ready to complete" value={shifts.filter((shift) => canCompleteShift(shift)).length} icon="check" tone="warn" />
          </div>
          <ShiftListSection title="Active shifts" shifts={byGroup.active} empty="No active shifts." />
          <ShiftListSection
            title="Past shifts"
            shifts={byGroup.archive}
            empty="No completed or closed shifts yet."
          />
        </div>
      )}
    </div>
  );
}

function ShiftListSection({
  title,
  shifts,
  empty,
}: {
  title: string;
  shifts: Array<
    Awaited<ReturnType<typeof prisma.shift.findMany>>[number] & {
      pendingCount: number;
      bookedCount: number;
    }
  >;
  empty: string;
}) {
  return (
    <section>
      <h2 className="mb-3 text-xl font-bold tracking-tight">{title}</h2>
      {shifts.length === 0 ? (
        <p className="text-sm text-ink-muted">{empty}</p>
      ) : (
        <div className="space-y-2">
          {shifts.map((s) => {
            const attention = shiftAttention(s);
            return (
              <Link
                key={s.id}
                href={`/manager/shifts/${s.id}`}
                className="card-link"
              >
                <div className="grid grid-cols-[auto,minmax(0,1fr)] items-start gap-x-3 gap-y-2 sm:grid-cols-[auto,minmax(0,1fr),auto]">
                  <DateBlock date={s.startDate} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-bold leading-snug text-ink">
                        {s.productionName}
                      </p>
                      <ShiftStatusBadge status={s.status} />
                    </div>
                    <p className="mt-0.5 text-sm text-ink-muted">
                      {s.location} ·{" "}
                      {formatShiftBlock(
                        s.startDate,
                        s.endDate,
                        s.dailyStartTime,
                        s.dailyEndTime,
                      )}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="text-sm font-medium text-ink">
                        {formatRate(s.rate, s.rateUnit)}
                      </span>
                      <CapacityMeter booked={s.bookedCount} needed={s.marshalsNeeded} />
                    </div>
                  </div>
                  <div className="col-start-2 space-y-1 text-sm sm:col-start-3 sm:text-right">
                    {s.status === "OPEN" && !s.paused && s.pendingCount > 0 && (
                      <p className="font-medium text-gold-ink">
                        {s.pendingCount} to review
                      </p>
                    )}
                    {s.status === "OPEN" && !s.paused && s.pendingCount === 0 && (
                      <p className="text-ink-soft">No new applicants</p>
                    )}
                    {attention === "stale-open" && (
                      <p className="font-medium text-warn">
                        Start date passed
                      </p>
                    )}
                    {attention === "awaiting-completion" && (
                      <p className="font-medium text-warn">
                        Ready to complete
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
