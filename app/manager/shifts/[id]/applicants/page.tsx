import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/db";
import {
  ApplicationStatusBadge,
  Card,
  EmptyState,
  PageHeader,
  ShiftStatusBadge,
} from "@/components/ui";
import { formatShiftBlock } from "@/lib/format";

export default async function ApplicantReviewPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireRole("MANAGER");
  const shift = await prisma.shift.findUnique({
    where: { id: params.id },
    include: {
      applications: {
        orderBy: { appliedAt: "asc" },
        include: {
          marshal: { include: { marshalProfile: true } },
        },
      },
    },
  });
  if (!shift || shift.managerId !== user.id) notFound();

  // Paused marshal profiles are excluded from the active pending list so the
  // manager doesn't review and accept someone the founder has pulled. The
  // applications remain in the database (and appear in the Decided list as
  // Applied) so the audit trail is preserved, but they are not treated as
  // valid active applicants.
  const pending = shift.applications.filter(
    (a) => a.status === "APPLIED" && !a.marshal.marshalProfile?.paused,
  );
  const decided = shift.applications.filter(
    (a) => a.status !== "APPLIED" || a.marshal.marshalProfile?.paused,
  );

  return (
    <div>
      <PageHeader
        title="Applicants"
        subtitle={`${shift.productionName} \u00b7 ${formatShiftBlock(
          shift.startDate,
          shift.endDate,
          shift.dailyStartTime,
          shift.dailyEndTime,
        )}`}
        action={<ShiftStatusBadge status={shift.status} />}
      />

      <div className="mb-4">
        <Link
          href={`/manager/shifts/${shift.id}`}
          className="text-sm text-accent underline-offset-2 hover:underline"
        >
          ← Back to shift
        </Link>
      </div>

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-soft">
        Pending ({pending.length})
      </h2>
      {pending.length === 0 ? (
        <EmptyState
          title="No pending applicants"
          body="When a marshal applies, you’ll see their profile summary here to decide quickly."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {pending.map((a) => {
            const p = a.marshal.marshalProfile;
            if (!p) return null;
            const reliability =
              p.completedCount > 0
                ? `${p.reliableCount}/${p.completedCount} reliable`
                : "No completed shifts yet";
            return (
              <Link
                key={a.id}
                href={`/manager/shifts/${shift.id}/applicants/${a.id}`}
                className="block rounded-md border border-line bg-white p-4 hover:bg-surface-subtle"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold">{p.fullName}</p>
                  <ApplicationStatusBadge status={a.status} />
                </div>
                <p className="mt-1 text-sm text-ink-muted">
                  {p.baseLocation} · within {p.travelRadiusMiles} mi
                </p>
                <p className="mt-2 line-clamp-3 text-sm text-ink">
                  {p.experienceSummary}
                </p>
                <p className="mt-2 text-xs text-ink-soft">{reliability}</p>
              </Link>
            );
          })}
        </div>
      )}

      {decided.length > 0 && (
        <>
          <h2 className="mb-2 mt-8 text-sm font-semibold uppercase tracking-wide text-ink-soft">
            Decided
          </h2>
          <div className="space-y-2">
            {decided.map((a) => (
              <Card key={a.id}>
                <div className="flex items-center justify-between">
                  <p className="text-sm">
                    {a.marshal.marshalProfile?.fullName ?? "Marshal"}
                  </p>
                  <ApplicationStatusBadge status={a.status} />
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
