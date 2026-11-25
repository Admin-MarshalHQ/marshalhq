import type { Shift } from "@prisma/client";
import { recordVacancyRelease } from "@/app/actions/vacancy-release";
import { invitedMarshalAddresses } from "@/lib/pilot-participant";
import { briefVersion } from "@/lib/vacancy-brief";
import { prisma } from "@/lib/db";
import { Button, Card } from "@/components/ui";

export async function VacancyReleaseForm({
  shift,
  result,
}: {
  shift: Shift;
  result?: string;
}) {
  const [current, eligible] = await Promise.all([
    prisma.vacancyRelease.findUnique({ where: { activeSlot: "GB-pilot" } }),
    prisma.user.findMany({
      where: {
        email: { in: invitedMarshalAddresses() },
        role: "MARSHAL",
        disabledAt: null,
        emailVerifiedAt: { not: null },
        marshalProfile: { paused: false },
      },
      select: {
        id: true,
        email: true,
        marshalProfile: { select: { fullName: true } },
      },
    }),
  ]);
  const occupied = current && current.shiftId !== shift.id;
  const active = occupied ? null : current;
  const messages: Record<string, string> = {
    occupied: "Another vacancy has the pilot place.",
    held: "New activity is held.",
    saved: "Clearances recorded.",
    changed: "The brief or clearance changed. Check it again.",
    invalid:
      "Check the full brief, capacity, role-specific invitations, cover expiry, evidence reference and individual permissions.",
  };
  return (
    <Card>
      <h2 className="font-bold">Private pilot clearance</h2>
      {result && <p role="status">{messages[result]}</p>}
      {occupied ? (
        <p>
          Another vacancy has the pilot place. Hold or finish it before moving
          to this one.
        </p>
      ) : (
        <form
          className="mt-3 space-y-4"
          action={recordVacancyRelease.bind(
            null,
            shift.id,
            briefVersion(shift),
            active?.id ?? "",
          )}
        >
          <p>
            Check the contracting hirer, authority, ordinary duties, versioned
            brief, participant paperwork and staffed cover in the restricted
            vacancy record. Each named introduction and booking needs its own
            recorded clearance. Select only the permissions already evidenced.
          </p>
          <label className="block">
            Restricted evidence reference
            <input
              name="evidenceRef"
              maxLength={80}
              placeholder="Case reference only"
            />
          </label>
          <label className="block">
            End of confirmed support cover (UTC)
            <input
              name="expiresAt"
              placeholder="YYYY-MM-DDTHH:mm:ssZ"
              pattern="[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z"
            />
          </label>
          {eligible.map((person) => (
            <fieldset key={person.id}>
              <legend>
                {person.marshalProfile?.fullName} · {person.email}
              </legend>
              {(
                [
                  ["viewers", "May see advert"],
                  ["applicants", "May submit named application"],
                  ["bookable", "May be booked"],
                ] as const
              ).map(([field, label]) => (
                <label
                  className="mr-4 inline-flex items-center gap-1"
                  key={field}
                >
                  <input
                    type="checkbox"
                    name={field}
                    value={person.id}
                    defaultChecked={active?.[field].includes(person.id)}
                  />
                  {label}
                </label>
              ))}
            </fieldset>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" name="decision" value="release">
              Record checked clearances
            </Button>
            {active && (
              <Button
                type="submit"
                name="decision"
                value="hold"
                formNoValidate
                variant="secondary"
              >
                Hold all new activity
              </Button>
            )}
          </div>
        </form>
      )}
    </Card>
  );
}
