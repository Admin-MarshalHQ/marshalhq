import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, DL, PageHeader } from "@/components/ui";
import { formatPhone } from "@/lib/phone";
import ManagerNoteForm from "./ManagerNoteForm";

export default async function FounderManagerUserPage({
  params,
}: {
  params: { id: string };
}) {
  // The id here is the managerProfile id (that's what we link to from the
  // user list). We also load the owning user so the panel can show the login
  // email/phone alongside the company identity.
  const profile = await prisma.managerProfile.findUnique({
    where: { id: params.id },
    include: {
      user: {
        include: {
          shifts: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              productionName: true,
              status: true,
              paused: true,
            },
          },
        },
      },
    },
  });
  if (!profile) notFound();

  return (
    <div>
      <PageHeader
        title={profile.displayName}
        subtitle={profile.companyName}
      />
      <div className="mb-4">
        <Link
          href="/founder/users"
          className="text-sm text-accent underline-offset-2 hover:underline"
        >
          ← Back to users
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <p className="mb-2 text-xs uppercase tracking-wide text-ink-soft">
            Manager identity
          </p>
          <DL
            items={[
              { label: "Email", value: profile.user.email },
              { label: "Phone", value: formatPhone(profile.user.phone) },
              {
                label: "Joined",
                value: profile.user.createdAt.toLocaleDateString("en-GB"),
              },
              { label: "Company", value: profile.companyName },
              { label: "Shifts posted", value: profile.user.shifts.length },
            ]}
          />
        </Card>
        <Card>
          <p className="mb-2 text-xs uppercase tracking-wide text-ink-soft">
            Internal note
          </p>
          <p className="mb-3 text-xs text-ink-soft">
            Never shown publicly. For founder eyes only.
          </p>
          <ManagerNoteForm
            profileId={profile.id}
            initialNote={profile.founderNote ?? ""}
          />
        </Card>
      </div>

      <h2 className="mt-6 mb-2 text-sm font-semibold uppercase tracking-wide text-ink-soft">
        Shifts posted
      </h2>
      {profile.user.shifts.length === 0 ? (
        <p className="text-sm text-ink-muted">No shifts posted yet.</p>
      ) : (
        <Card>
          <ul className="divide-y divide-line text-sm">
            {profile.user.shifts.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2">
                <Link
                  href={`/founder/shifts/${s.id}`}
                  className="text-accent underline-offset-2 hover:underline"
                >
                  {s.productionName}
                </Link>
                <span className="text-xs text-ink-muted">
                  {s.status}
                  {s.paused ? " \u00b7 paused" : ""}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
