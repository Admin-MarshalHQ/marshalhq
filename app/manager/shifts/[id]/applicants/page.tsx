import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/db";
import {
  ApplicationStatusBadge,
  Card,
  EmptyState,
  Kicker,
  PageHeader,
  ShiftStatusBadge,
} from "@/components/ui";
import { formatShiftBlock } from "@/lib/format";
import { capacityLabel } from "@/lib/capacity";

export default async function ApplicantReviewPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireRole("MANAGER");
  // Contact-release invariant, enforced structurally: this page must never
  // show an applicant's email or phone, so the query never selects them. The
  // profile is narrowed to the fields the cards render (no founderNote).
  const shift = await prisma.shift.findUnique({
    where: { id: params.id },
    include: {
      applications: {
        orderBy: { appliedAt: "asc" },
        select: {
          id: true,
          status: true,
          marshal: {
            select: {
              marshalProfile: {
                select: {
                  fullName: true,
                  baseLocation: true,
                  travelRadiusMiles: true,
                  experienceSummary: true,
                  completedCount: true,
                  reliableCount: true,
                  paused: true,
                },
              },
            },
          },
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
  const acceptedCount = shift.applications.filter(
    (a) => a.status === "ACCEPTED",
  ).length;

  return (
    <div>
      <PageHeader
        kicker="Applicant review"
        back={{ href: `/manager/shifts/${shift.id}`, label: "Back to shift" }}
        title={shift.productionName}
        subtitle={`${formatShiftBlock(
          shift.startDate,
          shift.endDate,
          shift.dailyStartTime,
          shift.dailyEndTime,
        )} · ${capacityLabel(acceptedCount, shift.marshalsNeeded)} · Contact details release only after you accept.`}
        action={<ShiftStatusBadge status={shift.status} />}
      />

      <Kicker className="mb-2">Waiting for a decision ({pending.length})</Kicker>
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
            return (
              <Link
                key={a.id}
                href={`/manager/shifts/${shift.id}/applicants/${a.id}`}
                className="block rounded-md border border-line bg-white p-4 shadow-[0_1px_0_rgba(28,25,21,0.03)] hover:border-line-strong hover:bg-surface-subtle"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-serif text-lg leading-snug text-ink">
                    {p.fullName}
                  </p>
                  <ApplicationStatusBadge status={a.status} />
                </div>
                <p className="mt-0.5 text-sm text-ink-muted">
                  {p.baseLocation} · travels up to {p.travelRadiusMiles} miles
                </p>
                <p className="mt-2 line-clamp-3 text-sm text-ink">
                  {p.experienceSummary}
                </p>
                <p className="mt-3 border-t border-line pt-2 font-mono text-[11px] uppercase tracking-[0.04em]">
                  {p.completedCount > 0 ? (
                    <span className="text-gold-ink">
                      {p.reliableCount}/{p.completedCount} shifts rated reliable
                    </span>
                  ) : (
                    <span className="text-ink-soft">
                      No completed MarshalHQ shifts yet
                    </span>
                  )}
                </p>
              </Link>
            );
          })}
        </div>
      )}

      {decided.length > 0 && (
        <>
          <Kicker className="mb-2 mt-8">Decided</Kicker>
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
