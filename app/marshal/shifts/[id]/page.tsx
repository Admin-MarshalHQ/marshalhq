import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/db";
import {
  Alert,
  ApplicationStatusBadge,
  ButtonLink,
  Card,
  DL,
  PageHeader,
  ShiftStatusBadge,
} from "@/components/ui";
import {
  formatRate,
  formatShiftBlock,
  shiftBlockLengthLabel,
} from "@/lib/format";
import { canMarshalApply, isLimitedAvailability } from "@/lib/state";
import {
  APPLY_BLOCKED_UNAVAILABLE_BODY,
  APPLY_BLOCKED_UNAVAILABLE_TITLE,
} from "@/lib/copy";
import ApplyForm from "./ApplyForm";

export default async function MarshalShiftDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { applied?: string };
}) {
  const user = await requireRole("MARSHAL");
  const shift = await prisma.shift.findUnique({
    where: { id: params.id },
    include: {
      manager: {
        select: {
          managerProfile: { select: { companyName: true, displayName: true } },
        },
      },
      applications: {
        where: { marshalId: user.id },
        select: { id: true, status: true },
      },
    },
  });
  // Draft and paused shifts are hidden from marshals. If the marshal reached
  // this URL directly (e.g. from a stale notification), 404 rather than leak
  // draft content or show an apply button for something the founder has paused.
  if (!shift || shift.status === "DRAFT" || shift.paused) notFound();

  const yourApp = shift.applications[0];
  const profile = await prisma.marshalProfile.findUnique({
    where: { userId: user.id },
    select: { id: true, availability: true, paused: true },
  });

  return (
    <div>
      <PageHeader
        title={shift.productionName}
        subtitle={`Posted by ${shift.manager.managerProfile?.companyName ?? "Manager"}`}
        action={<ShiftStatusBadge status={shift.status} />}
      />
      <div className="mb-4">
        <Link
          href="/marshal/shifts"
          className="text-sm text-accent underline-offset-2 hover:underline"
        >
          ← Back to open shifts
        </Link>
      </div>

      {searchParams?.applied && (
        <div className="mb-4">
          <Alert tone="success">
            Application submitted. You’ll be notified when the manager
            decides.
          </Alert>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-[2fr,1fr]">
        <Card>
          <DL
            items={[
              {
                label: "When",
                value: formatShiftBlock(
                  shift.startDate,
                  shift.endDate,
                  shift.dailyStartTime,
                  shift.dailyEndTime,
                ),
              },
              { label: "Rate", value: formatRate(shift.rate, shift.rateUnit) },
              { label: "Location", value: shift.location },
              {
                label: "Parking / travel",
                value: shift.parkingTravel ?? "\u2014",
              },
            ]}
          />
          {(() => {
            const length = shiftBlockLengthLabel(
              shift.startDate,
              shift.endDate,
            );
            return length ? (
              <p className="mt-2 text-xs text-ink-soft">{length}</p>
            ) : null;
          })()}
          <div className="mt-4">
            <p className="mb-1 text-xs uppercase tracking-wide text-ink-soft">
              Duties
            </p>
            <p className="whitespace-pre-wrap text-sm text-ink">
              {shift.duties}
            </p>
          </div>
          {shift.experienceNotes && (
            <div className="mt-4">
              <p className="mb-1 text-xs uppercase tracking-wide text-ink-soft">
                Experience / notes
              </p>
              <p className="whitespace-pre-wrap text-sm text-ink">
                {shift.experienceNotes}
              </p>
            </div>
          )}
        </Card>

        <div className="space-y-3">
          <Card>
            <p className="text-sm font-semibold">Apply</p>
            {yourApp ? (
              <div className="mt-2 space-y-2">
                <ApplicationStatusBadge status={yourApp.status} />
                <p className="text-xs text-ink-soft">
                  <Link
                    href={`/marshal/applications/${yourApp.id}`}
                    className="underline"
                  >
                    View your application
                  </Link>
                </p>
              </div>
            ) : shift.status !== "OPEN" ? (
              <Alert tone="warn">This shift is no longer open.</Alert>
            ) : !profile ? (
              <Alert tone="warn">
                You need a marshal profile to apply.{" "}
                <Link
                  href="/marshal/profile/edit"
                  className="ml-1 underline"
                >
                  Create profile
                </Link>
              </Alert>
            ) : profile.paused ? (
              <Alert tone="warn">
                Your profile is paused. Please{" "}
                <Link href="/support" className="underline">
                  contact support
                </Link>{" "}
                for help reactivating it before applying.
              </Alert>
            ) : !canMarshalApply(profile.availability) ? (
              <div className="mt-2 space-y-2">
                <Alert tone="warn">
                  <p className="font-semibold text-ink">
                    {APPLY_BLOCKED_UNAVAILABLE_TITLE}
                  </p>
                  <p className="mt-1 text-ink-muted">
                    {APPLY_BLOCKED_UNAVAILABLE_BODY}
                  </p>
                </Alert>
                <ButtonLink
                  href="/marshal/profile/edit"
                  variant="secondary"
                  className="w-full"
                >
                  Update availability
                </ButtonLink>
              </div>
            ) : (
              <ApplyForm
                shiftId={shift.id}
                limitedAvailability={isLimitedAvailability(profile.availability)}
              />
            )}
          </Card>
          <Card>
            <p className="text-sm font-semibold">Contact</p>
            <p className="mt-1 text-sm text-ink-muted">
              Contact details are released only when a manager accepts your
              application.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
