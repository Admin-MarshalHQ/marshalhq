import { Pagination, pageNumber, pageSize } from "@/components/Pagination";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { notificationDisplayBody } from "@/lib/copy";
import { prisma } from "@/lib/db";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { markNotificationRead } from "@/app/actions/auth";

export const metadata: Metadata = { title: "Inbox" };

export default async function NotificationsPage({ searchParams }: { searchParams: { page?: string; filter?: string } }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const total = await prisma.notification.count({ where: { userId: session.user.id } });
  const page = pageNumber(searchParams.page, total);
  const items = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: pageSize, skip: (page - 1) * pageSize,
  });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Inbox"
        subtitle="What's changed on your shifts and applications — the updates Setru would have emailed you."
      />
      {items.length === 0 ? (
        <EmptyState
          title="No updates yet"
          body="You'll see updates here when an application is submitted, accepted, rejected, or a shift status changes."
        />
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <Card key={n.id} variant={n.readAt ? "sunken" : "default"}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1 basis-48">
                  <div className="flex items-center gap-2">
                    {!n.readAt && (
                      <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">Unread</span>
                    )}
                    <p
                      className={
                        n.readAt
                          ? "text-sm font-medium text-ink-muted"
                          : "text-sm font-semibold text-ink"
                      }
                    >
                      {n.subject}
                    </p>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-ink-muted">
                    {notificationDisplayBody(n.kind, n.body)}
                  </p>
                  {n.link && <a href={n.link} className="text-sm underline">Open record</a>}
                  <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.04em] text-ink-soft">
                    {n.createdAt.toLocaleString("en-GB", {timeZone: "Europe/London", timeZoneName: "short"})}
                  </p>
                </div>
                {!n.readAt && (
                  <form
                    action={async () => {
                      "use server";
                      await markNotificationRead(n.id);
                    }}
                  >
                    <button
                      type="submit"
                      className="shell-link text-coral-ink"
                    >
                      Mark read
                    </button>
                  </form>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
      <Pagination page={page} total={total} base={"/notifications"} />
    </div>
  );
}
