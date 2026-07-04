import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/db";
import {
  Alert,
  ApplicationStatusBadge,
  ButtonLink,
  CapacityMeter,
  Card,
  ContactCard,
  DL,
  Kicker,
  PageHeader,
  ShiftStatusBadge,
} from "@/components/ui";
import {
  formatRate,
  formatShiftBlock,
  shiftBlockLengthLabel,
} from "@/lib/format";
import { canMarshalApply, isLimitedAvailability } from "@/lib/state";
import { shiftConflicts, type ConflictReason } from "@/lib/availability";
import { StarRatingDisplay } from "@/components/StarRating";
import { ratingSummary } from "@/lib/reviews";
import {
  APPLY_BLOCKED_BOOKED_BODY,
  APPLY_BLOCKED_BOOKED_TITLE,
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
      _count: {
        select: { applications: { where: { status: "ACCEPTED" } } },
      },
    },
  });
  // Draft and paused shifts are hidden from marshals. If the marshal reached
  // this URL directly (e.g. from a stale notification), 404 rather than leak
  // draft content or show an apply button for something the founder has paused.
  if (!shift || shift.status === "DRAFT" || shift.paused) notFound();

  const yourApp = shift.applications[0];
  const acceptedCount = shift._count.applications;
  const profile = await prisma.marshalProfile.findUnique({
    where: { userId: user.id },
    select: { id: true, availability: true, paused: true },
  });
  const managerReviews = await prisma.review.findMany({
    where: { subjectId: shift.managerId, direction: "MARSHAL_ON_MANAGER" },
    select: { rating: true },
  });
  const managerRating = ratingSummary(managerReviews);

  // Booking-conflict check, run only when the apply form could render. A
  // "booked" overlap (accepted on another shift over these dates) blocks the
  // form — the server action refuses it too. A "marked-unavailable" overlap is
  // a soft reminder passed into the form.
  let conflict: ConflictReason = null;
  if (
    !yourApp &&
    shift.status === "OPEN" &&
    profile &&
    !profile.paused &&
    canMarshalApply(profile.availability)
  ) {
    const [acceptedElsewhere, blocks] = await Promise.all([
      prisma.application.findMany({
        where: {
          marshalId: user.id,
          status: "ACCEPTED",
          shift: { status: { in: ["OPEN", "FILLED"] } },
        },
        select: { shift: { select: { startDate: true, endDate: true } } },
      }),
      prisma.availabilityBlock.findMany({
        where: { marshalId: user.id },
        select: { startDate: true, endDate: true },
      }),
    ]);
    conflict = shiftConflicts(
      shift,
      acceptedElsewhere.map((a) => a.shift),
      blocks,
    );
  }

  return (
    <div>
      <PageHeader
        kicker="Open shift"
        back={{ href: "/marshal/shifts", label: "Back to open shifts" }}
        title={shift.productionName}
        subtitle={`Posted by ${shift.manager.managerProfile?.companyName ?? "Manager"}`}
        action={<ShiftStatusBadge status={shift.status} />}
      />

      {searchParams?.applied && (
        <div className="mb-4">
          <Alert tone="success">
            Application submitted. You’ll be notified when the manager
            decides.
          </Alert>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-[2fr,1fr]">
        <Card className="md:order-1">
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
              {
                label: "Marshals",
                value: (
                  <CapacityMeter
                    booked={acceptedCount}
                    needed={shift.marshalsNeeded}
                  />
                ),
              },
              { label: "Location", value: shift.location },
              {
                label: "Parking / travel",
                value: shift.parkingTravel ?? "\u2014",
              },
              {
                label: "Manager rating",
                value: <StarRatingDisplay summary={managerRating} />,
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
          <div className="mt-4 border-t border-line pt-3">
            <Kicker className="mb-1">Duties</Kicker>
            <p className="whitespace-pre-wrap text-sm text-ink">
              {shift.duties}
            </p>
          </div>
          {shift.experienceNotes && (
            <div className="mt-4 border-t border-line pt-3">
              <Kicker className="mb-1">Experience / notes</Kicker>
              <p className="whitespace-pre-wrap text-sm text-ink">
                {shift.experienceNotes}
              </p>
            </div>
          )}
        </Card>

        {/* Apply column: first in DOM so a marshal on a phone sees the apply
            state before the long duties text; md:order-2 restores the
            desktop sidebar position. */}
        <div className="order-first space-y-3 md:order-2">
          <Card
            variant={
              !yourApp && shift.status === "OPEN" ? "highlight" : "default"
            }
          >
            <Kicker className="mb-2">Apply</Kicker>
            {yourApp ? (
              <div className="space-y-2">
                <ApplicationStatusBadge status={yourApp.status} />
                <p className="text-sm text-ink-muted">
                  {yourApp.status === "ACCEPTED"
                    ? "You're booked on this shift."
                    : yourApp.status === "APPLIED"
                      ? "Your application is with the manager."
                      : "You applied to this shift previously."}
                </p>
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
            ) : conflict === "booked" ? (
              <div className="mt-2 space-y-2">
                <Alert tone="warn">
                  <p className="font-semibold text-ink">
                    {APPLY_BLOCKED_BOOKED_TITLE}
                  </p>
                  <p className="mt-1 text-ink-muted">
                    {APPLY_BLOCKED_BOOKED_BODY}
                  </p>
                </Alert>
                <ButtonLink
                  href="/marshal/applications"
                  variant="secondary"
                  className="w-full"
                >
                  View your bookings
                </ButtonLink>
              </div>
            ) : (
              <ApplyForm
                shiftId={shift.id}
                limitedAvailability={isLimitedAvailability(profile.availability)}
                unavailableDatesConflict={conflict === "marked-unavailable"}
              />
            )}
          </Card>
          <ContactCard
            released={false}
            title="Contact"
            body="Contact details are released only when a manager accepts your application."
          />
        </div>
      </div>
    </div>
  );
}
