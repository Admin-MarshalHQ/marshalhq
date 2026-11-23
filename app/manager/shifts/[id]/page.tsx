import { hiringOpen } from "@/lib/workspace-shifts";
import { ShiftEmailStatus } from "@/components/ShiftEmailStatus";
import { attendanceLabels, isAttendance } from "@/lib/attendance";
import { AttendanceForm } from "@/components/AttendanceForm";
import { beforeCall, hasShiftEnded } from "@/lib/state";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/db";
import {
  Alert,
  ButtonLink,
  CapacityMeter,
  Card,
  DL,
  Kicker,
  PageHeader,
  ShiftStatusBadge,
} from "@/components/ui";
import ConfirmButton from "@/components/ConfirmButton";
import {
  closeShiftAction,
  completeShiftAction,
  publishShiftAction,
  reopenAfterDropoutAction,
  unpublishShiftAction,
} from "@/app/actions/shifts";
import {
  formatRate,
  formatShiftBlock,
  shiftBlockLengthLabel,
} from "@/lib/format";
import { SHIFT_STATUS_LABEL } from "@/lib/state";
import type { ShiftStatus } from "@/lib/types";
import {
  CONFIRM_CANCEL_FILLED_ACTION,
  CONFIRM_CANCEL_FILLED_TITLE,
  CONFIRM_CLOSE_DRAFT_ACTION,
  CONFIRM_CLOSE_DRAFT_BODY,
  CONFIRM_CLOSE_DRAFT_TITLE,
  CONFIRM_CLOSE_OPEN_ACTION,
  CONFIRM_CLOSE_OPEN_BODY,
  CONFIRM_CLOSE_OPEN_TITLE,
  CONFIRM_PUBLISH_ACTION,
  CONFIRM_PUBLISH_BODY,
  CONFIRM_PUBLISH_TITLE,
  CONFIRM_REVERT_ACTION,
  CONFIRM_REVERT_BODY,
  CONFIRM_REVERT_TITLE,
  REVERT_BLOCKED_BODY,
  REVERT_BLOCKED_TITLE,
} from "@/lib/copy";

export default async function ManagerShiftDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { dropout?: string; close?: string; attendance?: string; revertBlocked?: string; publishBlocked?: string };
}) {
  const user = await requireRole("MANAGER");
  const shift = await prisma.shift.findUnique({
    where: { id: params.id },
    include: {
      _count: { select: { applications: true } },
      applications: {
        where: { status: { in: ["APPLIED", "ACCEPTED"] } },
        include: {
          marshal: { select: { marshalProfile: { select: { fullName: true, paused: true } } } },
        },
      },
    },
  });
  if (!shift || shift.managerId !== user.id) notFound();

  // Paused marshal profiles are excluded from the pending list the manager
  // sees and acts on — accepting a paused marshal should never happen through
  // the normal flow.
  const pending = shift.applications.filter(
    (a) => hiringOpen(shift) && a.status === "APPLIED" && !a.marshal.marshalProfile?.paused,
  );
  const acceptedApps = shift.applications.filter((a) => a.status === "ACCEPTED");
  const bookedCount = acceptedApps.length;
  const hasActiveApplicants = shift._count.applications > 0;

  const active = shift.status === "OPEN" || shift.status === "FILLED";
  const canComplete = active && bookedCount > 0 && hasShiftEnded(shift);
  const canRecordDropout = active && bookedCount > 0 && beforeCall(shift);

  // Server action wrappers — each captures shift.id so the client ConfirmButton
  // can invoke the action with no arguments.
  const publish = publishShiftAction.bind(null, shift.id, shift.updatedAt.toISOString());
  const revert = unpublishShiftAction.bind(null, shift.id);
  const close = closeShiftAction.bind(null, shift.id, shift.status, acceptedApps.map(app => app.id));
  return (
    <div>
      <PageHeader
        kicker="Shift record"
        back={{ href: "/manager", label: "Back to dashboard" }}
        title={shift.productionName}
        subtitle={`${shift.location} · ${formatShiftBlock(
          shift.startDate,
          shift.endDate,
          shift.dailyStartTime,
          shift.dailyEndTime,
        )}`}
        action={<ShiftStatusBadge status={shift.status} />}
      />

      <ShiftEmailStatus shiftId={shift.id} />
      {searchParams.dropout === "saved" && <Alert tone="success">Withdrawal recorded. The place is open again.</Alert>}
      {searchParams.dropout === "stale" && <Alert tone="warn">The roster changed. Review the current bookings before continuing.</Alert>}
      {searchParams.dropout === "started" && <Alert tone="warn">Call time has passed. Record attendance after wrap or contact support about the booking.</Alert>}
      {searchParams.close === "attendance" && <Alert tone="warn">This booked shift has ended. Record attendance instead of cancelling.</Alert>}
      {searchParams.close === "stale" && <Alert tone="warn">The shift or its bookings changed. Review the current roster before cancelling.</Alert>}
      {searchParams.attendance === "stale" && <Alert tone="warn">The roster changed or an outcome was missing. Review the current bookings.</Alert>}
      {searchParams.revertBlocked === "1" && (
        <div className="mb-4">
          <Alert tone="warn">
            <strong className="mr-1">{REVERT_BLOCKED_TITLE}.</strong>
            {REVERT_BLOCKED_BODY}
          </Alert>
        </div>
      )}

      {searchParams.publishBlocked === "1" && (
        <div className="mb-4">
          <Alert tone="warn">
            <strong className="mr-1">Can&rsquo;t publish this shift.</strong>
            Choose one future shoot date with valid London call and wrap times on the same day.
          </Alert>
        </div>
      )}

      {searchParams.publishBlocked === "changed" && <Alert tone="warn">This draft changed or already has an application history. Review the current shift or post a new listing.</Alert>}
      {searchParams.publishBlocked === "contact" && (
        <div className="mb-4">
          <Alert tone="warn">
            <strong className="mr-1">Can&rsquo;t publish this shift.</strong>
            Please remove contact details or contact instructions from the
            production name, location, duties, parking, or notes. Contact is
            only shared after a manager accepts an applicant.
          </Alert>
        </div>
      )}

      {shift.paused && (
        <div className="mb-4">
          <Alert tone="warn">
            <strong className="mr-1">This shift is paused.</strong>
            It is hidden from marshals and new applications are blocked.
            Please contact{" "}
            <Link href="/support" className="underline">
              support
            </Link>{" "}
            if you think this is a mistake.
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
              {
                label: "Marshals",
                value: (
                  <CapacityMeter
                    booked={bookedCount}
                    needed={shift.marshalsNeeded}
                  />
                ),
              },
              { label: "Rate", value: formatRate(shift.rate, shift.rateUnit) },
              { label: "Location", value: shift.location },
              {
                label: "Parking / travel",
                value: shift.parkingTravel ?? "—",
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

        <div className="space-y-3">
          <Card>
            <Kicker className="mb-3">Next step</Kicker>
            <div className="flex flex-col gap-2">
              {shift.status === "DRAFT" && (
                <>
                  <ConfirmButton
                    action={publish}
                    triggerLabel="Publish"
                    title={CONFIRM_PUBLISH_TITLE}
                    description={CONFIRM_PUBLISH_BODY}
                    confirmLabel={CONFIRM_PUBLISH_ACTION}
                    variant="primary"
                  />
                  <ButtonLink
                    href={`/manager/shifts/${shift.id}/edit`}
                    variant="secondary"
                  >
                    Edit draft
                  </ButtonLink>
                  <p className="text-xs text-ink-soft">
                    Publishing makes the shift visible to marshals and starts
                    accepting applications.
                  </p>
                </>
              )}
              {shift.status === "OPEN" && (
                <>
                  <ButtonLink
                    href={`/manager/shifts/${shift.id}/applicants`}
                  >
                    Review applicants ({pending.length})
                  </ButtonLink>
                  {acceptedApps.length > 0 && (
                    <ButtonLink
                      href={`/manager/shifts/${shift.id}/booking`}
                      variant="secondary"
                    >
                      View booked marshals
                    </ButtonLink>
                  )}
                  {hasActiveApplicants ? (
                    <Alert tone="warn">
                      <p className="font-semibold text-ink">
                        {REVERT_BLOCKED_TITLE}
                      </p>
                      <p className="mt-1 text-ink-muted">
                        {REVERT_BLOCKED_BODY}
                      </p>
                    </Alert>
                  ) : (
                    <ConfirmButton
                      action={revert}
                      triggerLabel="Revert to draft"
                      title={CONFIRM_REVERT_TITLE}
                      description={CONFIRM_REVERT_BODY}
                      confirmLabel={CONFIRM_REVERT_ACTION}
                      variant="secondary"
                    />
                  )}
                </>
              )}
              {active && bookedCount > 0 && (
                <>
                  <ButtonLink href={`/manager/shifts/${shift.id}/booking`}>
                    Open booking &amp; contact details
                  </ButtonLink>
                </>
              )}
              {canComplete && <AttendanceForm roster={acceptedApps} action={completeShiftAction.bind(null, shift.id)} />}
              {canRecordDropout && acceptedApps.map(app => {
                const name = app.marshal.marshalProfile?.fullName ?? "Booked marshal";
                return <ConfirmButton key={app.id} action={reopenAfterDropoutAction.bind(null, shift.id, app.id)}
                  triggerLabel={`Record dropout · ${name}`} title={`Record dropout for ${name}?`}
                  description="Use this only if the marshal told you they cannot attend. This frees their place. If production cancelled, use Cancel shift."
                  confirmLabel="Record dropout" variant="secondary" />;
              })}
              {(shift.status === "COMPLETED" || shift.status === "CLOSED") && (
                <p className="text-sm text-ink-muted">
                  This shift is {SHIFT_STATUS_LABEL[shift.status as ShiftStatus].toLowerCase()}. No further
                  actions.
                </p>
              )}
            </div>

            {(shift.status === "DRAFT" ||
              shift.status === "OPEN" ||
              shift.status === "FILLED") && (
              <div className="mt-4 border-t border-line pt-3">
                <Kicker className="mb-2">If plans change</Kicker>
                <div className="flex flex-col gap-2">
                  {shift.status === "DRAFT" && (
                    <ConfirmButton
                      action={close}
                      triggerLabel="Abandon draft"
                      title={CONFIRM_CLOSE_DRAFT_TITLE}
                      description={CONFIRM_CLOSE_DRAFT_BODY}
                      confirmLabel={CONFIRM_CLOSE_DRAFT_ACTION}
                      variant="danger"
                    />
                  )}
                  {shift.status === "OPEN" && !bookedCount && (
                    <ConfirmButton
                      action={close}
                      triggerLabel="Close without hiring"
                      title={CONFIRM_CLOSE_OPEN_TITLE}
                      description={CONFIRM_CLOSE_OPEN_BODY}
                      confirmLabel={CONFIRM_CLOSE_OPEN_ACTION}
                      variant="danger"
                    />
                  )}
                  {canComplete && <p className="text-sm text-ink-muted">This booked shift has ended. Record attendance above instead of cancelling.</p>}
                  {active && bookedCount > 0 && !canComplete && (
                    <ConfirmButton
                      action={close}
                      triggerLabel="Cancel shift"
                      title={CONFIRM_CANCEL_FILLED_TITLE}
                      description={`This cancels ${bookedCount} ${bookedCount === 1 ? "booking" : "bookings"} and closes remaining places. Each affected applicant will be notified.`}
                      confirmLabel={CONFIRM_CANCEL_FILLED_ACTION}
                      variant="danger"
                    />
                  )}
                </div>
              </div>
            )}
          </Card>

          {shift.status === "OPEN" && pending.length > 0 && (
            <Card>
              <Kicker className="mb-2">Pending applicants</Kicker>
              <ul className="space-y-1 text-sm">
                {pending.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/manager/shifts/${shift.id}/applicants/${a.id}`}
                      className="text-accent underline-offset-2 hover:underline"
                    >
                      {a.marshal.marshalProfile?.fullName ?? "Marshal"}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {bookedCount > 0 && (
            <Card>
              <Kicker className="mb-2">{shift.status === "COMPLETED" ? "Final attendance" : "Booked"}</Kicker>
              <ul className="text-sm text-ink">{acceptedApps.map(app => (
                <li key={app.id}>{app.marshal.marshalProfile?.fullName ?? "Marshal"}
                  {isAttendance(app.attendance) ? ` · ${attendanceLabels[app.attendance]}` : shift.status === "COMPLETED" ? " · Individual attendance unconfirmed" : ""}
                </li>
              ))}</ul>
              <ButtonLink
                href={`/manager/shifts/${shift.id}/booking`}
                variant="ghost"
                className="mt-1 !min-h-0 px-0 py-0"
              >
                View contact details →
              </ButtonLink>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
