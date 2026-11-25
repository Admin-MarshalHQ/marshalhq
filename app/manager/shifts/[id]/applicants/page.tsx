import { managerApplicationAccess } from "@/lib/manager-application-access";
import { hiringOpen } from "@/lib/workspace-shifts";
import { confirmedCount } from "@/lib/attendance";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/db";
import {
  ApplicationStatusBadge,
  EmptyState,
  PageHeader,
  ShiftStatusBadge,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { formatRate, formatShiftBlock } from "@/lib/format";
import { AVAILABILITY_LABEL } from "@/lib/state";
import type { Availability } from "@/lib/types";
import { capacityLabel } from "@/lib/capacity";

export default async function ApplicantReviewPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireRole("MANAGER");
  const visibleApplications = await managerApplicationAccess(user.id);
  // Contact-release invariant, enforced structurally: this page must never
  // show an applicant's email or phone, so the query never selects them. The
  // profile is narrowed to the fields the cards render (no founderNote).
  const shift = await prisma.shift.findFirst({
    where: { id: params.id, managerId: user.id },
    include: {
      applications: {
        where: visibleApplications,
        orderBy: { appliedAt: "asc" },
        select: {
          id: true,
          status: true,
          marshal: {
            select: {
              _count: confirmedCount,
              marshalProfile: {
                select: {
                  fullName: true,
                  baseLocation: true,
                  travelRadiusMiles: true,
                  experienceSummary: true,
                  availability: true,
                  hasDriversLicence: true,
                  hasTransport: true,
                  training: true,
                  paused: true,
                },
              },
            },
          },
        },
      },
    },
  });
  if (!shift || shift.managerId !== user.id) notFound();

  // Paused marshal profiles are excluded from the active pending list so the
  // manager doesn't review and accept someone the founder has pulled.
  // The application and its actual status remain visible in the record.
  type Applicant = (typeof shift.applications)[number];

  const acceptedCount = shift.applications.filter((a) => a.status === "ACCEPTED").length;
  const canReview = hiringOpen(shift) && acceptedCount < shift.marshalsNeeded;

  function needsReview(a: Applicant) {
    return canReview && a.status === "APPLIED" && a.marshal.marshalProfile && !a.marshal.marshalProfile.paused;
  }

  const pending = shift.applications.filter(needsReview);
  const other = shift.applications.filter((a) => !needsReview(a));

  return (
    <div>
      <PageHeader
        back={{ href: `/manager/shifts/${shift.id}`, label: "Back to shift" }}
        title={`Applicants – ${shift.productionName}`}
        subtitle={`${shift.location} · ${formatShiftBlock(
          shift.startDate, shift.endDate, shift.dailyStartTime, shift.dailyEndTime,
        )} · ${formatRate(shift.rate, shift.rateUnit)}`}
        action={<ShiftStatusBadge status={shift.status} />}
      />
      <div className="mb-5 flex flex-wrap gap-x-3 gap-y-1 text-sm text-ink-muted">
        <p className="font-bold text-ink">{shift.applications.length} {shift.applications.length === 1 ? "applicant" : "applicants"}</p>
        <p>{capacityLabel(acceptedCount, shift.marshalsNeeded)}</p>
        <p>Contact details release only after acceptance.</p>
      </div>

      <h2 className="mb-3 text-xl font-bold tracking-tight">Waiting for a decision ({pending.length})</h2>
      {pending.length === 0 ? (
        <EmptyState title="No applicants to review" body={canReview ? "When a marshal applies, their profile summary will appear here." : "This shift is not accepting hiring decisions."} />
      ) : (
        <ul className="grid gap-3">
          {pending.map((a) => {
            const profile = a.marshal.marshalProfile;
            if (!profile) return null;
            const initials = profile.fullName.trim().split(/\s+/).slice(0, 2)
              .map((name) => Array.from(name)[0]).join("").toLocaleUpperCase("en-GB");
            const availability = AVAILABILITY_LABEL[profile.availability as Availability] ?? "Not stated";

            return (
              <li key={a.id} className="grid grid-cols-[auto,minmax(0,1fr)] items-start gap-3 rounded-lg border border-line bg-white p-4 shadow-card sm:grid-cols-[auto,minmax(0,1fr),auto] sm:p-5">
                <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-md bg-coral-soft text-sm font-bold text-coral-ink">
                  {initials || <Icon name="person" />}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h3 className="text-lg font-bold tracking-tight">{profile.fullName}</h3>
                    <ApplicationStatusBadge status={a.status} />
                  </div>
                  <p className="mt-1 text-sm text-ink-muted">{profile.baseLocation} · up to {profile.travelRadiusMiles} miles</p>
                  <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-muted">
                    <div><dt className="sr-only">Availability</dt><dd>{availability}</dd></div>
                    <div><dt className="inline font-semibold">Transport </dt><dd className="inline">{practicalAnswer(profile.hasTransport)}</dd></div>
                    <div><dt className="inline font-semibold">Driving licence </dt><dd className="inline">{practicalAnswer(profile.hasDriversLicence)}</dd></div>
                  </dl>
                  <p className="mt-2 line-clamp-2 text-sm">{profile.experienceSummary}</p>
                  {profile.training && <p className="mt-1 line-clamp-2 text-sm text-ink-muted"><span className="font-semibold">Training reported </span>{profile.training}</p>}
                  <p className="mt-2 text-sm font-medium text-ink-muted">
                    Shifts recorded as worked: {a.marshal._count.applications}
                  </p>
                </div>
                <Link
                  href={`/manager/shifts/${shift.id}/applicants/${a.id}`}
                  aria-label={`View application from ${profile.fullName}`}
                  className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-line-control px-3 py-2 text-center text-sm font-bold hover:bg-coral-soft sm:col-span-1 sm:self-center"
                >
                  View application <Icon name="chevron" className="size-4 shrink-0" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {other.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-xl font-bold tracking-tight">Other applications</h2>
          <ul className="grid gap-2">
            {other.map((a) => {
              const profile = a.marshal.marshalProfile;
              const name = profile?.fullName ?? "Marshal";
              return (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-md border border-line bg-white px-4 py-2">
                  <div>
                    <p className="font-semibold">{name}</p>
                    {!profile || profile.paused ? <p className="text-sm text-ink-muted">Profile unavailable</p> : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <ApplicationStatusBadge status={a.status} />
                    {profile && !profile.paused && (
                      <Link className="shell-link text-coral-ink" href={`/manager/shifts/${shift.id}/applicants/${a.id}`} aria-label={`View application from ${name}`}>
                        View application
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function practicalAnswer(value: boolean | null) {
  return value === null ? "Not stated" : value ? "Yes" : "No";
}
