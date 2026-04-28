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
        title="Inbox"
        subtitle="Updates MarshalHQ would have emailed you."
      />
      {items.length === 0 ? (
        <EmptyState
          title="No notifications yet"
          body="You’ll see updates here when an application is submitted, accepted, rejected, or a shift status changes."
        />
      ) : (
        <div className="space-y-3">
          {items.map((n) => (
            <Card key={n.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {!n.readAt && (
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
                    )}
                    <p className="text-sm font-semibold text-ink">
                      {n.subject}
                    </p>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-ink-muted">
                    {n.body}
                  </p>
                  <p className="mt-2 text-xs text-ink-soft">
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
                      className="text-xs text-ink-muted underline"
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
