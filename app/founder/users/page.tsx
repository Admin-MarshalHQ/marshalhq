import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, PageHeader } from "@/components/ui";

export default async function FounderUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
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
                      {paused ? (
                        <span className="rounded-full bg-[#fbf1e3] px-2 py-0.5 text-xs text-warn">
                          Paused
                        </span>
                      ) : (
                        <span className="text-xs text-ink-soft">Active</span>
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
