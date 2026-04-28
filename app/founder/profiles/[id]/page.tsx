import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Alert, Card, DL, PageHeader } from "@/components/ui";
import { formatPhone } from "@/lib/phone";
import { AVAILABILITY_LABEL } from "@/lib/state";
import type { Availability } from "@/lib/types";
import { setMarshalProfilePausedAction } from "@/app/actions/founder";
import ConfirmButton from "@/components/ConfirmButton";
import MarshalProfileNoteForm from "./MarshalProfileNoteForm";

export default async function FounderMarshalProfileDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const profile = await prisma.marshalProfile.findUnique({
    where: { id: params.id },
    include: {
      user: {
        select: {
          email: true,
          phone: true,
          createdAt: true,
          applications: {
            orderBy: { appliedAt: "desc" },
            include: {
              shift: {
                select: {
                  id: true,
                  productionName: true,
                  status: true,
                },
              },
            },
            take: 20,
          },
        },
      },
    },
  });
  if (!profile) notFound();

  const pause = async () => {
    "use server";
    await setMarshalProfilePausedAction(profile.id, true);
  };
  const unpause = async () => {
    "use server";
    await setMarshalProfilePausedAction(profile.id, false);
  };

  return (
    <div>
      <PageHeader
        title={profile.fullName}
        subtitle={`${profile.baseLocation} \u00b7 within ${profile.travelRadiusMiles} mi`}
      />
      <div className="mb-4">
        <Link
          href="/founder/profiles"
          className="text-sm text-accent underline-offset-2 hover:underline"
        >
          ← Back to marshal profiles
        </Link>
      </div>

      {profile.paused && (
        <Alert tone="warn">
          This profile is paused. It is excluded from applicant review for
          managers and cannot be treated as an active marshal for this shift
          loop.
        </Alert>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <p className="mb-2 text-xs uppercase tracking-wide text-ink-soft">
            Marshal identity
          </p>
          <DL
            items={[
              { label: "Email", value: profile.user.email },
              { label: "Phone", value: formatPhone(profile.user.phone) },
              {
                label: "Availability",
                value:
                  AVAILABILITY_LABEL[profile.availability as Availability],
              },
              {
                label: "Completed",
                value: `${profile.reliableCount} reliable / ${profile.completedCount} total`,
              },
              {
                label: "Joined",
                value: profile.user.createdAt.toLocaleDateString("en-GB"),
              },
            ]}
          />
          <div className="mt-4">
            <p className="mb-1 text-xs uppercase tracking-wide text-ink-soft">
              Experience summary
            </p>
            <p className="whitespace-pre-wrap text-sm text-ink">
              {profile.experienceSummary}
            </p>
          </div>
          {profile.training && (
            <div className="mt-4">
              <p className="mb-1 text-xs uppercase tracking-wide text-ink-soft">
                Training
              </p>
              <p className="whitespace-pre-wrap text-sm text-ink">
                {profile.training}
              </p>
            </div>
          )}
        </Card>

        <div className="space-y-3">
          <Card>
            <p className="mb-2 text-sm font-semibold">Moderation</p>
            <p className="text-xs text-ink-soft">
              Pausing hides this profile from applicant review queries and
              prevents it from being treated as an active marshal. It does not
              delete data and is not shown publicly.
            </p>
            <div className="mt-3">
              {profile.paused ? (
                <ConfirmButton
                  action={unpause}
                  triggerLabel="Unpause profile"
                  title="Unpause this marshal profile?"
                  description="The profile will appear again to managers reviewing applicants."
                  confirmLabel="Unpause"
                  variant="secondary"
                />
              ) : (
                <ConfirmButton
                  action={pause}
                  triggerLabel="Pause profile"
                  title="Pause this marshal profile?"
                  description="The profile will be hidden from manager applicant review. Existing applications stay in the database but their marshal will no longer surface as an active choice."
                  confirmLabel="Pause profile"
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
              Never shown to users. For founder eyes only.
            </p>
            <MarshalProfileNoteForm
              profileId={profile.id}
              initialNote={profile.founderNote ?? ""}
            />
          </Card>
        </div>
      </div>

      <h2 className="mt-6 mb-2 text-sm font-semibold uppercase tracking-wide text-ink-soft">
        Recent applications
      </h2>
      {profile.user.applications.length === 0 ? (
        <p className="text-sm text-ink-muted">None yet.</p>
      ) : (
        <Card>
          <ul className="divide-y divide-line text-sm">
            {profile.user.applications.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2">
                <div>
                  <Link
                    href={`/founder/shifts/${a.shift.id}`}
                    className="text-accent underline-offset-2 hover:underline"
                  >
                    {a.shift.productionName}
                  </Link>
                  <p className="text-xs text-ink-soft">
                    {a.appliedAt.toLocaleString("en-GB")}
                  </p>
                </div>
                <span className="text-xs text-ink-muted">
                  {a.status} · shift {a.shift.status}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
