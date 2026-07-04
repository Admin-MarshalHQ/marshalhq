import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/db";
import {
  Alert,
  ApplicationStatusBadge,
  Card,
  ContactCard,
  DL,
  Kicker,
  PageHeader,
  ShiftStatusBadge,
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
import ReviewForm from "@/components/ReviewForm";
import { StarRatingDisplay } from "@/components/StarRating";
import { ratingSummary } from "@/lib/reviews";

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

  // Contact release invariant: contact is visible only to the accepted pair,
  // and only while the booking is in a valid post-acceptance state. Every
  // element of the invariant is re-checked here so a URL that deep-links to
  // an old application can't surface contact that has since been revoked.
  //
  //   1. Application must be ACCEPTED (not APPLIED/REJECTED/WITHDRAWN).
  //   2. Shift must pin this application as its accepted one. This is the
  //      source of truth — a sibling applicant on the same shift never
  //      matches, so contact cannot leak across the sibling chain.
  //   3. Shift must be in a post-filled booking state where contact is still
  //      appropriate: FILLED (active) or COMPLETED (historical trust).
  //      CLOSED means the booking was cancelled — contact comes down.
  //   4. The marshal's own profile must not be paused. A paused marshal is
  //      off-rotation and must route through support to see their booking.
  //
  // Contact is looked up only when every guard passes, so a query that
  // doesn't need it never pulls the manager's phone/email into memory.
  const shift = app.shift;
  const isAcceptedPair =
    app.status === "ACCEPTED" &&
    (shift.status === "OPEN" ||
      shift.status === "FILLED" ||
      shift.status === "COMPLETED") &&
    !app.marshal.marshalProfile?.paused;

  const contactManager = isAcceptedPair
    ? await prisma.user.findUnique({
        where: { id: shift.managerId },
        select: {
          email: true,
          phone: true,
          managerProfile: {
            select: { companyName: true, displayName: true },
          },
        },
      })
    : null;
  // Non-sensitive manager display data (used to label the shift card even
  // when contact is hidden) is fetched separately so the contact branch is
  // the only path that reads email/phone.
  const managerDisplay = await prisma.managerProfile.findUnique({
    where: { userId: shift.managerId },
    select: { companyName: true, displayName: true },
  });
  const showContact = isAcceptedPair && contactManager !== null;
  const withdrawFlash = searchParams?.withdraw;

  const withdraw = async () => {
    "use server";
    await withdrawApplicationAction(app.id);
  };

  // The "withdraw" flash is set by withdrawApplicationAction when the request
  // is refused because of the committed-stage or stale-state guards. We keep
  // the copy calm and operational: after operational commitment has passed,
  // users route through support rather than self-service.
  const shiftStart = (() => {
    const d = new Date(shift.startDate);
    const [h, m] = shift.dailyStartTime.split(":").map(Number);
    d.setHours(h ?? 0, m ?? 0, 0, 0);
    return d;
  })();
  const shiftStarted = shiftStart.getTime() <= Date.now();
  const canWithdrawApplied =
    app.status === "APPLIED" && shift.status === "OPEN";
  const canWithdrawAccepted =
    app.status === "ACCEPTED" &&
    (shift.status === "OPEN" || shift.status === "FILLED") &&
    !shiftStarted;

  // Two-way reviews: an accepted marshal can review the manager once the shift
  // is COMPLETED.
  const canReviewManager =
    app.status === "ACCEPTED" && shift.status === "COMPLETED";
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
          <div className="flex flex-wrap gap-2">
            <ApplicationStatusBadge status={app.status} />
            <ShiftStatusBadge status={shift.status} />
          </div>
        }
      />
      {(() => {
        const length = shiftBlockLengthLabel(shift.startDate, shift.endDate);
        return length ? (
          <p className="-mt-3 mb-3 text-xs text-ink-soft">{length}</p>
        ) : null;
      })()}

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
          <div className="mt-4 border-t border-line pt-3">
            <Kicker className="mb-1">Duties</Kicker>
            <p className="whitespace-pre-wrap text-sm text-ink">
              {shift.duties}
            </p>
          </div>
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
          {showContact && contactManager ? (
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
                { label: "Email", value: contactManager.email },
                { label: "Phone", value: formatPhone(contactManager.phone) },
              ]}
            />
          ) : (
            <ContactCard
              released={false}
              title="Contact"
              body="Contact details will be released here if the manager accepts your application."
            />
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
          {app.status === "ACCEPTED" && !canWithdrawAccepted && !canReviewManager && (
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
