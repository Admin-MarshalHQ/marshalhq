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
  const shift = await prisma.shift.findUnique({ where: { id: params.id } });
  if (!shift || shift.managerId !== user.id) notFound();
  if (shift.status !== "DRAFT") redirect(`/manager/shifts/${shift.id}`);

  const bound = updateDraftShiftAction.bind(null, shift.id);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Edit draft shift" />
      <Card>
        <ShiftForm action={bound} shift={shift} submitLabel="Save changes" />
      </Card>
    </div>
  );
}
