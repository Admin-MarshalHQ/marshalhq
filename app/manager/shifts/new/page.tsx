import { requireRole } from "@/lib/access";
import { Card, PageHeader } from "@/components/ui";
import ShiftForm from "@/components/ShiftForm";
import { saveDraftShiftAction } from "@/app/actions/shifts";

export default async function NewShiftPage() {
  await requireRole("MANAGER");
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Post a shift"
        subtitle="Only the fields here are visible to marshals. Contact details are released after acceptance."
      />
      <Card>
        <ShiftForm action={saveDraftShiftAction} submitLabel="Save draft" />
      </Card>
    </div>
  );
}
