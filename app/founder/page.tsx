import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, PageHeader } from "@/components/ui";

export default async function FounderOverviewPage() {
  // Small readout — counts, plus a peek at the latest items. Intentionally
  // not a dashboard; each tile just links the founder to the relevant list.
  const [
    userCount,
    marshalProfileCount,
    pausedMarshalCount,
    shiftCount,
    openShiftCount,
    pausedShiftCount,
    applicationCount,
    openSupportCount,
    totalSupportCount,
    latestSupport,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.marshalProfile.count(),
    prisma.marshalProfile.count({ where: { paused: true } }),
    prisma.shift.count(),
    prisma.shift.count({ where: { status: "OPEN" } }),
    prisma.shift.count({ where: { paused: true } }),
    prisma.application.count(),
    prisma.supportRequest.count({ where: { resolvedAt: null } }),
    prisma.supportRequest.count(),
    prisma.supportRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        email: true,
        category: true,
        createdAt: true,
        resolvedAt: true,
      },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Founder panel"
        subtitle="Internal review only. No automated moderation — pause, hide, and note as needed."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Users"
          value={userCount}
          href="/founder/users"
        />
        <StatCard
          label="Marshal profiles"
          value={marshalProfileCount}
          sub={pausedMarshalCount ? `${pausedMarshalCount} paused` : undefined}
          href="/founder/profiles"
        />
        <StatCard
          label="Shifts"
          value={shiftCount}
          sub={`${openShiftCount} open${
            pausedShiftCount ? ` / ${pausedShiftCount} paused` : ""
          }`}
          href="/founder/shifts"
        />
        <StatCard
          label="Applications"
          value={applicationCount}
          href="/founder/applications"
        />
        <StatCard
          label="Support requests"
          value={totalSupportCount}
          sub={openSupportCount ? `${openSupportCount} open` : "all handled"}
          href="/founder/support"
        />
      </div>

      <h2 className="mt-6 mb-2 text-sm font-semibold uppercase tracking-wide text-ink-soft">
        Recent support requests
      </h2>
      {latestSupport.length === 0 ? (
        <p className="text-sm text-ink-muted">No requests yet.</p>
      ) : (
        <Card>
          <ul className="divide-y divide-line text-sm">
            {latestSupport.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2">
                <div>
                  <Link
                    href={`/founder/support/${s.id}`}
                    className="font-medium text-accent underline-offset-2 hover:underline"
                  >
                    {s.category.replace(/_/g, " ").toLowerCase()}
                  </Link>
                  <p className="text-xs text-ink-soft">
                    {s.email} · {s.createdAt.toLocaleString("en-GB")}
                  </p>
                </div>
                <span
                  className={
                    s.resolvedAt
                      ? "rounded-full bg-[#e7f1ea] px-2 py-0.5 text-xs text-ok"
                      : "rounded-full bg-[#fbf1e3] px-2 py-0.5 text-xs text-warn"
                  }
                >
                  {s.resolvedAt ? "Handled" : "Open"}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  href,
}: {
  label: string;
  value: number;
  sub?: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-md border border-line bg-white p-4 hover:bg-surface-subtle"
    >
      <p className="text-xs uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-ink-muted">{sub}</p>}
    </Link>
  );
}
