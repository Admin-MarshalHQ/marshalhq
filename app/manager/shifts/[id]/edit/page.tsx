import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/db";
import { Card, PageHeader } from "@/components/ui";
import ShiftForm from "@/components/ShiftForm";
import { updateDraftShiftAction } from "@/app/actions/shifts";

export default async function EditShiftPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireRole("MANAGER");
  const record = await prisma.shift.findUnique({
    where: { id: params.id, managerId: user.id },
    select: {
      id: true, status: true, updatedAt: true, productionName: true, location: true,
      startDate: true, endDate: true, dailyStartTime: true, dailyEndTime: true,
      marshalsNeeded: true, rate: true, rateUnit: true, duties: true, engagementTerms: true,
      parkingTravel: true, experienceNotes: true,
    },
  });
  if (!record) notFound();
  const { id, status, updatedAt, ...fields } = record;
  if (status !== "DRAFT") redirect(`/manager/shifts/${id}`);

  const bound = updateDraftShiftAction.bind(null, id, updatedAt.toISOString());

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        kicker="Draft shift"
        back={{ href: `/manager/shifts/${id}`, label: "Back to shift" }}
        title="Edit draft"
        subtitle="Changes save to the draft. Marshals see nothing until you publish."
      />
      <Card>
        <ShiftForm action={bound} shift={fields} submitLabel="Save changes" />
      </Card>
    </div>
  );
}
