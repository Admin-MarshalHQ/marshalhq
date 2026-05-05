import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, PageHeader } from "@/components/ui";

export default async function FounderManagersPage() {
  const managers = await prisma.user.findMany({
    where: { role: "MANAGER" },
    orderBy: { createdAt: "desc" },
    include: {
      managerProfile: {
        select: { id: true, companyName: true, displayName: true },
      },
      shifts: { select: { status: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Managers"
        subtitle={`${managers.length} manager accounts in the private pilot.`}
      />
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-soft">
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Manager</th>
                <th className="py-2 pr-4">Company</th>
                <th className="py-2 pr-4">Joined</th>
                <th className="py-2">Shifts</th>
              </tr>
            </thead>
            <tbody>
              {managers.map((u) => {
                const open = u.shifts.filter((s) => s.status === "OPEN").length;
                const filled = u.shifts.filter((s) => s.status === "FILLED").length;
                return (
                  <tr key={u.id} className="border-b border-line/60">
                    <td className="py-2 pr-4 font-medium text-ink">{u.email}</td>
                    <td className="py-2 pr-4">
                      {u.managerProfile ? (
                        <Link
                          href={`/founder/users/${u.managerProfile.id}`}
                          className="text-accent underline-offset-2 hover:underline"
                        >
                          {u.managerProfile.displayName}
                        </Link>
                      ) : (
                        <span className="text-ink-muted">-</span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-ink-muted">
                      {u.managerProfile?.companyName ?? "-"}
                    </td>
                    <td className="py-2 pr-4 text-ink-muted">
                      {u.createdAt.toLocaleDateString("en-GB")}
                    </td>
                    <td className="py-2 text-xs text-ink-muted">
                      {u.shifts.length} total, {open} open, {filled} filled
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
