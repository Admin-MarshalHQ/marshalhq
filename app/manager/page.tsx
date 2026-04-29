import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/access";
import {
  ButtonLink,
  Card,
  EmptyState,
  PageHeader,
  ShiftStatusBadge,
} from "@/components/ui";
import { formatRate, formatShiftBlock } from "@/lib/format";

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

  return (
    <div>
      <PageHeader
        title={profile?.companyName ?? "Manager dashboard"}
        subtitle={
          profile?.displayName
            ? `Signed in as ${profile.displayName}`
            : "Manage your shifts"
        }
        action={<ButtonLink href="/manager/shifts/new">Post shift</ButtonLink>}
      />

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
                  </div>
                  <div className="text-right text-sm">
                    {s.status === "OPEN" && (
                      <span className="text-ink-muted">
                        {active} pending applicant{active === 1 ? "" : "s"}
                      </span>
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
