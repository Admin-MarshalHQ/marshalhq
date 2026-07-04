import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/db";
import { Card, EmptyState, Kicker, PageHeader } from "@/components/ui";
import { formatDate, formatShiftBlock } from "@/lib/format";
import { removeAvailabilityBlockAction } from "@/app/actions/availability";
import AvailabilityForm from "./AvailabilityForm";

export default async function AvailabilityPage() {
  const user = await requireRole("MARSHAL");

  const [blocks, bookedShifts] = await Promise.all([
    prisma.availabilityBlock.findMany({
      where: { marshalId: user.id },
      orderBy: { startDate: "asc" },
    }),
    // Accepted upcoming shifts are busy automatically — shown read-only so the
    // marshal sees the full picture without re-entering booked dates.
    prisma.application.findMany({
      where: {
        marshalId: user.id,
        status: "ACCEPTED",
        shift: { status: { in: ["OPEN", "FILLED"] } },
      },
      orderBy: { shift: { startDate: "asc" } },
      include: { shift: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        kicker="Availability"
        title="Your availability"
        subtitle="Mark dates you can’t work. The apply flow uses this to warn you about clashes. Booked shifts are blocked automatically."
      />

      <Card className="mb-4">
        <Kicker className="mb-3">Add unavailable dates</Kicker>
        <AvailabilityForm />
      </Card>

      {bookedShifts.length > 0 && (
        <Card className="mb-4" variant="sunken">
          <Kicker className="mb-2">Booked (blocked automatically)</Kicker>
          <div className="space-y-2">
            {bookedShifts.map((a) => (
              <div key={a.id} className="text-sm text-ink-muted">
                <span className="text-ink">{a.shift.productionName}</span> ·{" "}
                {formatShiftBlock(
                  a.shift.startDate,
                  a.shift.endDate,
                  a.shift.dailyStartTime,
                  a.shift.dailyEndTime,
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      <Kicker className="mb-2">Unavailable dates you’ve set</Kicker>
      {blocks.length === 0 ? (
        <EmptyState
          title="No unavailable dates"
          body="You’re shown as open for any dates. Add a range above when you’re away or on another job."
        />
      ) : (
        <div className="space-y-2">
          {blocks.map((b) => {
            const remove = async () => {
              "use server";
              await removeAvailabilityBlockAction(b.id);
            };
            return (
              <Card key={b.id}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {formatDate(b.startDate)} – {formatDate(b.endDate)}
                    </p>
                    {b.note && (
                      <p className="mt-0.5 text-sm text-ink-muted">{b.note}</p>
                    )}
                  </div>
                  <form action={remove}>
                    <button
                      type="submit"
                      className="text-xs text-danger underline"
                    >
                      Remove
                    </button>
                  </form>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
