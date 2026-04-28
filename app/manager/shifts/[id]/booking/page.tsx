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
import { formatDate, formatTimeRange } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import {
  CONTACT_RELEASED_BODY_MANAGER,
  CONTACT_RELEASED_HEADING,
} from "@/lib/copy";

export default async function BookingPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireRole("MANAGER");
  const shift = await prisma.shift.findUnique({
    where: { id: params.id },
  });
  if (!shift || shift.managerId !== user.id) notFound();

  // Contact release invariant (manager side). acceptedApplicationId is the
  // source of truth — we only surface the marshal's contact when every piece
  // of it lines up:
  //
  //   1. The shift pins an accepted application.
  //   2. That application is currently ACCEPTED (not WITHDRAWN after a
  //      cancel, not REJECTED).
  //   3. The shift is in a post-filled state where contact remains
  //      appropriate (FILLED during the booking, COMPLETED for historical
  //      trust). CLOSED means the booking was cancelled — contact comes down.
  //   4. The pinned application actually belongs to this shift (defence in
  //      depth against a deep-link edge case).
  //
  // If any guard fails we short-circuit before the DB read that would pull
  // the marshal's email and phone into memory.
  const canSeeContact =
    shift.acceptedApplicationId !== null &&
    (shift.status === "FILLED" || shift.status === "COMPLETED");

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
            : "No accepted marshal on this shift. Contact details are only visible after you accept an applicant."}
        </Alert>
        <div className="mt-3">
          <Link
            href={`/manager/shifts/${shift.id}`}
            className="text-sm text-accent underline-offset-2 hover:underline"
          >
            ← Back to shift
          </Link>
        </div>
      </div>
    );
  }

  const accepted = await prisma.application.findUnique({
    where: { id: shift.acceptedApplicationId! },
    include: {
      marshal: {
        include: { marshalProfile: true },
      },
    },
  });
  // Additional defensive checks: the pinned application must still be on
  // this shift and still be ACCEPTED. These should always hold given the
  // transaction guards in acceptApplicationAction, but the render layer is
  // where a subtle bug would leak contact, so we verify again here.
  if (
    !accepted ||
    accepted.shiftId !== shift.id ||
    accepted.status !== "ACCEPTED"
  ) {
    notFound();
  }

  const p = accepted.marshal.marshalProfile;

  return (
    <div>
      <PageHeader
        title="Booking confirmed"
        subtitle={`${shift.productionName} \u00b7 ${formatDate(shift.date)} \u00b7 ${formatTimeRange(shift.startTime, shift.endTime)}`}
        action={<ShiftStatusBadge status={shift.status} />}
      />

      <div className="mb-4">
        <Link
          href={`/manager/shifts/${shift.id}`}
          className="text-sm text-accent underline-offset-2 hover:underline"
        >
          ← Back to shift
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <p className="mb-2 text-xs uppercase tracking-wide text-ink-soft">
            Marshal
          </p>
          <p className="text-lg font-semibold">{p?.fullName ?? "Marshal"}</p>
          <p className="mt-1 text-sm text-ink-muted">
            {p?.baseLocation} · within {p?.travelRadiusMiles ?? 0} mi
          </p>
          {p?.training && (
            <p className="mt-2 text-sm text-ink">{p.training}</p>
          )}
        </Card>

        <Card>
          <p className="mb-2 text-xs uppercase tracking-wide text-ink-soft">
            {CONTACT_RELEASED_HEADING}
          </p>
          <DL
            items={[
              { label: "Email", value: accepted.marshal.email },
              {
                label: "Phone",
                value: formatPhone(accepted.marshal.phone),
              },
            ]}
          />
          <Alert tone="info">{CONTACT_RELEASED_BODY_MANAGER}</Alert>
        </Card>
      </div>
    </div>
  );
}
