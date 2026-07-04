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
  CONFIRM_CANCEL_FILLED_BODY,
  CONFIRM_CANCEL_FILLED_TITLE,
  CONFIRM_CLOSE_DRAFT_ACTION,
  CONFIRM_CLOSE_DRAFT_BODY,
  CONFIRM_CLOSE_DRAFT_TITLE,
  CONFIRM_CLOSE_OPEN_ACTION,
  CONFIRM_CLOSE_OPEN_BODY,
  CONFIRM_CLOSE_OPEN_TITLE,
  CONFIRM_COMPLETE_FLAG_ACTION,
  CONFIRM_COMPLETE_FLAG_BODY,
  CONFIRM_COMPLETE_FLAG_TITLE,
  CONFIRM_COMPLETE_RELIABLE_ACTION,
  CONFIRM_COMPLETE_RELIABLE_BODY,
  CONFIRM_COMPLETE_RELIABLE_TITLE,
  CONFIRM_PUBLISH_ACTION,
  CONFIRM_PUBLISH_BODY,
  CONFIRM_PUBLISH_TITLE,
  CONFIRM_REOPEN_ACTION,
  CONFIRM_REOPEN_BODY,
  CONFIRM_REOPEN_TITLE,
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
  searchParams: { revertBlocked?: string; publishBlocked?: string };
}) {
  const user = await requireRole("MANAGER");
  const shift = await prisma.shift.findUnique({
    where: { id: params.id },
    include: {
      applications: {
        where: { status: { in: ["APPLIED", "ACCEPTED"] } },
        include: {
          marshal: { include: { marshalProfile: true } },
        },
      },
    },
  });
  if (!shift || shift.managerId !== user.id) notFound();

  // Paused marshal profiles are excluded from the pending list the manager
  // sees and acts on — accepting a paused marshal should never happen through
  // the normal flow.
  const pending = shift.applications.filter(
    (a) => a.status === "APPLIED" && !a.marshal.marshalProfile?.paused,
  );
  const acceptedApps = shift.applications.filter((a) => a.status === "ACCEPTED");
  const bookedCount = acceptedApps.length;
  const acceptedApp = acceptedApps[0];
  const hasActiveApplicants = pending.length > 0;

  const endDateTime = new Date(shift.endDate);
  const [h, m] = shift.dailyEndTime.split(":").map(Number);
  endDateTime.setHours(h ?? 0, m ?? 0, 0, 0);
  const canComplete =
    shift.status === "FILLED" && endDateTime.getTime() <= Date.now();

  // Server action wrappers — each captures shift.id so the client ConfirmButton
  // can invoke the action with no arguments.
  const publish = async () => {
    "use server";
    await publishShiftAction(shift.id);
  };
  const revert = async () => {
    "use server";
    await unpublishShiftAction(shift.id);
  };
  const close = async () => {
    "use server";
    await closeShiftAction(shift.id);
  };
  const reopen = async () => {
    "use server";
    await reopenAfterDropoutAction(shift.id);
  };
  const completeReliable = async () => {
    "use server";
    await completeShiftAction(shift.id, true);
  };
  const completeFlag = async () => {
    "use server";
    await completeShiftAction(shift.id, false);
  };

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
            The first day&rsquo;s start time must be in the future, the end
            date can&rsquo;t be before the start date, and the daily end time
            must be after the daily start time. Edit the draft and try again.
          </Alert>
        </div>
      )}

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
              {shift.status === "FILLED" && (
                <>
                  <ButtonLink href={`/manager/shifts/${shift.id}/booking`}>
                    Open booking &amp; contact details
                  </ButtonLink>
                  {canComplete ? (
                    <div className="flex flex-col gap-2 rounded-md border border-gold/40 bg-gold-soft/50 p-3">
                      <p className="text-sm font-semibold text-ink">
                        Mark shift complete
                      </p>
                      <p className="text-xs text-ink-muted">
                        Did the marshal turn up and do the job? Your answer
                        builds their reliability record.
                      </p>
                      <ConfirmButton
                        action={completeReliable}
                        triggerLabel="Yes, confirm complete"
                        title={CONFIRM_COMPLETE_RELIABLE_TITLE}
                        description={CONFIRM_COMPLETE_RELIABLE_BODY}
                        confirmLabel={CONFIRM_COMPLETE_RELIABLE_ACTION}
                        variant="primary"
                      />
                      <ConfirmButton
                        action={completeFlag}
                        triggerLabel="Flag reliability issue"
                        title={CONFIRM_COMPLETE_FLAG_TITLE}
                        description={CONFIRM_COMPLETE_FLAG_BODY}
                        confirmLabel={CONFIRM_COMPLETE_FLAG_ACTION}
                        variant="danger"
                      />
                    </div>
                  ) : (
                    <Alert tone="info">
                      Mark complete becomes available after the scheduled end
                      time.
                    </Alert>
                  )}
                  <ConfirmButton
                    action={reopen}
                    triggerLabel="Reopen (marshal dropped out)"
                    title={CONFIRM_REOPEN_TITLE}
                    description={CONFIRM_REOPEN_BODY}
                    confirmLabel={CONFIRM_REOPEN_ACTION}
                    variant="secondary"
                  />
                </>
              )}
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
                  {shift.status === "OPEN" && (
                    <ConfirmButton
                      action={close}
                      triggerLabel="Close without hiring"
                      title={CONFIRM_CLOSE_OPEN_TITLE}
                      description={CONFIRM_CLOSE_OPEN_BODY}
                      confirmLabel={CONFIRM_CLOSE_OPEN_ACTION}
                      variant="danger"
                    />
                  )}
                  {shift.status === "FILLED" && (
                    <ConfirmButton
                      action={close}
                      triggerLabel="Cancel shift"
                      title={CONFIRM_CANCEL_FILLED_TITLE}
                      description={CONFIRM_CANCEL_FILLED_BODY}
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

          {shift.status === "FILLED" && acceptedApp && (
            <Card>
              <Kicker className="mb-2">Booked</Kicker>
              <p className="text-sm text-ink">
                {acceptedApp.marshal.marshalProfile?.fullName ?? "Marshal"}
              </p>
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
