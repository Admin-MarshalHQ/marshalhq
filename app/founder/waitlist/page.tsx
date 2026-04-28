import { prisma } from "@/lib/db";
import { Card, PageHeader } from "@/components/ui";
import {
  WAITLIST_AVAILABILITY_LABEL,
  WAITLIST_EXPECTED_NEED_LABEL,
  WAITLIST_MARSHAL_EXPERIENCE_LABEL,
  WAITLIST_ROLE_LABEL,
  WAITLIST_STATUS_LABEL,
  type WaitlistAvailability,
  type WaitlistExpectedNeed,
  type WaitlistMarshalExperience,
  type WaitlistRole,
  type WaitlistStatus,
} from "@/lib/types";

export default async function FounderWaitlistPage() {
  const entries = await prisma.waitlistEntry.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const newCount = entries.filter((e) => e.status === "NEW").length;

  return (
    <div>
      <PageHeader
        title="Early access waitlist"
        subtitle={`${newCount} new · ${entries.length} total. Demand capture only — no automated approval.`}
      />
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-soft">
                <th className="py-2 pr-4">Received</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Location</th>
                <th className="py-2 pr-4">Detail</th>
                <th className="py-2 pr-4">Note</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const isManager = e.role === "MANAGER";
                const detail: string[] = [];
                if (isManager) {
                  if (e.managerRole) detail.push(e.managerRole);
                  if (e.expectedNeed) {
                    detail.push(
                      WAITLIST_EXPECTED_NEED_LABEL[
                        e.expectedNeed as WaitlistExpectedNeed
                      ] ?? e.expectedNeed,
                    );
                  }
                } else {
                  if (e.marshalExperience) {
                    detail.push(
                      WAITLIST_MARSHAL_EXPERIENCE_LABEL[
                        e.marshalExperience as WaitlistMarshalExperience
                      ] ?? e.marshalExperience,
                    );
                  }
                  if (e.availability) {
                    detail.push(
                      WAITLIST_AVAILABILITY_LABEL[
                        e.availability as WaitlistAvailability
                      ] ?? e.availability,
                    );
                  }
                }
                return (
                  <tr key={e.id} className="border-b border-line/60 align-top">
                    <td className="py-2 pr-4 text-ink-muted">
                      {e.createdAt.toLocaleString("en-GB")}
                    </td>
                    <td className="py-2 pr-4 font-medium text-ink">
                      {e.name}
                    </td>
                    <td className="py-2 pr-4 text-ink-muted">{e.email}</td>
                    <td className="py-2 pr-4 text-ink-muted">
                      {WAITLIST_ROLE_LABEL[e.role as WaitlistRole] ?? e.role}
                    </td>
                    <td className="py-2 pr-4 text-ink-muted">{e.location}</td>
                    <td className="py-2 pr-4 text-ink-muted">
                      {detail.length ? detail.join(" · ") : "—"}
                    </td>
                    <td className="py-2 pr-4 text-ink">
                      <span className="block max-w-md whitespace-pre-wrap">
                        {e.note}
                      </span>
                    </td>
                    <td className="py-2">
                      <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-xs text-ink-muted">
                        {WAITLIST_STATUS_LABEL[e.status as WaitlistStatus] ??
                          e.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {entries.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="py-6 text-center text-sm text-ink-muted"
                  >
                    No waitlist entries yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
