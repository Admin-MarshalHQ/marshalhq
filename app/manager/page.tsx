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
  Kicker,
  PageHeader,
  ShiftStatusBadge,
} from "@/components/ui";
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
  const shifts = await prisma.shift.findMany({
    where: { managerId: user.id },
    orderBy: [{ startDate: "asc" }, { createdAt: "desc" }],
    include: {
      applications: { select: { id: true, status: true } },
    },
  });

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
    const pendingCount = s.applications.filter(
      (a) => a.status === "APPLIED",
    ).length;
    if (s.status === "OPEN" && pendingCount > 0) {
      attention.push({
        href: `/manager/shifts/${s.id}/applicants`,
        title: `Review applicants — ${s.productionName}`,
        meta: `${pendingCount} waiting for a decision`,
        count: pendingCount,
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
        kicker="Manager dashboard"
        title={profile?.companyName ?? "Your shifts"}
        subtitle="Post clear marshal shifts, review applicants in one place, and settle outcomes when the work is done."
        action={
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/manager/profile/edit" variant="secondary">
              Edit profile
            </ButtonLink>
            <ButtonLink href="/manager/shifts/new">Post shift</ButtonLink>
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
          <ShiftListSection title="Active" shifts={byGroup.active} empty="No active shifts." />
          <ShiftListSection
            title="Archive"
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
      applications: { id: string; status: string }[];
    }
  >;
  empty: string;
}) {
  return (
    <section>
      <Kicker className="mb-2">{title}</Kicker>
      {shifts.length === 0 ? (
        <p className="text-sm text-ink-muted">{empty}</p>
      ) : (
        <div className="space-y-2">
          {shifts.map((s) => {
            const active = s.applications.filter(
              (a) => a.status === "APPLIED",
            ).length;
            const accepted = s.applications.filter(
              (a) => a.status === "ACCEPTED",
            ).length;
            const attention = shiftAttention(s);
            return (
              <Link
                key={s.id}
                href={`/manager/shifts/${s.id}`}
                className="block rounded-md border border-line bg-white p-4 shadow-[0_1px_0_rgba(28,25,21,0.03)] hover:bg-surface-subtle"
              >
                <div className="flex items-start gap-3">
                  <DateBlock date={s.startDate} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-serif text-lg leading-snug text-ink">
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
                      <CapacityMeter booked={accepted} needed={s.marshalsNeeded} />
                    </div>
                  </div>
                  <div className="hidden shrink-0 space-y-1 text-right text-sm sm:block">
                    {s.status === "OPEN" && active > 0 && (
                      <p className="font-medium text-gold-ink">
                        {active} to review
                      </p>
                    )}
                    {s.status === "OPEN" && active === 0 && (
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
