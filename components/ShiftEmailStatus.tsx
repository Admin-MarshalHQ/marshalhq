import { prisma } from "@/lib/db";
import { retryShiftEmailAction } from "@/app/actions/shifts";
import { Alert, Button } from "@/components/ui";

export async function ShiftEmailStatus({ shiftId }: { shiftId: string }) {
  const waiting = await prisma.mailDelivery.count({ where: { shiftId, sentAt: null } });
  if (!waiting) return null;
  return <Alert tone="warn">
    <p>{waiting} shift {waiting === 1 ? "email awaits" : "emails await"} dispatch. The change is saved in the recipient’s inbox. For an urgent change, contact Setru support.</p>
    <form action={retryShiftEmailAction.bind(null, shiftId)} className="mt-2"><Button variant="secondary" type="submit">Retry shift emails</Button> <a className="underline" href="/support">Contact support</a></form>
  </Alert>;
}
