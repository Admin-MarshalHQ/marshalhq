import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/db";
import {
  Alert,
  ButtonLink,
  Card,
  DL,
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
import { formatDate, formatRate, formatTimeRange } from "@/lib/format";
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
  const acceptedApp = shift.applications.find((a) => a.status === "ACCEPTED");
  const hasActiveApplicants = pending.length > 0;

  const endDateTime = new Date(shift.date);
  const [h, m] = shift.endTime.split(":").map(Number);
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
        title={shift.productionName}
        subtitle={`${shift.location} \u00b7 ${formatDate(shift.date)}`}
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
            The shift&rsquo;s start time must be in the future and the end
            time must be after the start time. Edit the draft and try again.
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
                value: `${formatDate(shift.date)} \u00b7 ${formatTimeRange(
                  shift.startTime,
                  shift.endTime,
                )}`,
              },
              { label: "Rate", value: formatRate(shift.rate, shift.rateUnit) },
              { label: "Location", value: shift.location },
              {
                label: "Parking / travel",
                value: shift.parkingTravel ?? "\u2014",
              },
            ]}
          />
          <div className="mt-4">
            <p className="mb-1 text-xs uppercase tracking-wide text-ink-soft">
              Duties
            </p>
            <p className="whitespace-pre-wrap text-sm text-ink">
              {shift.duties}
            </p>
          </div>
          {shift.experienceNotes && (
            <div className="mt-4">
              <p className="mb-1 text-xs uppercase tracking-wide text-ink-soft">
                Experience / notes
              </p>
              <p className="whitespace-pre-wrap text-sm text-ink">
                {shift.experienceNotes}
              </p>
            </div>
          )}
        </Card>

        <div className="space-y-3">
          <Card>
            <p className="text-sm font-semibold">Actions</p>
            <div className="mt-3 flex flex-col gap-2">
              {shift.status === "DRAFT" && (
                <>
                  <ButtonLink
                    href={`/manager/shifts/${shift.id}/edit`}
                    variant="secondary"
                  >
                    Edit draft
                  </ButtonLink>
                  <ConfirmButton
                    action={publish}
                    triggerLabel="Publish"
                    title={CONFIRM_PUBLISH_TITLE}
                    description={CONFIRM_PUBLISH_BODY}
                    confirmLabel={CONFIRM_PUBLISH_ACTION}
                    variant="primary"
                  />
                  <ConfirmButton
                    action={close}
                    triggerLabel="Abandon draft"
                    title={CONFIRM_CLOSE_DRAFT_TITLE}
                    description={CONFIRM_CLOSE_DRAFT_BODY}
                    confirmLabel={CONFIRM_CLOSE_DRAFT_ACTION}
                    variant="danger"
                  />
                </>
              )}
              {shift.status === "OPEN" && (
                <>
                  <ButtonLink
                    href={`/manager/shifts/${shift.id}/applicants`}
                  >
                    Review applicants ({pending.length})
                  </ButtonLink>
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
                  <ConfirmButton
                    action={close}
                    triggerLabel="Close without hiring"
                    title={CONFIRM_CLOSE_OPEN_TITLE}
                    description={CONFIRM_CLOSE_OPEN_BODY}
                    confirmLabel={CONFIRM_CLOSE_OPEN_ACTION}
                    variant="danger"
                  />
                </>
              )}
              {shift.status === "FILLED" && (
                <>
                  <ButtonLink href={`/manager/shifts/${shift.id}/booking`}>
                    Open booking
                  </ButtonLink>
                  {canComplete ? (
                    <div className="flex flex-col gap-2 rounded-md border border-line bg-surface-subtle p-3">
                      <p className="text-sm font-semibold text-ink">
                        Mark shift complete
                      </p>
                      <p className="text-xs text-ink-muted">
                        Did the marshal turn up and do the job?
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
                      Mark complete is available after the scheduled end time.
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
                  <ConfirmButton
                    action={close}
                    triggerLabel="Cancel shift"
                    title={CONFIRM_CANCEL_FILLED_TITLE}
                    description={CONFIRM_CANCEL_FILLED_BODY}
                    confirmLabel={CONFIRM_CANCEL_FILLED_ACTION}
                    variant="danger"
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
          </Card>

          {shift.status === "OPEN" && pending.length > 0 && (
            <Card>
              <p className="text-sm font-semibold">Pending applicants</p>
              <ul className="mt-2 space-y-1 text-sm">
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
              <p className="text-sm font-semibold">Booked</p>
              <p className="mt-1 text-sm text-ink">
                {acceptedApp.marshal.marshalProfile?.fullName ?? "Marshal"}
              </p>
              <ButtonLink
                href={`/manager/shifts/${shift.id}/booking`}
                variant="ghost"
                className="mt-2 px-0"
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
