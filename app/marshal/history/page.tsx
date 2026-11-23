import { recordedReviews } from "@/lib/recorded-reviews";
import { workedFilter } from "@/lib/attendance";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/db";
import {
  Card,
  EmptyState,
  Kicker,
  PageHeader,
} from "@/components/ui";
import { formatShiftBlock } from "@/lib/format";
import { StarRatingDisplay } from "@/components/StarRating";
import { ratingSummary } from "@/lib/reviews";

export default async function CompletionHistoryPage() {
  const user = await requireRole("MARSHAL");
  const reviews = await recordedReviews(user.id, "MANAGER_ON_MARSHAL");
  const ratingSummaryValue = ratingSummary(reviews);
  const completed = await prisma.application.findMany({
    where: {
      ...workedFilter,
      marshalId: user.id,
      status: "ACCEPTED",
      shift: { status: "COMPLETED" },
    },
    orderBy: { shift: { startDate: "desc" } },
    include: {
      shift: {
        include: {
          manager: {
            select: { managerProfile: { select: { companyName: true } } },
          },
        },
      },
    },
  });


  return (
    <div>
      <PageHeader
        kicker="Completion history"
        title="Your record"
        subtitle="Bookings with an individual record of work. Use Support to ask for a correction."
      />

      <Card className="mb-4">
        <Kicker>Shifts recorded as worked</Kicker>
        <p className="mt-1 font-serif text-2xl text-ink">{completed.length}</p>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-ink-muted">Manager rating:</span>
          <StarRatingDisplay summary={ratingSummaryValue} />
        </div>

      </Card>

      {completed.length === 0 ? (
        <EmptyState
          title="No completed shifts yet"
          body="A booking appears here once your individual attendance is recorded as worked."
        />
      ) : (
        <div className="space-y-2">
          {completed.map((a) => (
            <Card key={a.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold">
                    {a.shift.productionName}
                  </p>
                  <p className="mt-1 text-sm text-ink-muted">
                    {a.shift.manager.managerProfile?.companyName ?? "Manager"}{" "}
                    ·{" "}
                    {formatShiftBlock(
                      a.shift.startDate,
                      a.shift.endDate,
                      a.shift.dailyStartTime,
                      a.shift.dailyEndTime,
                    )}
                  </p>
                </div>

              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
