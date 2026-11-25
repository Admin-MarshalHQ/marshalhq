import type { Prisma } from "@prisma/client";

const fields = {
  productionName: "Production",
  location: "Location",
  firstCall: "First call date",
  lastCall: "Last call date",
  timeZone: "Time zone",
  dailyCall: "Daily call",
  dailyWrap: "Daily wrap",
  capacity: "Places",
  rateGBP: "Rate (GBP)",
  rateUnit: "Rate unit",
  duties: "Duties",
  parkingTravel: "Parking or travel",
  requirements: "Required experience",
  engagementTerms: "Engagement terms",
};

export function AppliedBriefDownload({
  snapshot,
  version,
  appliedAt,
}: {
  snapshot: Prisma.JsonValue;
  version: string | null;
  appliedAt: Date;
}) {
  if (
    !version ||
    !snapshot ||
    typeof snapshot !== "object" ||
    Array.isArray(snapshot)
  )
    return null;
  const lines = [
    "Setru — shift brief at application",
    `Applied at ${appliedAt.toISOString()}`,
    `Brief version ${version}`,
    "",
  ];
  for (const [key, label] of Object.entries(fields)) {
    const value = snapshot[key];
    if (typeof value === "string" || typeof value === "number")
      lines.push(`${label}: ${value}`);
  }
  return (
    <a
      className="mt-3 inline-block underline"
      download="Setru-applied-brief.txt"
      href={
        "data:text/plain;charset=utf-8," + encodeURIComponent(lines.join("\n"))
      }
    >
      Download the brief as it stood at application
    </a>
  );
}
