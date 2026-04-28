import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/db";
import {
  Alert,
  ApplicationStatusBadge,
  Card,
  DL,
  PageHeader,
  ShiftStatusBadge,
} from "@/components/ui";
import ConfirmButton from "@/components/ConfirmButton";
import {
  acceptApplicationAction,
  rejectApplicationAction,
} from "@/app/actions/hiring";
import { APPLICATION_STATUS_LABEL, AVAILABILITY_LABEL } from "@/lib/state";
import {
  CONFIRM_ACCEPT_ACTION,
  CONFIRM_ACCEPT_BODY,
  CONFIRM_ACCEPT_TITLE,
  CONFIRM_REJECT_ACTION,
  CONFIRM_REJECT_BODY,
  CONFIRM_REJECT_TITLE,
  FLASH_APPLICATION_NO_LONGER_ACTIONABLE,
} from "@/lib/copy";
import type { ApplicationStatus, Availability } from "@/lib/types";

export default async function ApplicantDetailPage({
  params,
  searchParams,
}: {
  params: { id: string; appId: string };
  searchParams: { stale?: string };
}) {
  const user = await requireRole("MANAGER");
  const shift = await prisma.shift.findUnique({ where: { id: params.id } });
  if (!shift || shift.managerId !== user.id) notFound();

  const app = await prisma.application.findUnique({
    where: { id: params.appId },
    include: {
      marshal: { include: { marshalProfile: true } },
    },
  });
  if (!app || app.shiftId !== shift.id) notFound();
  const p = app.marshal.marshalProfile;
  if (!p) notFound();

  const reliabilityLabel =
    p.completedCount > 0
      ? `${p.reliableCount} of ${p.completedCount} shifts rated reliable`
      : "No completed shifts on MarshalHQ yet";

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
        title={p.fullName}
        subtitle={`Applicant for ${shift.productionName}`}
        action={<ApplicationStatusBadge status={app.status} />}
      />

      <div className="mb-4">
        <Link
          href={`/manager/shifts/${shift.id}/applicants`}
          className="text-sm text-accent underline-offset-2 hover:underline"
        >
          ← Back to applicants
        </Link>
      </div>

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
            <p className="mb-1 text-xs uppercase tracking-wide text-ink-soft">
              Experience summary
            </p>
            <p className="whitespace-pre-wrap text-sm text-ink">
              {p.experienceSummary}
            </p>
          </Card>
          {app.coverNote && (
            <Card>
              <p className="mb-1 text-xs uppercase tracking-wide text-ink-soft">
                Cover note
              </p>
              <p className="whitespace-pre-wrap text-sm text-ink">
                {app.coverNote}
              </p>
            </Card>
          )}
          <Card>
            <p className="text-sm text-ink-muted">
              <strong className="text-ink">Trust signal:</strong>{" "}
              {reliabilityLabel}.
            </p>
          </Card>
        </div>

        <div className="space-y-3">
          <Card>
            <p className="text-sm font-semibold">Decision</p>
            {app.status !== "APPLIED" ? (
              <Alert tone="info">
                This application is {APPLICATION_STATUS_LABEL[app.status as ApplicationStatus].toLowerCase()}.
              </Alert>
            ) : shift.status !== "OPEN" ? (
              <Alert tone="warn">
                You can only accept applicants while the shift is open.
              </Alert>
            ) : p.paused ? (
              <Alert tone="warn">
                This applicant is currently unavailable. They cannot be
                accepted for this shift. Consider another applicant.
              </Alert>
            ) : (
              <div className="mt-3 flex flex-col gap-2">
                <ConfirmButton
                  action={accept}
                  triggerLabel="Accept and book this marshal"
                  title={CONFIRM_ACCEPT_TITLE}
                  description={CONFIRM_ACCEPT_BODY}
                  confirmLabel={CONFIRM_ACCEPT_ACTION}
                  variant="primary"
                />
                <ConfirmButton
                  action={reject}
                  triggerLabel="Reject"
                  title={CONFIRM_REJECT_TITLE}
                  description={CONFIRM_REJECT_BODY}
                  confirmLabel={CONFIRM_REJECT_ACTION}
                  variant="secondary"
                />
                <p className="text-xs text-ink-soft">
                  Accepting releases phone and email to you and to this
                  marshal only. Other pending applicants will be auto-rejected.
                </p>
              </div>
            )}
          </Card>
          <Card>
            <p className="text-sm font-semibold">Shift</p>
            <p className="mt-1 text-sm text-ink-muted">
              {shift.productionName}
            </p>
            <div className="mt-2">
              <ShiftStatusBadge status={shift.status} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
