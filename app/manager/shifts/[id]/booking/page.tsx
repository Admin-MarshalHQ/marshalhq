import { notFound } from "next/navigation";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/db";
import {
  Alert,
  Card,
  ContactCard,
  Kicker,
  PageHeader,
  ShiftStatusBadge,
} from "@/components/ui";
import { formatShiftBlock } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import {
  CONTACT_RELEASED_BODY_MANAGER,
  CONTACT_RELEASED_HEADING,
} from "@/lib/copy";
import ReviewForm from "@/components/ReviewForm";
import { StarRatingDisplay } from "@/components/StarRating";
import { ratingSummary } from "@/lib/reviews";

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { reviewed?: string };
}) {
  const user = await requireRole("MANAGER");
  const shift = await prisma.shift.findUnique({
    where: { id: params.id },
  });
  if (!shift || shift.managerId !== user.id) notFound();

  const canSeeContact =
    shift.status === "OPEN" ||
    shift.status === "FILLED" ||
    shift.status === "COMPLETED";

  if (!canSeeContact) {
    return (
      <div>
        <PageHeader
          kicker="Booking"
          back={{ href: `/manager/shifts/${shift.id}`, label: "Back to shift" }}
          title={shift.productionName}
          action={<ShiftStatusBadge status={shift.status} />}
        />
        <Alert tone="warn">
          {shift.status === "CLOSED"
            ? "This shift has been cancelled. Contact details are no longer shown here."
            : "Contact details appear for each marshal you accept."}
        </Alert>
      </div>
    );
  }

  const accepted = await prisma.application.findMany({
    where: { shiftId: shift.id, status: "ACCEPTED", shift: { managerId: user.id } },
    orderBy: { decidedAt: "asc" },
    include: {
      marshal: {
        select: { marshalProfile: { select: { fullName: true, baseLocation: true, travelRadiusMiles: true, training: true } } },
      },
    },
  });
  const contacts = await prisma.user.findMany({
    where: { disabledAt: null, marshalProfile: { paused: false }, applications: { some: {
      status: "ACCEPTED", shiftId: shift.id,
      shift: { managerId: user.id, manager: { disabledAt: null }, paused: false, status: { in: ["OPEN", "FILLED", "COMPLETED"] } },
    } } },
    select: { id: true, email: true, phone: true },
  });
  const contactByMarshal = new Map(contacts.map(contact => [contact.id, contact]));
  if (accepted.length === 0) notFound();

  // Two-way reviews: once the shift is COMPLETED the manager can leave one
  // review of a booked marshal. The subject is always named explicitly — on a
  // multi-marshal shift the manager chooses who the review is about (one
  // review per shift until the schema allows one per marshal).
  const isCompleted = shift.status === "COMPLETED";
  const existingReview = isCompleted
    ? await prisma.review.findFirst({
        where: {
          shiftId: shift.id,
          authorId: user.id,
          direction: "MANAGER_ON_MARSHAL",
        },
      })
    : null;
  const reviewSubjects = accepted.filter(a => a.attendance === "WORKED").map((a) => ({
    id: a.marshalId,
    label: a.marshal.marshalProfile?.fullName ?? "Marshal",
  }));
  const firstMarshalName = reviewSubjects[0]?.label ?? "the marshal";
  const existingReviewSubjectName = existingReview
    ? reviewSubjects.find((s) => s.id === existingReview.subjectId)?.label ??
      "a booked marshal"
    : null;

  return (
    <div>
      <PageHeader
        kicker="Booking confirmed"
        back={{ href: `/manager/shifts/${shift.id}`, label: "Back to shift" }}
        title={shift.productionName}
        subtitle={formatShiftBlock(
          shift.startDate,
          shift.endDate,
          shift.dailyStartTime,
          shift.dailyEndTime,
        )}
        action={<ShiftStatusBadge status={shift.status} />}
      />

      <div className="grid gap-4 md:grid-cols-2">
        {accepted.map((app) => {
          const p = app.marshal.marshalProfile;
          const contact = contactByMarshal.get(app.marshalId);
          if (!contact) return <Alert key={app.id} tone="warn">Contact details for {p?.fullName ?? "this marshal"} are unavailable. <a href="/support">Contact Setru support about this booking.</a></Alert>;
          return (
            <ContactCard
              key={app.id}
              released
              title={CONTACT_RELEASED_HEADING}
              body={CONTACT_RELEASED_BODY_MANAGER}
              items={[
                { label: "Booked marshal", value: p?.fullName ?? "Marshal" },
                {
                  label: "Based",
                  value: `${p?.baseLocation ?? "—"} · travels up to ${p?.travelRadiusMiles ?? 0} miles`,
                },
                { label: "Email", value: contact.email },
                { label: "Phone", value: formatPhone(contact.phone) },
              ]}
            >
              {p?.training && (
                <div className="mt-3">
                  <Kicker className="mb-0.5">Training / credentials</Kicker>
                  <p className="text-sm text-ink">{p.training}</p>
                </div>
              )}
            </ContactCard>
          );
        })}
      </div>

      {isCompleted && reviewSubjects.length > 0 && (
        <div className="mt-6 max-w-xl">
          <Card>
            <Kicker className="mb-1">Review the marshal</Kicker>
            {searchParams?.reviewed === "1" && !existingReview && (
              <div className="mt-2">
                <Alert tone="success">Thanks — your review has been saved.</Alert>
              </div>
            )}
            {existingReview && !reviewSubjects.some(s => s.id === existingReview.subjectId) ? (
              <p>The earlier review is withheld.</p>
            ) : existingReview ? (
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
                  You’ve reviewed {existingReviewSubjectName} for this booking.
                </p>
              </div>
            ) : (
              <>
                <p className="mt-1 text-xs text-ink-soft">
                  {reviewSubjects.length > 1
                    ? "Your rating builds the chosen marshal’s reliability record on Setru."
                    : `Your rating builds ${firstMarshalName}’s reliability record on Setru.`}
                </p>
                <ReviewForm
                  shiftId={shift.id}
                  subjectLabel={firstMarshalName}
                  marshalId={reviewSubjects[0]?.id}
                  subjects={reviewSubjects}
                />
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
