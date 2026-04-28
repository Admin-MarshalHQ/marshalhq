import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, PageHeader } from "@/components/ui";
import { AVAILABILITY_LABEL } from "@/lib/state";
import type { Availability } from "@/lib/types";

export default async function FounderMarshalProfilesPage() {
  const profiles = await prisma.marshalProfile.findMany({
    orderBy: [{ paused: "desc" }, { createdAt: "desc" }],
    include: {
      user: { select: { email: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Marshal profiles"
        subtitle={`${profiles.length} profiles \u2014 paused profiles are hidden from manager applicant review and do not appear in completion history logic.`}
      />
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-soft">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Base</th>
                <th className="py-2 pr-4">Availability</th>
                <th className="py-2 pr-4">Completed</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id} className="border-b border-line/60">
                  <td className="py-2 pr-4">
                    <Link
                      href={`/founder/profiles/${p.id}`}
                      className="font-medium text-accent underline-offset-2 hover:underline"
                    >
                      {p.fullName}
                    </Link>
                  </td>
                  <td className="py-2 pr-4 text-ink-muted">{p.user.email}</td>
                  <td className="py-2 pr-4 text-ink-muted">{p.baseLocation}</td>
                  <td className="py-2 pr-4 text-ink-muted">
                    {AVAILABILITY_LABEL[p.availability as Availability]}
                  </td>
                  <td className="py-2 pr-4 text-ink-muted">
                    {p.reliableCount}/{p.completedCount}
                  </td>
                  <td className="py-2">
                    {p.paused ? (
                      <span className="rounded-full bg-[#fbf1e3] px-2 py-0.5 text-xs text-warn">
                        Paused
                      </span>
                    ) : (
                      <span className="text-xs text-ink-soft">Active</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
