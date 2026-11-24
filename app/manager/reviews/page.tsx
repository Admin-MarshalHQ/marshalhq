import { requireRole } from "@/lib/access";
import { recordedReviews } from "@/lib/recorded-reviews";
import { Card, PageHeader } from "@/components/ui";

export default async function ReceivedReviews() {
  const manager = await requireRole("MANAGER");
  const reviews = await recordedReviews(manager.id, "MARSHAL_ON_MANAGER");
  return <div><PageHeader title="Reviews from marshals" back={{ href: "/manager", label: "Production dashboard" }} />
    {reviews.length === 0 && <p>No recorded reviews yet.</p>}
    {reviews.map(review => <article id={`review-${review.id}`} key={review.id} className="mb-3"><Card>
      <h2>{review.shift.productionName}</h2><p>{review.rating} / 5 · {review.createdAt.toLocaleDateString("en-GB", { timeZone: "Europe/London" })}</p>
      {review.comment && <p className="whitespace-pre-wrap">{review.comment}</p>}
    </Card></article>)}
  </div>;
}
