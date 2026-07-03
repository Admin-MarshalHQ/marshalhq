import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/access";
import {
  Alert,
  ButtonLink,
  Card,
  EmptyState,
  PageHeader,
  ShiftStatusBadge,
} from "@/components/ui";
import { formatRate, formatShiftBlock } from "@/lib/format";
import { capacityLabel } from "@/lib/capacity";
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

  // Attention roll-up: pending applicants across all open shifts plus the
  // per-shift outcome cues, so the manager sees in one line where action is
  // needed rather than opening each shift to find out.
  const totalPending = shifts
    .filter((s) => s.status === "OPEN")
    .reduce(
      (sum, s) =>
        sum + s.applications.filter((a) => a.status === "APPLIED").length,
      0,
    );
  const staleOpenCount = shifts.filter(
    (s) => shiftAttention(s) === "stale-open",
  ).length;
  const awaitingCompletionCount = shifts.filter(
    (s) => shiftAttention(s) === "awaiting-completion",
  ).length;
  const attentionParts: string[] = [];
  if (totalPending > 0) {
    attentionParts.push(
      `${totalPending} applicant${totalPending === 1 ? "" : "s"} waiting for review`,
    );
  }
  if (staleOpenCount > 0) {
    attentionParts.push(
      `${staleOpenCount} open shift${staleOpenCount === 1 ? " has" : "s have"} passed the start date and can no longer fill — close or repost`,
    );
  }
  if (awaitingCompletionCount > 0) {
    attentionParts.push(
      `${awaitingCompletionCount} booked shift${awaitingCompletionCount === 1 ? " is" : "s are"} ready to mark complete`,
    );
  }

  return (
    <div>
      <PageHeader
        title={profile?.companyName ?? "Manager dashboard"}
        subtitle={
          profile?.displayName
            ? `Signed in as ${profile.displayName}`
            : "Manage your shifts"
        }
        action={
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/manager/market" variant="secondary">
              Browse market
            </ButtonLink>
            <ButtonLink href="/manager/profile/edit" variant="secondary">
              Edit profile
            </ButtonLink>
            <ButtonLink href="/manager/shifts/new">Post shift</ButtonLink>
          </div>
        }
      />

      {attentionParts.length > 0 && (
        <div className="mb-4">
          <Alert tone="info">
            <span className="font-semibold">Needs your attention:</span>{" "}
            {attentionParts.join(" · ")}
          </Alert>
        </div>
      )}

      {shifts.length === 0 ? (
        <EmptyState
          title="No shifts yet"
          body="Post your first shift to start receiving applications."
          action={
            <ButtonLink href="/manager/shifts/new">Post a shift</ButtonLink>
          }
        />
      ) : (
        <div className="space-y-6">
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
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-soft">
        {title}
      </h2>
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
                className="block rounded-md border border-line bg-white p-4 hover:bg-surface-subtle"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <ShiftStatusBadge status={s.status} />
                      <p className="truncate text-base font-semibold">
                        {s.productionName}
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-ink-muted">
                      {s.location} ·{" "}
                      {formatShiftBlock(
                        s.startDate,
                        s.endDate,
                        s.dailyStartTime,
                        s.dailyEndTime,
                      )}
                    </p>
                    <p className="mt-0.5 text-sm text-ink-muted">
                      {formatRate(s.rate, s.rateUnit)}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      {capacityLabel(accepted, s.marshalsNeeded)}
                    </p>
                  </div>
                  <div className="space-y-1 text-right text-sm">
                    {s.status === "OPEN" && (
                      <p className="text-ink-muted">
                        {active} pending applicant{active === 1 ? "" : "s"}
                      </p>
                    )}
                    {attention === "stale-open" && (
                      <p className="font-medium text-warn">
                        Start date passed — close or repost
                      </p>
                    )}
                    {attention === "awaiting-completion" && (
                      <p className="font-medium text-warn">
                        Ready to mark complete
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
