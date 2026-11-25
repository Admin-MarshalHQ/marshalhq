import { applicationNoticeVersion, briefVersion, clearedFor } from "@/lib/vacancy-brief";
import { validShiftWindow } from "@/lib/state";
import { marshalApplicationOutcome } from "@/lib/application-outcome";
import { recordedReviews } from "@/lib/recorded-reviews";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/db";
import {
  Alert,
  StatusBadge,
  ButtonLink,
  CapacityMeter,
  Card,
  ContactCard,
  DL,
  DateBlock,
  PageHeader,
  ShiftStatusBadge,
} from "@/components/ui";
import { shiftBlockLengthLabel } from "@/lib/format";
import { ShiftFacts } from "@/components/ShiftFacts";
import { canMarshalApply, isLimitedAvailability, shiftStartDateTime } from "@/lib/state";
import { bookedSchedule, shiftConflicts, type ConflictReason } from "@/lib/availability";
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
        select: { id: true, status: true, attendance: true },
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
  const release = await prisma.vacancyRelease.findUnique({ where: { activeSlot: "GB-pilot" } });
  if (!yourApp && !clearedFor(shift, release, "view", user.id)) notFound();
  const outcome = yourApp && marshalApplicationOutcome(yourApp.status, shift, yourApp.attendance);
  const acceptedCount = shift._count.applications;
  const started = shiftStartDateTime(shift.startDate, shift.dailyStartTime).getTime() <= Date.now();
  const profile = await prisma.marshalProfile.findUnique({
    where: { userId: user.id },
    select: { id: true, availability: true, paused: true },
  });
  const managerReviews = await recordedReviews(shift.managerId, "MARSHAL_ON_MANAGER");
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
          shift: { status: { in: ["OPEN", "FILLED", "RECRUITMENT_STOPPED"] } },
        },
        select: { releasedFrom: true, shift: { select: { startDate: true, endDate: true, dailyStartTime: true, dailyEndTime: true } } },
      }),
      prisma.availabilityBlock.findMany({
        where: { marshalId: user.id },
        select: { startDate: true, endDate: true },
      }),
    ]);
    conflict = shiftConflicts(
      shift,
      acceptedElsewhere.map(a => bookedSchedule(a)),
      blocks,
    );
  }

  return (
    <div>
      <PageHeader
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

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <Card>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <DateBlock date={shift.startDate} />
            <div>
              <h2 className="text-lg font-bold">Shift details</h2>
              <CapacityMeter booked={acceptedCount} needed={shift.marshalsNeeded} />
            </div>
          </div>
          <ShiftFacts shift={shift} />
          {(() => {
            const length = shiftBlockLengthLabel(
              shift.startDate,
              shift.endDate,
            );
            return length ? (
              <p className="mt-2 text-xs text-ink-soft">{length}</p>
            ) : null;
          })()}
          {shift.engagementTerms && <section className="mt-4 border-t border-line pt-3"><h2 className="mb-1 font-bold">Engagement terms</h2><p className="whitespace-pre-wrap text-sm">{shift.engagementTerms}</p></section>}
          <div className="mt-4 border-t border-line pt-3">
            <h2 className="mb-2 font-bold">Duties</h2>
            <p className="whitespace-pre-wrap text-sm text-ink">
              {shift.duties}
            </p>
          </div>
          {shift.experienceNotes && (
            <div className="mt-4 border-t border-line pt-3">
              <h2 className="mb-2 font-bold">Experience / notes</h2>
              <p className="whitespace-pre-wrap text-sm text-ink">
                {shift.experienceNotes}
              </p>
            </div>
          )}
          {shift.parkingTravel && (
            <div className="mt-4 border-t border-line pt-3">
              <h2 className="mb-2 font-bold">Parking / travel</h2>
              <p className="whitespace-pre-wrap text-sm">{shift.parkingTravel}</p>
            </div>
          )}
          <div className="mt-4 border-t border-line pt-3">
            <DL items={[{ label: "Manager rating", value: <StarRatingDisplay summary={managerRating} /> }]} />
          </div>
        </Card>

        <div className="min-w-0 space-y-3">
          <Card
            variant={
              !yourApp && shift.status === "OPEN" ? "highlight" : "default"
            }
          >
            <h2 className="mb-2 text-lg font-bold">Apply for this shift</h2>
            {yourApp && outcome ? (
              <div className="space-y-2">
                <StatusBadge label={outcome.label} tone={outcome.tone} />
                <p className="text-sm text-ink-muted">{outcome.detail}</p>
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
            ) : !validShiftWindow(shift.startDate, shift.endDate, shift.dailyStartTime, shift.dailyEndTime) ? (
              <Alert tone="warn">This shift has an invalid call or wrap time and cannot take applications.</Alert>
            ) : started ? (
              <Alert tone="warn">Applications have closed because the shift has already started.</Alert>
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
            ) : !clearedFor(shift, release, "apply", user.id) ? (
              <Alert tone="warn">Named applications are held until Setru has checked your introduction to this hirer.</Alert>
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
                briefVersion={briefVersion(shift)} noticeVersion={applicationNoticeVersion}
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
