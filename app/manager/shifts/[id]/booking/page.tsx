import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/db";
import {
  Alert,
  Card,
  DL,
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
          title="Booking"
          subtitle={shift.productionName}
          action={<ShiftStatusBadge status={shift.status} />}
        />
        <Alert tone="warn">
          {shift.status === "CLOSED"
            ? "This shift has been cancelled. Contact details are no longer shown here."
            : "Contact details are visible once the shift reaches its marshal quota."}
        </Alert>
        <div className="mt-3">
          <Link
            href={`/manager/shifts/${shift.id}`}
            className="text-sm text-accent underline-offset-2 hover:underline"
          >
            Back to shift
          </Link>
        </div>
      </div>
    );
  }

  const accepted = await prisma.application.findMany({
    where: { shiftId: shift.id, status: "ACCEPTED" },
    orderBy: { decidedAt: "asc" },
    include: {
      marshal: {
        include: { marshalProfile: true },
      },
    },
  });
  if (accepted.length === 0) notFound();

  // Two-way reviews: once the shift is COMPLETED the manager can leave one
  // review of the booked marshal. (Multi-marshal reviews are future work; the
  // single review targets the booked marshal for the common one-marshal shift.)
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
  const firstMarshalName =
    accepted[0]?.marshal.marshalProfile?.fullName ?? "the marshal";

  return (
    <div>
      <PageHeader
        title="Booking confirmed"
        subtitle={`${shift.productionName} - ${formatShiftBlock(
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
          Back to shift
        </Link>
      </div>

      <div className="mb-4">
        <Alert tone="info">{CONTACT_RELEASED_BODY_MANAGER}</Alert>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {accepted.map((app) => {
          const p = app.marshal.marshalProfile;
          return (
            <Card key={app.id}>
              <p className="mb-2 text-xs uppercase tracking-wide text-ink-soft">
                Booked marshal
              </p>
              <p className="text-lg font-semibold">{p?.fullName ?? "Marshal"}</p>
              <p className="mt-1 text-sm text-ink-muted">
                {p?.baseLocation} - within {p?.travelRadiusMiles ?? 0} mi
              </p>
              {p?.training && <p className="mt-2 text-sm text-ink">{p.training}</p>}
              <div className="mt-4">
                <p className="mb-2 text-xs uppercase tracking-wide text-ink-soft">
                  {CONTACT_RELEASED_HEADING}
                </p>
                <DL
                  items={[
                    { label: "Email", value: app.marshal.email },
                    { label: "Phone", value: formatPhone(app.marshal.phone) },
                  ]}
                />
              </div>
            </Card>
          );
        })}
      </div>

      {isCompleted && (
        <div className="mt-6 max-w-xl">
          <Card>
            <p className="text-sm font-semibold">Review the marshal</p>
            {searchParams?.reviewed === "1" && !existingReview && (
              <div className="mt-2">
                <Alert tone="success">Thanks — your review has been saved.</Alert>
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
                  Your rating builds {firstMarshalName}’s reliability record on
                  MarshalHQ.
                </p>
                <ReviewForm shiftId={shift.id} subjectLabel={firstMarshalName} />
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
