import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  Alert,
  ApplicationStatusBadge,
  Card,
  DL,
  PageHeader,
  ShiftStatusBadge,
} from "@/components/ui";
import {
  formatRate,
  formatShiftBlock,
  shiftBlockLengthLabel,
} from "@/lib/format";
import { setShiftPausedAction } from "@/app/actions/founder";
import ConfirmButton from "@/components/ConfirmButton";
import ShiftNoteForm from "./ShiftNoteForm";

export default async function FounderShiftDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const shift = await prisma.shift.findUnique({
    where: { id: params.id },
    include: {
      manager: {
        select: {
          email: true,
          managerProfile: { select: { id: true, companyName: true, displayName: true } },
        },
      },
      applications: {
        orderBy: { appliedAt: "desc" },
        include: {
          marshal: {
            select: {
              id: true,
              email: true,
              marshalProfile: { select: { id: true, fullName: true, paused: true } },
            },
          },
        },
      },
    },
  });
  if (!shift) notFound();

  const pause = async () => {
    "use server";
    await setShiftPausedAction(shift.id, true);
  };
  const unpause = async () => {
    "use server";
    await setShiftPausedAction(shift.id, false);
  };

  const acceptedApp = shift.applications.find((a) => a.status === "ACCEPTED");
  const contactReleased = Boolean(acceptedApp);

  return (
    <div>
      <PageHeader
        title={shift.productionName}
        subtitle={`${shift.location} \u00b7 ${formatShiftBlock(
          shift.startDate,
          shift.endDate,
          shift.dailyStartTime,
          shift.dailyEndTime,
        )}`}
        action={<ShiftStatusBadge status={shift.status} />}
      />
      {(() => {
        const length = shiftBlockLengthLabel(shift.startDate, shift.endDate);
        return length ? (
          <p className="-mt-2 mb-3 text-xs text-ink-soft">{length}</p>
        ) : null;
      })()}
      <div className="mb-4">
        <Link
          href="/founder/shifts"
          className="text-sm text-accent underline-offset-2 hover:underline"
        >
          ← Back to shifts
        </Link>
      </div>

      {shift.paused && (
        <Alert tone="warn">
          This shift is paused. It does not appear in marshal browsing and
          rejects new applications at the server-action level.
        </Alert>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <p className="mb-2 text-xs uppercase tracking-wide text-ink-soft">
            Shift
          </p>
          <DL
            items={[
              { label: "Rate", value: formatRate(shift.rate, shift.rateUnit) },
              { label: "Location", value: shift.location },
              {
                label: "Manager",
                value: shift.manager.managerProfile ? (
                  <Link
                    href={`/founder/users/${shift.manager.managerProfile.id}`}
                    className="text-accent underline-offset-2 hover:underline"
                  >
                    {shift.manager.managerProfile.companyName}
                  </Link>
                ) : (
                  shift.manager.email
                ),
              },
              {
                label: "Contact released",
                value: contactReleased ? "Yes (to accepted pair)" : "No",
              },
              {
                label: "Completion",
                value: shift.completedAt
                  ? `${shift.completedAt.toLocaleDateString("en-GB")} \u00b7 ${
                      shift.reliabilityFlag ? "reliable" : "flagged"
                    }`
                  : "\u2014",
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
        </Card>

        <div className="space-y-3">
          <Card>
            <p className="mb-2 text-sm font-semibold">Moderation</p>
            <p className="text-xs text-ink-soft">
              Pausing hides the shift from marshal browsing and blocks new
              applications. It does not rewrite shift status and does not
              affect the accepted marshal&rsquo;s booking view.
            </p>
            <div className="mt-3">
              {shift.paused ? (
                <ConfirmButton
                  action={unpause}
                  triggerLabel="Unpause shift"
                  title="Unpause this shift?"
                  description="The shift will reappear to marshals (if it is still Open) and new applications will be allowed again."
                  confirmLabel="Unpause"
                  variant="secondary"
                />
              ) : (
                <ConfirmButton
                  action={pause}
                  triggerLabel="Pause shift"
                  title="Pause this shift?"
                  description="The shift will be hidden from marshal browsing and new applications will be blocked. Existing applications are preserved."
                  confirmLabel="Pause shift"
                  variant="danger"
                />
              )}
            </div>
          </Card>

          <Card>
            <p className="mb-2 text-xs uppercase tracking-wide text-ink-soft">
              Internal note
            </p>
            <p className="mb-3 text-xs text-ink-soft">
              Never shown publicly. For founder eyes only.
            </p>
            <ShiftNoteForm
              shiftId={shift.id}
              initialNote={shift.founderNote ?? ""}
            />
          </Card>
        </div>
      </div>

      <h2 className="mt-6 mb-2 text-sm font-semibold uppercase tracking-wide text-ink-soft">
        Applications ({shift.applications.length})
      </h2>
      {shift.applications.length === 0 ? (
        <p className="text-sm text-ink-muted">None yet.</p>
      ) : (
        <Card>
          <ul className="divide-y divide-line text-sm">
            {shift.applications.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2">
                <div>
                  {a.marshal.marshalProfile ? (
                    <Link
                      href={`/founder/profiles/${a.marshal.marshalProfile.id}`}
                      className="text-accent underline-offset-2 hover:underline"
                    >
                      {a.marshal.marshalProfile.fullName}
                    </Link>
                  ) : (
                    <span>{a.marshal.email}</span>
                  )}
                  <p className="text-xs text-ink-soft">
                    Applied {a.appliedAt.toLocaleString("en-GB")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {a.marshal.marshalProfile?.paused && (
                    <span className="rounded-full bg-[#fbf1e3] px-2 py-0.5 text-xs text-warn">
                      Marshal paused
                    </span>
                  )}
                  <ApplicationStatusBadge status={a.status} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
