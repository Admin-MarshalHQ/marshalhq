import Link from "next/link";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/db";
import {
  Alert,
  ApplicationStatusBadge,
  ButtonLink,
  Card,
  EmptyState,
  PageHeader,
  ShiftStatusBadge,
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
        title={profile?.fullName ?? "Your dashboard"}
        subtitle="Your profile, pending applications, and current bookings."
        action={
          <ButtonLink href="/marshal/shifts">Browse shifts</ButtonLink>
        }
      />

      {!profile && (
        <Alert tone="warn">
          Create your marshal profile before applying to shifts.{" "}
          <Link
            href="/marshal/profile/edit"
            className="ml-1 underline underline-offset-2"
          >
            Create profile
          </Link>
        </Alert>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-xs uppercase tracking-wide text-ink-soft">
            Pending applications
          </p>
          <p className="mt-1 text-2xl font-semibold">{pendingCount}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-ink-soft">
            Current bookings
          </p>
          <p className="mt-1 text-2xl font-semibold">{acceptedCount}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-ink-soft">
            Completed
          </p>
          <p className="mt-1 text-2xl font-semibold">
            {profile?.completedCount ?? 0}
          </p>
          <p className="mt-1 text-xs text-ink-soft">
            <Link href="/marshal/history" className="underline">
              View history
            </Link>
          </p>
        </Card>
      </div>

      <h2 className="mb-2 mt-8 text-sm font-semibold uppercase tracking-wide text-ink-soft">
        Active applications
      </h2>
      {apps.length === 0 ? (
        <EmptyState
          title="No active applications"
          body="Browse open shifts to find relevant work."
          action={<ButtonLink href="/marshal/shifts">Browse shifts</ButtonLink>}
        />
      ) : (
        <div className="space-y-2">
          {apps.map((a) => (
            <Link
              key={a.id}
              href={`/marshal/applications/${a.id}`}
              className="block rounded-md border border-line bg-white p-4 hover:bg-surface-subtle"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <ApplicationStatusBadge status={a.status} />
                    <ShiftStatusBadge status={a.shift.status} />
                    <p className="truncate text-base font-semibold">
                      {a.shift.productionName}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-ink-muted">
                    {a.shift.location} ·{" "}
                    {formatShiftBlock(
                      a.shift.startDate,
                      a.shift.endDate,
                      a.shift.dailyStartTime,
                      a.shift.dailyEndTime,
                    )}
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
