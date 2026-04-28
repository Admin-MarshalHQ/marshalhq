import Link from "next/link";
import Image from "next/image";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/db";
import {
  ButtonLink,
  Card,
  DL,
  EmptyState,
  PageHeader,
} from "@/components/ui";

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
        title={p.fullName}
        subtitle="This is what managers see when you apply. It never shows your contact details."
        action={
          <ButtonLink href="/marshal/profile/edit" variant="secondary">
            Edit
          </ButtonLink>
        }
      />

      <Card>
        <div className="flex items-start gap-4">
          {p.photoUrl && (
            <Image
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
              ]}
            />
          </div>
        </div>
        <div className="mt-4 border-t border-line pt-4">
          <p className="mb-1 text-xs uppercase tracking-wide text-ink-soft">
            Experience summary
          </p>
          <p className="whitespace-pre-wrap text-sm text-ink">
            {p.experienceSummary}
          </p>
        </div>
      </Card>
    </div>
  );
}
