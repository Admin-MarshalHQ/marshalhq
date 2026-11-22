import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/db";
import {
  ButtonLink,
  EmptyState,
  PageHeader,
} from "@/components/ui";
import { MarshalApplicationRow } from "@/components/MarshalApplicationRow";

export default async function MyApplicationsPage() {
  const user = await requireRole("MARSHAL");
  const apps = await prisma.application.findMany({
    where: { marshalId: user.id },
    orderBy: { appliedAt: "desc" },
    include: { shift: true },
  });

  return (
    <div>
      <PageHeader
        title="My applications"
        subtitle="Track applications and open each record for its latest booking and contact status."
        action={<ButtonLink href="/marshal/shifts">Browse shifts</ButtonLink>}
      />
      {apps.length === 0 ? (
        <EmptyState
          title="No applications yet"
          body="When you apply to a shift, it will appear here with its status."
          action={<ButtonLink href="/marshal/shifts">Browse shifts</ButtonLink>}
        />
      ) : (
        <div className="space-y-2">
          {apps.map((application) => (
            <MarshalApplicationRow key={application.id} application={application} />
          ))}
        </div>
      )}
    </div>
  );
}
