import { confirmedCount } from "@/lib/attendance";
import { recordedReviews } from "@/lib/recorded-reviews";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/db";
import {
  Alert,
  ApplicationStatusBadge,
  Card,
  DL,
  Kicker,
  PageHeader,
  ShiftStatusBadge,
} from "@/components/ui";
import ConfirmButton from "@/components/ConfirmButton";
import {
  acceptApplicationAction,
  rejectApplicationAction,
} from "@/app/actions/hiring";
import { isShiftSchedulable } from "@/lib/state";
import { APPLICATION_STATUS_LABEL, AVAILABILITY_LABEL } from "@/lib/state";
import { StarRatingDisplay } from "@/components/StarRating";
import { ratingSummary } from "@/lib/reviews";
import {
  CONFIRM_ACCEPT_ACTION,
  confirmAcceptBody,
  CONFIRM_ACCEPT_TITLE,
  CONFIRM_REJECT_ACTION,
  CONFIRM_REJECT_BODY,
  CONFIRM_REJECT_TITLE,
  FLASH_APPLICATION_NO_LONGER_ACTIONABLE,
} from "@/lib/copy";
import type { ApplicationStatus, Availability } from "@/lib/types";
import { capacityLabel, hasOpenSlot } from "@/lib/capacity";

export default async function ApplicantDetailPage({
  params,
  searchParams,
}: {
  params: { id: string; appId: string };
  searchParams: { stale?: string; conflict?: string };
}) {
  const user = await requireRole("MANAGER");
  const shift = await prisma.shift.findUnique({ where: { id: params.id } });
  if (!shift || shift.managerId !== user.id) notFound();
  const acceptedCount = await prisma.application.count({
    where: { shiftId: shift.id, status: "ACCEPTED" },
  });
  const hasCapacity = hasOpenSlot(acceptedCount, shift.marshalsNeeded);

  // Contact-release invariant, enforced structurally: pre-acceptance review
  // must never show the applicant's email or phone, so the query never
  // selects them. Contact renders only on the booking page after acceptance.
  const app = await prisma.application.findUnique({
    where: { id: params.appId },
    select: {
      id: true,
      shiftId: true,
      marshalId: true,
      status: true,
      coverNote: true,
      marshal: {
        select: {
          _count: confirmedCount,
          marshalProfile: {
            select: {
              fullName: true,
              baseLocation: true,
              travelRadiusMiles: true,
              availability: true,
              hasTransport: true,
              hasDriversLicence: true,
              training: true,
              experienceSummary: true,

              paused: true,
            },
          },
        },
      },
    },
  });
  if (!app || app.shiftId !== shift.id) notFound();
  const p = app.marshal.marshalProfile;
  if (!p) notFound();

  const conflict = app.status === "APPLIED" && await prisma.application.findFirst({
    where: { marshalId: app.marshalId, status: "ACCEPTED", shiftId: { not: shift.id },
      shift: { status: { in: ["OPEN", "FILLED"] }, startDate: { lte: shift.endDate }, endDate: { gte: shift.startDate } } },
    select: { id: true },
  });
  const workCount = app.marshal._count.applications;

  const marshalReviews = await recordedReviews(app.marshalId, "MANAGER_ON_MARSHAL");
  const marshalRating = ratingSummary(marshalReviews);

  const availabilityLabel =
    AVAILABILITY_LABEL[p.availability as Availability] ?? "Not currently available";

  const accept = async () => {
    "use server";
    await acceptApplicationAction(app.id);
  };
  const reject = async () => {
    "use server";
    await rejectApplicationAction(app.id);
  };

  return (
    <div>
      <PageHeader
        kicker="Applicant"
        back={{
          href: `/manager/shifts/${shift.id}/applicants`,
          label: "Back to applicants",
        }}
        title={p.fullName}
        subtitle={`Applying for ${shift.productionName}`}
        action={<ApplicationStatusBadge status={app.status} />}
      />

      {searchParams.conflict === "1" && !conflict && <Alert tone="warn">The booking previously conflicted. Review the current dates before trying again.</Alert>}
      {searchParams.stale === "1" && (
        <div className="mb-4">
          <Alert tone="warn">{FLASH_APPLICATION_NO_LONGER_ACTIONABLE}</Alert>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-[2fr,1fr]">
        <div className="space-y-4">
          <Card>
            <DL
              items={[
                { label: "Base location", value: p.baseLocation },
                {
                  label: "Travel radius",
                  value: `${p.travelRadiusMiles} miles`,
                },
                { label: "Availability", value: availabilityLabel },
                {
                  label: "Transport",
                  value:
                    p.hasTransport === true
                      ? "Has own transport"
                      : p.hasTransport === false
                        ? "No own transport"
                        : "\u2014",
                },
                {
                  label: "Driver\u2019s licence",
                  value:
                    p.hasDriversLicence === true
                      ? "Yes"
                      : p.hasDriversLicence === false
                        ? "No"
                        : "\u2014",
                },
                {
                  label: "Training / credentials",
                  value: p.training || "\u2014",
                },
              ]}
            />
          </Card>
          <Card>
            <Kicker className="mb-1">Experience summary</Kicker>
            <p className="whitespace-pre-wrap text-sm text-ink">
              {p.experienceSummary}
            </p>
          </Card>
          {app.coverNote && (
            <Card>
              <Kicker className="mb-1">Cover note</Kicker>
              <p className="whitespace-pre-wrap text-sm text-ink">
                {app.coverNote}
              </p>
            </Card>
          )}
          <Card variant="sunken">
            <Kicker className="mb-1.5">Setru record</Kicker>
            <p className="text-sm text-ink">Shifts recorded as worked: {workCount}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm text-ink-muted">Manager rating:</span>
              <StarRatingDisplay summary={marshalRating} />
            </div>
          </Card>
        </div>

        <div className="space-y-3">
          <Card>
            <Kicker className="mb-2">Decision</Kicker>
            <p className="mb-3 text-sm font-semibold">{capacityLabel(acceptedCount, shift.marshalsNeeded)}</p>
            {app.status !== "APPLIED" ? (
              <Alert tone="info">
                This application is {APPLICATION_STATUS_LABEL[app.status as ApplicationStatus].toLowerCase()}.
              </Alert>
            ) : shift.paused || shift.status !== "OPEN" || !hasCapacity || !isShiftSchedulable(shift) ? (
              <Alert tone="warn">
                Booking requires a future call time and an open place.
              </Alert>
            ) : conflict ? (
              <Alert tone="warn">The marshal has a conflicting booking on these dates.</Alert>
            ) : p.paused || p.availability === "UNAVAILABLE" ? (
              <Alert tone="warn">
                This applicant is currently unavailable. They cannot be
                accepted for this shift. Consider another applicant.
              </Alert>
            ) : (
              <div className="flex flex-col gap-2">
                <ConfirmButton
                  action={accept}
                  triggerLabel="Accept and book this marshal"
                  title={CONFIRM_ACCEPT_TITLE}
                  description={confirmAcceptBody(acceptedCount, shift.marshalsNeeded)}
                  confirmLabel={CONFIRM_ACCEPT_ACTION}
                  variant="primary"
                />
              </div>
            )}
            {app.status === "APPLIED" && ["OPEN", "FILLED"].includes(shift.status) && (
                <ConfirmButton
                  action={reject}
                  triggerLabel="Reject"
                  title={CONFIRM_REJECT_TITLE}
                  description={CONFIRM_REJECT_BODY}
                  confirmLabel={CONFIRM_REJECT_ACTION}
                  variant="secondary"
                />
            )}
          </Card>
          <Card>
            <Kicker className="mb-2">Shift</Kicker>
            <p className="text-sm text-ink">{shift.productionName}</p>
            <div className="mt-2">
              <ShiftStatusBadge status={shift.status} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
