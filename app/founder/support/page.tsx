import { Pagination, pageNumber, pageSize } from "@/components/Pagination";
import { requireFounder } from "@/lib/access";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, PageHeader } from "@/components/ui";
import { SUPPORT_CATEGORY_LABEL, type SupportCategory } from "@/lib/types";

export default async function FounderSupportListPage({ searchParams }: { searchParams: { page?: string; filter?: string } }) {
  await requireFounder();
  const total = await prisma.supportRequest.count();
  const page = pageNumber(searchParams.page, total);
  const requests = await prisma.supportRequest.findMany({
    take: pageSize, skip: (page - 1) * pageSize,
    orderBy: [{ resolvedAt: { sort: "asc", nulls: "first" } }, { createdAt: "desc" }, { id: "desc" }],
    include: {
      user: { select: { email: true, role: true } },
    },
  });

  const openCount = await prisma.supportRequest.count({ where: { resolvedAt: null } });

  return (
    <div>
      <PageHeader
        title="Support & privacy requests"
        subtitle={`${openCount} open \u00b7 ${total} total. Privacy and deletion requests are handled manually.`}
      />
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-soft">
                <th className="py-2 pr-4">Received</th>
                <th className="py-2 pr-4">From</th>
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-b border-line/60">
                  <td className="py-2 pr-4 text-ink-muted">
                    {r.createdAt.toLocaleString("en-GB")}
                  </td>
                  <td className="py-2 pr-4">
                    <span className="font-medium text-ink">{r.email}</span>
                    <p className="text-xs text-ink-soft">
                      {r.user ? r.user.role : "No linked account"}
                    </p>
                  </td>
                  <td className="py-2 pr-4 text-ink-muted">
                    {SUPPORT_CATEGORY_LABEL[r.category as SupportCategory] ??
                      r.category}
                  </td>
                  <td className="py-2 pr-4">
                    {r.resolvedAt ? (
                      <span className="rounded-full bg-ok-soft px-2 py-0.5 text-xs text-ok">
                        Handled
                      </span>
                    ) : (
                      <span className="rounded-full bg-warn-soft px-2 py-0.5 text-xs text-warn">
                        Open
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-right">
                    <Link
                      href={`/founder/support/${r.id}`}
                      className="text-accent underline-offset-2 hover:underline"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="py-6 text-center text-sm text-ink-muted"
                  >
                    No support requests yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      <Pagination page={page} total={total} base={"/founder/support"} />
    </div>
  );
}
