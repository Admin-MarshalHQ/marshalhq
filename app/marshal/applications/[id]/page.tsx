import { bookedManagerContact } from "@/lib/booking-contacts";
import { AppliedBriefDownload } from "@/components/AppliedBriefDownload";
import { classifyWithdraw } from "@/lib/state";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/db";
import {
  Alert,
  ButtonLink,
  Card,
  ContactCard,
  DL,
  Kicker,
  PageHeader,
  StatusBadge,
} from "@/components/ui";
import ConfirmButton from "@/components/ConfirmButton";
import {
  formatRate,
  formatShiftBlock,
  shiftBlockLengthLabel,
} from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { withdrawApplicationAction } from "@/app/actions/hiring";
import {
  CONFIRM_DROPOUT_ACTION,
  CONFIRM_DROPOUT_BODY,
  CONFIRM_DROPOUT_TITLE,
  CONFIRM_WITHDRAW_ACTION,
  CONFIRM_WITHDRAW_BODY,
  CONFIRM_WITHDRAW_TITLE,
  CONTACT_RELEASED_BODY_MARSHAL,
  CONTACT_RELEASED_HEADING,
} from "@/lib/copy";
import { RunAttendance } from "@/components/RunAttendance";
import ReviewForm from "@/components/ReviewForm";
import { StarRatingDisplay } from "@/components/StarRating";
import { ratingSummary } from "@/lib/reviews";
import { marshalApplicationOutcome } from "@/lib/application-outcome";
import { shiftStartDateTime } from "@/lib/state";

export default async function MyApplicationDetail({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { withdraw?: string; reviewed?: string };
}) {
  const user = await requireRole("MARSHAL");
  const app = await prisma.application.findUnique({
    where: { id: params.id },
    include: {
      shift: true,
      marshal: {
        select: { marshalProfile: { select: { paused: true } } },
      },
    },
  });
  if (!app || app.marshalId !== user.id) notFound();

  // Only the application owner on an accepted booking can see contact.
  // A booking may be on an open, filled or completed shift. Closure or a
  // paused marshal profile takes contact down, including on old URLs.
  const shift = app.shift;
  const outcome = marshalApplicationOutcome(app.status, shift, app.attendance);
  const contactManager = app.status === "ACCEPTED"
    ? await bookedManagerContact(user.id, shift, app)
    : null;
  // Non-sensitive manager display data (used to label the shift card even
  // when contact is hidden) is fetched separately so the contact branch is
  // the only path that reads email/phone.
  const managerDisplay = await prisma.managerProfile.findUnique({
    where: { userId: shift.managerId },
    select: { companyName: true, displayName: true },
  });
  const showContact = contactManager !== null;
  const withdrawFlash = searchParams?.withdraw;

  const withdraw = async () => {
    "use server";
    await withdrawApplicationAction(app.id);
  };

  // The "withdraw" flash is set by withdrawApplicationAction when the request
  // is refused because of the committed-stage or stale-state guards. We keep
  // the copy calm and operational: after operational commitment has passed,
  // users route through support rather than self-service.
  const shiftStart = shiftStartDateTime(shift.startDate, shift.dailyStartTime);
  const shiftStarted = shiftStart.getTime() <= Date.now();
  const canWithdrawApplied =
    app.status === "APPLIED" && classifyWithdraw(app, shift) === "allowed";
  const isBooked =
    app.status === "ACCEPTED" &&
    (["OPEN", "FILLED", "RECRUITMENT_STOPPED"].includes(shift.status));
  const canWithdrawAccepted = isBooked && !shiftStarted;

  // Two-way reviews: an accepted marshal can review the manager once the shift
  // is COMPLETED.
  const canReviewManager =
    app.status === "ACCEPTED" && shift.status === "COMPLETED" && app.attendance === "WORKED";
  const existingReview = canReviewManager
    ? await prisma.review.findFirst({
        where: {
          shiftId: shift.id,
          authorId: user.id,
          direction: "MARSHAL_ON_MANAGER",
        },
      })
    : null;
  const managerName = managerDisplay?.companyName ?? "the manager";

  return (
    <div>
      <PageHeader
        kicker="Your application"
        back={{
          href: "/marshal/applications",
          label: "Back to my applications",
        }}
        title={shift.productionName}
        subtitle={`${shift.location} \u00b7 ${formatShiftBlock(
          shift.startDate,
          shift.endDate,
          shift.dailyStartTime,
          shift.dailyEndTime,
        )}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge label={outcome.label} tone={outcome.tone} />
            {showContact && isBooked && (
              <ButtonLink href="#manager-contact" variant="secondary">View manager contact</ButtonLink>
            )}
          </div>
        }
      />
      {(() => {
        const length = shiftBlockLengthLabel(shift.startDate, shift.endDate);
        return length ? (
          <p className="-mt-3 mb-3 text-xs text-ink-soft">{length}</p>
        ) : null;
      })()}

      <p className="mb-4 text-sm text-ink-muted">{outcome.detail}</p>
      <RunAttendance days={app.attendanceDays} releasedFrom={app.releasedFrom} />

      {withdrawFlash === "committed" && (
        <div className="mb-4">
          <Alert tone="warn">
            This shift has already reached a committed stage. Please contact{" "}
            <Link href="/support" className="underline">
              support
            </Link>{" "}
            so we can handle it properly.
          </Alert>
        </div>
      )}
      {withdrawFlash === "stale" && (
        <div className="mb-4">
          <Alert tone="warn">
            This application can no longer be withdrawn. The page has been
            refreshed with the current state.
          </Alert>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-[2fr,1fr]">
        <Card>
          <DL
            items={[
              { label: "Rate", value: formatRate(shift.rate, shift.rateUnit) },
              {
                label: "Parking / travel",
                value: shift.parkingTravel ?? "\u2014",
              },
              {
                label: "Posted by",
                value: managerDisplay?.companyName ?? "Manager",
              },
              {
                label: "You applied",
                value: app.appliedAt.toLocaleDateString("en-GB"),
              },
            ]}
          />
          {shift.engagementTerms && <section className="mt-4 border-t border-line pt-3"><h2 className="mb-1 font-bold">Engagement terms</h2><p className="whitespace-pre-wrap text-sm">{shift.engagementTerms}</p></section>}
          <div className="mt-4 border-t border-line pt-3">
            <Kicker className="mb-1">Duties</Kicker>
            <p className="whitespace-pre-wrap text-sm text-ink">
              {shift.duties}
            </p>
          </div>
          <AppliedBriefDownload snapshot={app.appliedBrief} version={app.termsVersion} appliedAt={app.appliedAt} />
          {app.coverNote && (
            <div className="mt-4 border-t border-line pt-3">
              <Kicker className="mb-1">Your cover note</Kicker>
              <p className="whitespace-pre-wrap text-sm text-ink">
                {app.coverNote}
              </p>
            </div>
          )}
        </Card>

        <div className="space-y-3">
          {app.status === "ACCEPTED" && !showContact && (
            <Alert tone="warn">Contact details are unavailable. <Link href="/support">Contact Setru support about this booking.</Link></Alert>
          )}
          {showContact && contactManager && (
            <div id="manager-contact" tabIndex={-1} role="region" aria-label="Manager contact">
              <ContactCard
                released
                title={CONTACT_RELEASED_HEADING}
                body={CONTACT_RELEASED_BODY_MARSHAL}
                items={[
                  {
                    label: "Name",
                    value:
                      contactManager.managerProfile?.displayName ?? "Manager",
                  },
                  {
                    label: "Company",
                    value:
                      contactManager.managerProfile?.companyName ?? "\u2014",
                  },
                  { label: "Email", value: <a className="underline" href={`mailto:${contactManager.email}`}>{contactManager.email}</a> },
                  { label: "Phone", value: contactManager.phone ? <a className="underline" href={`tel:${contactManager.phone}`}>{formatPhone(contactManager.phone)}</a> : "No phone number provided" },
                ]}
              />
            </div>
          )}

          {(canWithdrawApplied || canWithdrawAccepted) && (
            <Card variant="sunken">
              <Kicker className="mb-1">
                {app.status === "APPLIED"
                  ? "Withdraw application"
                  : "Drop out"}
              </Kicker>
              <p className="text-xs text-ink-soft">
                {app.status === "APPLIED"
                  ? "Pull your application if you can no longer do this shift."
                  : "If your plans change, tell the manager early. The shift will reopen."}
              </p>
              <div className="mt-3">
                <ConfirmButton
                  action={withdraw}
                  triggerLabel={
                    app.status === "APPLIED" ? "Withdraw" : "Drop out"
                  }
                  title={
                    app.status === "APPLIED"
                      ? CONFIRM_WITHDRAW_TITLE
                      : CONFIRM_DROPOUT_TITLE
                  }
                  description={
                    app.status === "APPLIED"
                      ? CONFIRM_WITHDRAW_BODY
                      : CONFIRM_DROPOUT_BODY
                  }
                  confirmLabel={
                    app.status === "APPLIED"
                      ? CONFIRM_WITHDRAW_ACTION
                      : CONFIRM_DROPOUT_ACTION
                  }
                  variant="danger"
                />
              </div>
            </Card>
          )}
          {isBooked && !canWithdrawAccepted && (
            <Card variant="sunken">
              <Kicker className="mb-1">Need to change this?</Kicker>
              <p className="text-xs text-ink-soft">
                This shift has already reached a committed stage. Please
                contact{" "}
                <Link href="/support" className="underline">
                  support
                </Link>{" "}
                so we can handle it properly.
              </p>
            </Card>
          )}

          {canReviewManager && (
            <Card>
              <Kicker className="mb-1">Review {managerName}</Kicker>
              {searchParams?.reviewed === "1" && !existingReview && (
                <div className="mt-2">
                  <Alert tone="success">
                    Thanks — your review has been saved.
                  </Alert>
                </div>
              )}
              {existingReview ? (
                <div className="mt-2 space-y-2">
                  <StarRatingDisplay
                    summary={ratingSummary([{ rating: existingReview.rating }])}
                  />
                  {existingReview.comment && (
                    <p className="whitespace-pre-wrap text-sm text-ink">
                      {existingReview.comment}
                    </p>
                  )}
                  <p className="text-xs text-ink-soft">
                    You’ve reviewed this booking.
                  </p>
                </div>
              ) : (
                <>
                  <p className="mt-1 text-xs text-ink-soft">
                    How was working with this manager? Your rating helps other
                    marshals.
                  </p>
                  <ReviewForm shiftId={shift.id} subjectLabel={managerName} />
                </>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
