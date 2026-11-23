import type { Metadata } from "next";
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
import { shiftStartDateTime } from "@/lib/state";
import { capacityLabel } from "@/lib/capacity";
import { actionableApplicantCount, managerAttention } from "@/lib/workspace-shifts";

export const metadata: Metadata = { title: "Production dashboard" };

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

  const now = new Date();
  const attention = managerAttention(shifts, now);
  const cues = new Map(attention.map(({ shift, kind }) => [shift.id, kind]));

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
            {attention.map(({ shift, kind, count, callTime }) => {
              const callDay = callTime.toLocaleDateString("en-GB", {
                weekday: "short", day: "numeric", month: "short",
              });
              const cue = {
                review: "Review applicants",
                elapsed: "Call time has passed · Review shift",
                completion: "Ready to mark complete",
              }[kind];
              const details = [
                count > 0 ? `${count} to review` : null,
                capacityLabel(shift.bookedCount, shift.marshalsNeeded),
                `${callDay} ${shift.dailyStartTime}`,
              ].filter(Boolean).join(" · ");

              return (
                <AttentionItem
                  key={shift.id}
                  href={`/manager/shifts/${shift.id}${kind === "review" ? "/applicants" : ""}`}
                  title={shift.productionName}
                  cue={cue}
                  meta={details}
                />
              );
            })}
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
          <div className="summary-grid">
            <StatCard label="Open shifts" value={shifts.filter((shift) => shift.status === "OPEN" && !shift.paused && shiftStartDateTime(shift.startDate, shift.dailyStartTime) > now).length} icon="calendar" />
            <StatCard label="Applications to review" value={attention.reduce((total, item) => total + item.count, 0)} icon="people" tone="booked" />
            <StatCard label="Ready to complete" value={shifts.filter((shift) => cues.get(shift.id) === "completion").length} icon="check" tone="warn" />
          </div>
          <ShiftListSection title="Active shifts" shifts={byGroup.active} cues={cues} empty="No active shifts." />
          <ShiftListSection
            title="Past shifts"
            shifts={byGroup.archive}
            cues={cues}
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
  cues,
  empty,
}: {
  title: string;
  cues: ReadonlyMap<string, "review" | "elapsed" | "completion">;
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
            const cue = cues.get(s.id);
            const reviewCount = actionableApplicantCount(s);
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
                    {reviewCount > 0 && (
                      <p className="font-medium text-gold-ink">
                        {reviewCount} to review
                      </p>
                    )}
                    {s.status === "OPEN" && !s.paused && reviewCount === 0 && cue !== "elapsed" && (
                      <p className="text-ink-soft">No new applicants</p>
                    )}
                    {cue === "elapsed" && (
                      <p className="font-medium text-warn">
                        Call time has passed
                      </p>
                    )}
                    {cue === "completion" && (
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
