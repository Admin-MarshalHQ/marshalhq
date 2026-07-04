import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/db";
import {
  ButtonLink,
  Card,
  DL,
  EmptyState,
  Kicker,
  PageHeader,
} from "@/components/ui";
import { StarRatingDisplay } from "@/components/StarRating";
import { ratingSummary } from "@/lib/reviews";

function availabilityLabel(a: string) {
  if (a === "ACTIVELY_LOOKING") return "Actively looking";
  if (a === "OPEN_TO_WORK") return "Open to work";
  return "Unavailable";
}

export default async function MarshalProfilePage() {
  const user = await requireRole("MARSHAL");
  const p = await prisma.marshalProfile.findUnique({
    where: { userId: user.id },
  });
  const reviews = await prisma.review.findMany({
    where: { subjectId: user.id, direction: "MANAGER_ON_MARSHAL" },
    orderBy: { createdAt: "desc" },
    include: {
      shift: { select: { productionName: true } },
    },
  });
  const summary = ratingSummary(reviews);

  if (!p) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Your profile" />
        <EmptyState
          title="No profile yet"
          body="Managers need a short profile to assess fit. It takes a minute."
          action={
            <ButtonLink href="/marshal/profile/edit">
              Create profile
            </ButtonLink>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        kicker="Your profile — as managers see it"
        title={p.fullName}
        subtitle="Managers review this when you apply. It never shows your contact details — those release only after you're accepted."
        action={
          <ButtonLink href="/marshal/profile/edit" variant="secondary">
            Edit
          </ButtonLink>
        }
      />

      <Card>
        <div className="flex items-start gap-4">
          {p.photoUrl && (
            // Plain <img> on purpose: photo URLs are user-supplied, and
            // routing them through next/image would let the optimizer fetch
            // arbitrary third-party hosts.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.photoUrl}
              alt={p.fullName}
              width={80}
              height={80}
              className="h-20 w-20 rounded-md object-cover"
            />
          )}
          <div className="flex-1">
            <DL
              items={[
                { label: "Base location", value: p.baseLocation },
                {
                  label: "Travel radius",
                  value: `${p.travelRadiusMiles} miles`,
                },
                {
                  label: "Availability",
                  value: availabilityLabel(p.availability),
                },
                {
                  label: "Transport",
                  value:
                    p.hasTransport === true
                      ? "Has own transport"
                      : p.hasTransport === false
                        ? "No own transport"
                        : "\u2014",
                },
                {
                  label: "Driver\u2019s licence",
                  value:
                    p.hasDriversLicence === true
                      ? "Yes"
                      : p.hasDriversLicence === false
                        ? "No"
                        : "\u2014",
                },
                {
                  label: "Training / credentials",
                  value: p.training || "\u2014",
                },
                {
                  label: "Reliability",
                  value:
                    p.completedCount > 0
                      ? `${p.reliableCount}/${p.completedCount} reliable`
                      : "No completed shifts yet",
                },
                {
                  label: "Manager rating",
                  value: <StarRatingDisplay summary={summary} />,
                },
              ]}
            />
          </div>
        </div>
        <div className="mt-4 border-t border-line pt-4">
          <Kicker className="mb-1">Experience summary</Kicker>
          <p className="whitespace-pre-wrap text-sm text-ink">
            {p.experienceSummary}
          </p>
        </div>
      </Card>

      {summary.count > 0 && (
        <Card className="mt-4">
          <Kicker className="mb-3">Reviews from managers</Kicker>
          <div className="space-y-3">
            {reviews
              .filter((r) => r.comment)
              .map((r) => (
                <div key={r.id} className="border-b border-line pb-3 last:border-0 last:pb-0">
                  <StarRatingDisplay
                    summary={{ average: r.rating, count: 1 }}
                    emptyLabel=""
                  />
                  <p className="mt-1 whitespace-pre-wrap text-sm text-ink">
                    {r.comment}
                  </p>
                  <p className="mt-1 text-xs text-ink-soft">
                    {r.shift.productionName}
                  </p>
                </div>
              ))}
            {reviews.every((r) => !r.comment) && (
              <p className="text-sm text-ink-muted">
                No written comments yet, but your rating reflects {summary.count}{" "}
                completed {summary.count === 1 ? "review" : "reviews"}.
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
