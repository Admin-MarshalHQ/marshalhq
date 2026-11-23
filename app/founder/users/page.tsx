import { correctPilotRoleAction } from "@/app/actions/founder";
import { isFounderEmail } from "@/lib/founder-identity";
import { isPilotParticipant, invitedRole } from "@/lib/pilot-participant";
import { requireFounder } from "@/lib/access";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, PageHeader } from "@/components/ui";

export default async function FounderUsersPage({searchParams}: {searchParams:{role?:string}}) {
  await requireFounder();
  const users = await prisma.user.findMany({
    take: 200,
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { applications: true, shifts: true } },
      managerProfile: { select: { id: true, companyName: true, displayName: true, founderNote: true } },
      marshalProfile: { select: { id: true, fullName: true, paused: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle={`${users.length} accounts \u2014 managers, marshals, and any unset.`}
      />
      {searchParams.role && <p role="status">{searchParams.role === "saved" ? "Account role corrected. The user can sign in again." : "Correction unavailable. Check the invitation, existing hiring activity and required manager details."}</p>}
      <p className="my-3 text-sm">Invitation sign-up links: <Link className="underline" href="/signup?role=MANAGER">Production manager</Link> · <Link className="underline" href="/signup?role=MARSHAL">Location marshal</Link></p>
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-soft">
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Profile</th>
                <th className="py-2 pr-4">Joined</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const profileLink =
                  u.role === "MARSHAL" && u.marshalProfile
                    ? `/founder/profiles/${u.marshalProfile.id}`
                    : u.role === "MANAGER" && u.managerProfile
                      ? `/founder/users/${u.managerProfile.id}`
                      : null;
                const profileName =
                  u.role === "MARSHAL"
                    ? (u.marshalProfile?.fullName ?? "\u2014")
                    : u.role === "MANAGER"
                      ? (u.managerProfile?.displayName ?? "\u2014")
                      : "\u2014";
                const paused =
                  u.role === "MARSHAL" && u.marshalProfile?.paused;
                return (
                  <tr key={u.id} className="border-b border-line/60">
                    <td className="py-2 pr-4 font-medium text-ink">{u.email}</td>
                    <td className="py-2 pr-4 text-ink-muted">{u.role}</td>
                    <td className="py-2 pr-4">
                      {profileLink ? (
                        <Link
                          href={profileLink}
                          className="text-accent underline-offset-2 hover:underline"
                        >
                          {profileName}
                        </Link>
                      ) : (
                        <span className="text-ink-muted">{profileName}</span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-ink-muted">
                      {u.createdAt.toLocaleDateString("en-GB")}
                    </td>
                    <td className="py-2">
                      <p>{u.disabledAt ? "Account disabled" : "Account enabled"}{paused && " · Profile paused"}</p>
                      <p>{u.emailVerifiedAt ? "Email verified" : "Email unverified"}</p>
                      <p>{isPilotParticipant(u.email, u.role) ? "Pilot invited" : "Pilot access pending"}{invitedRole(u.email) && ` · Invitation: ${invitedRole(u.email)}`}</p>
                      {!isFounderEmail(u.email) && !u._count.applications && !u._count.shifts && (
                        <details><summary>Correct role</summary>
                          <form action={correctPilotRoleAction.bind(null, u.id, u.role)} className="space-y-2">
                            {u.role !== "MANAGER" && <>
                              <label>Company <input name="companyName" required maxLength={120} /></label>
                              <label>Manager name <input name="displayName" required maxLength={120} /></label>
                            </>}
                            <button type="submit" className="underline">Change to {u.role === "MANAGER" ? "location marshal" : "production manager"}</button>
                          </form>
                        </details>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
