import { bookedMarshalContacts } from "@/lib/booking-contacts";
import { ShiftEmailStatus } from "@/components/ShiftEmailStatus";
import { RunAttendance } from "@/components/RunAttendance";
import { marshalApplicationOutcome } from "@/lib/application-outcome";
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
    shift.status === "RECRUITMENT_STOPPED" ||
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
  const contacts = await bookedMarshalContacts(user.id, shift, accepted);
  const contactByMarshal = new Map(contacts.map(contact => [contact.id, contact]));
  if (accepted.length === 0) notFound();

  const isCompleted = shift.status === "COMPLETED";
  const eligible = accepted.filter(app => app.attendance === "WORKED");
  const existingReviews = isCompleted && eligible.length
    ? await prisma.review.findMany({
        where: { shiftId: shift.id, authorId: user.id, direction: "MANAGER_ON_MARSHAL",
          subjectId: { in: eligible.map(app => app.marshalId) } },
      })
    : [];
  const reviewSubjects = eligible.filter(app => !existingReviews.some(review => review.subjectId === app.marshalId))
    .map(app => ({ id: app.marshalId, label: app.marshal.marshalProfile?.fullName ?? "Marshal" }));

  return (
    <div>
      <PageHeader
        kicker={isCompleted ? "Attendance record" : "Booking confirmed"}
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

      <ShiftEmailStatus shiftId={shift.id} />
      <div className="grid gap-4 md:grid-cols-2">
        {accepted.map((app) => {
          const p = app.marshal.marshalProfile;
          const contact = contactByMarshal.get(app.marshalId);
          if (!contact) return <Alert key={app.id} tone="warn">{isCompleted && <p>{marshalApplicationOutcome(app.status, shift, app.attendance).label}</p>}<RunAttendance days={app.attendanceDays} releasedFrom={app.releasedFrom} />Contact details for {p?.fullName ?? "this marshal"} are unavailable. <a href="/support">Contact Setru support about this booking.</a></Alert>;
          return (
            <ContactCard
              key={app.id}
              released
              title={isCompleted ? "Completed booking" : CONTACT_RELEASED_HEADING}
              body={isCompleted ? "Attendance is recorded individually for this shift." : CONTACT_RELEASED_BODY_MANAGER}
              items={[
                ...(isCompleted ? [{ label: "Attendance", value: marshalApplicationOutcome(app.status, shift, app.attendance).label }] : []),
                { label: isCompleted ? "Marshal" : "Booked marshal", value: p?.fullName ?? "Marshal" },
                {
                  label: "Based",
                  value: `${p?.baseLocation ?? "—"} · travels up to ${p?.travelRadiusMiles ?? 0} miles`,
                },
                { label: "Email", value: <a className="underline" href={`mailto:${contact.email}`}>{contact.email}</a> },
                { label: "Phone", value: contact.phone ? <a className="underline" href={`tel:${contact.phone}`}>{formatPhone(contact.phone)}</a> : "No phone number provided" },
              ]}
            >
              <RunAttendance days={app.attendanceDays} releasedFrom={app.releasedFrom} />
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

      {isCompleted && eligible.length > 0 && (
        <div className="mt-6 max-w-xl">
          <Card>
            <Kicker className="mb-1">Booking reviews</Kicker>
            {searchParams.reviewed === "1" && <Alert tone="success">Your review has been saved.</Alert>}
            {existingReviews.map(review => (
              <div key={review.id} className="mt-3 space-y-1">
                <p className="font-semibold">{eligible.find(app => app.marshalId === review.subjectId)?.marshal.marshalProfile?.fullName ?? "Booked marshal"}</p>
                <StarRatingDisplay summary={ratingSummary([review])} />
                {review.comment && <p className="whitespace-pre-wrap text-sm text-ink">{review.comment}</p>}
              </div>
            ))}
            {reviewSubjects.length > 0 && <ReviewForm shiftId={shift.id} subjectLabel={reviewSubjects[0].label}
              marshalId={reviewSubjects[0].id} subjects={reviewSubjects} />}
          </Card>
        </div>
      )}
    </div>
  );
}
