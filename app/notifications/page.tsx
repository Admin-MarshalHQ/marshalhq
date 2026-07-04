import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { markNotificationRead } from "@/app/actions/auth";

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const items = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        kicker="Inbox"
        title="Updates"
        subtitle="What's changed on your shifts and applications — the updates MarshalHQ would have emailed you."
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
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {!n.readAt && (
                      <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
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
                    {n.body}
                  </p>
                  <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.04em] text-ink-soft">
                    {n.createdAt.toLocaleString("en-GB")}
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
                      className="inline-flex min-h-[32px] items-center whitespace-nowrap text-xs text-ink-muted underline hover:text-ink"
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
    </div>
  );
}
