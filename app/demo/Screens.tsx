import { Icon } from "@/components/Icon";
import { ShiftFacts } from "@/components/ShiftFacts";
import { ShiftListing } from "@/components/ShiftListing";
import ConfirmButton from "@/components/ConfirmButton";
import {
  ApplicationStatusBadge, Button, ButtonLink, CapacityMeter, Card, ContactCard, DateBlock, DL,
  Kicker, PageHeader, ShiftStatusBadge, StatCard, StatusBadge,
} from "@/components/ui";
import { marshalApplicationOutcome } from "@/lib/application-outcome";
import { confirmAcceptBody, CONFIRM_ACCEPT_ACTION, CONFIRM_ACCEPT_TITLE, CONTACT_RELEASED_BODY_MANAGER, CONTACT_RELEASED_BODY_MARSHAL, CONTACT_RELEASED_HEADING } from "@/lib/copy";
import { formatDate, formatRate } from "@/lib/format";
import { company, manager, profiles, roster, type Action, type Application, type DemoShift } from "./model";

type ListProps = { shifts: DemoShift[]; applications: Application[] };
type DetailProps = { shift: DemoShift; applications: Application[]; act: (move: Action) => void };
const sectionTitle = "mb-3 text-xl font-bold tracking-tight";

function Back({ href, children }: { href: string; children: React.ReactNode }) {
  return <a className="my-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-ink-muted hover:text-coral-ink" href={href}><Icon name="back" className="size-4" />{children}</a>;
}

export function Marketplace({ shifts, applications }: ListProps) {
  const openShifts = shifts.filter(s => roster(s, applications).open);
  return <>
    <PageHeader title="Available shifts" subtitle="Find location marshal work in UK film and TV." />
    {openShifts.length ? <ul className="grid items-start gap-4 md:grid-cols-2">
      {openShifts.map(s => <ShiftListing key={s.id} shift={{ ...s, duties: s.summary }} byline={s.unit}
        booked={roster(s, applications).booked} featured={s.id === "lockside"}
        status={applications.find(a => a.shift === s.id && a.marshal === "kit")?.status} href={`#marshal/${s.id}`} />)}
    </ul> : <Card><h2 className={sectionTitle}>All shifts are filled</h2><ButtonLink href="#marshal/dashboard" variant="secondary">See your bookings</ButtonLink></Card>}
  </>;
}

export function MarshalDashboard({ shifts, applications }: ListProps) {
  const mine = applications.filter(a => a.marshal === "kit");
  const bookings = mine.filter(a => a.status === "ACCEPTED");
  const waiting = mine.filter(a => a.status === "APPLIED" && roster(shifts.find(s => s.id === a.shift)!, applications).open);
  return <>
    <PageHeader title="Welcome back, Kit Mercer" subtitle="Your applications and upcoming work." />
    <div className="grid grid-cols-2 gap-3">
      <StatCard label="Awaiting a decision" value={waiting.length} />
      <StatCard label="Current and upcoming bookings" value={bookings.length} icon="check" tone="ok" />
    </div>
    <h2 className={`mt-6 ${sectionTitle}`}>Recent applications</h2>
    <div className="space-y-2">{mine.map(a => {
      const s = shifts.find(s => s.id === a.shift)!;
      const outcome = marshalApplicationOutcome(a.status, roster(s, applications));
      return <a key={s.id} href={`#marshal/${s.id}`} className="card-link flex items-start gap-3">
        <DateBlock date={s.startDate} /><div>
          <div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-bold">{s.productionName}</h3><StatusBadge label={outcome.label} tone={outcome.tone} /></div>
          <p className="text-sm text-ink-muted">{s.location} · {s.dailyStartTime}–{s.dailyEndTime}</p>
          <p className="mt-1 text-sm text-ink-muted">{outcome.detail}</p>
        </div><Icon name="chevron" className="ml-auto shrink-0 self-center text-coral-ink" />
      </a>;
    })}</div>
  </>;
}

export function ManagerDashboard({ shifts, applications }: ListProps) {
  const pending = applications.filter(a => a.status === "APPLIED" && roster(shifts.find(s => s.id === a.shift)!, applications).open);
  return <>
    <PageHeader title="Production dashboard" subtitle={`${manager.name} · ${company}`} />
    {pending.length > 0 && <div className="mb-5 overflow-hidden rounded-md border border-gold/40 bg-white shadow-card">
      <h2 className="border-b border-gold/30 bg-gold-soft px-4 py-2 text-sm font-bold text-gold-ink">Needs your attention</h2>
      {shifts.map(s => {
        const count = pending.filter(a => a.shift === s.id).length;
        return count > 0 && <a key={s.id} href={`#manager/${s.id}`} className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 text-sm last:border-b-0 hover:bg-surface-subtle">
          <span><strong>{s.productionName}</strong><span className="block text-ink-muted">{count} to review · {roster(s, applications).booked} of {s.marshalsNeeded} booked</span></span>
          <span className="font-semibold text-coral-ink">Review applicants →</span>
        </a>;
      })}
    </div>}
    <div className="grid grid-cols-2 gap-3">
      <StatCard label="Open shifts" value={shifts.filter(s => roster(s, applications).open).length} icon="calendar" />
      <StatCard label="Applications to review" value={pending.length} icon="people" tone="booked" />
    </div>
    <h2 className={`mt-6 ${sectionTitle}`}>Active shifts</h2>
    <div className="space-y-2">{shifts.map(s => {
      const r = roster(s, applications);
      return <a key={s.id} href={`#manager/${s.id}`} className="card-link flex items-start gap-3"><DateBlock date={s.startDate} />
        <div><div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-bold">{s.productionName}</h3><ShiftStatusBadge status={r.status} /></div>
        <p className="my-1 text-sm text-ink-muted">{s.location} · {s.dailyStartTime}–{s.dailyEndTime}</p>
        <CapacityMeter booked={r.booked} needed={s.marshalsNeeded} /></div><Icon name="chevron" className="ml-auto shrink-0 self-center text-coral-ink" />
      </a>;
    })}</div>
  </>;
}

function Brief({ shift, booked }: { shift: DemoShift; booked: number }) {
  return <Card>
    <div className="mb-4 flex items-center gap-3">
      <DateBlock date={shift.startDate} />
      <div><h2 className="text-lg font-bold">Shift details</h2><CapacityMeter booked={booked} needed={shift.marshalsNeeded} /></div>
    </div>
    <ShiftFacts shift={shift} />
    <div className="demo-brief-section"><h3>Arrival and travel</h3><p>{shift.arrival}</p><p>{shift.travel}</p></div>
    <div className="demo-brief-section"><h3>Duties</h3><p>{shift.duties}</p></div>
    <div className="demo-brief-section"><h3>Experience / notes</h3><p>{shift.experience}</p></div>
  </Card>;
}

function Contact({ person, managerView = false }: { person?: typeof manager; managerView?: boolean }) {
  if (!person) return <ContactCard released={false} title="Contact" body="Contact details are released only when the manager books this marshal." />;
  return <ContactCard released title={CONTACT_RELEASED_HEADING} body={managerView ? CONTACT_RELEASED_BODY_MANAGER : CONTACT_RELEASED_BODY_MARSHAL}
    items={[{ label: managerView ? "Booked marshal" : "Location manager", value: person.name }, { label: "Phone", value: person.phone }, { label: "Email", value: person.email }]} />;
}

function ProfileFacts({ person }: { person: (typeof profiles)[keyof typeof profiles] }) {
  return <>
    <div className="mb-4"><Kicker>Experience summary</Kicker><p className="mt-1 text-sm">{person.experience.join(" ")}</p></div>
    <div className="demo-profile-facts"><DL items={[{ label: "Base location", value: person.base }, { label: "Transport", value: person.transport },
      { label: "Travel radius", value: `${person.radius} miles` }, { label: "Availability", value: person.availability }]} /></div>
    <div className="demo-brief-section"><h3>Setru work history</h3><p>{person.completedCount
      ? `Managers have confirmed ${person.completedCount} completed shifts through Setru.` : "No completed shifts recorded on Setru yet."}</p></div>
  </>;
}

function Booking({ shift, application, applications, managerView = false }: Omit<DetailProps, "act"> & {
  application: Application; managerView?: boolean;
}) {
  const person = profiles[application.marshal];
  const r = roster(shift, applications);
  return <>
    <Back href={managerView ? `#manager/${shift.id}` : "#marshal/dashboard"}>{managerView ? "Back to applicants" : "My dashboard"}</Back>
    <PageHeader kicker="Booking confirmed" title={shift.productionName} subtitle={`${person.name} · ${formatDate(shift.startDate)}`}
      action={<div className="flex flex-wrap items-center gap-3"><ShiftStatusBadge status={r.status} /><CapacityMeter booked={r.booked} needed={shift.marshalsNeeded} /></div>} />
    <div className="grid items-start gap-3 md:grid-cols-2">
      <Card>
        <h2 className="mb-3 text-lg font-bold">Call and arrival</h2>
        <div className="flex gap-8"><div><Kicker>Call</Kicker><p className="text-2xl font-bold tabular-nums">{shift.dailyStartTime}</p></div>
          <div><Kicker>Wrap</Kicker><p className="text-2xl font-bold tabular-nums">{shift.dailyEndTime}</p></div></div>
        <div className="demo-brief-section"><h3>{shift.location}</h3><p>{shift.arrival}</p><p>{shift.travel}</p></div>
      </Card>
      <Contact person={managerView ? person : manager} managerView={managerView} />
    </div>
    {managerView && <p className="mt-4 text-sm font-semibold">
      {r.open ? "One place is still open." : "All places are booked."} <a className="underline" href="#marshal/dashboard">View Kit’s dashboard</a>
    </p>}
    {managerView && <details className="demo-more mt-4">
      <summary>{person.name}’s application</summary>
      <p className="mb-1 font-bold">Cover note</p><p className="mb-4">{application.coverNote}</p>
      <ProfileFacts person={person} />
    </details>}
    <details className="demo-more mt-4">
      <summary>Shift duties and rate</summary>
      <p className="mb-2 font-bold">{formatRate(shift.rate, shift.rateUnit)}</p>
      <p>{shift.duties}</p>
    </details>
  </>;
}

export function MarshalShift({ shift, applications, act }: DetailProps) {
  const r = roster(shift, applications);
  const own = r.entries.find(a => a.marshal === "kit");
  if (own?.status === "ACCEPTED") return <Booking shift={shift} application={own} applications={applications} />;
  const outcome = own && marshalApplicationOutcome(own.status, r);
  return <>
    <Back href="#marshal">Back to open shifts</Back>
    <PageHeader title={shift.productionName} subtitle={`${shift.unit} · ${company}`} action={<ShiftStatusBadge status={r.status} />} />
    <div className="demo-detail">
      <div className="min-w-0 space-y-3">
        {outcome && <Card variant="highlight"><StatusBadge label={outcome.label} tone={outcome.tone} /><p className="mt-2 text-sm">{outcome.detail}</p></Card>}
        <Brief shift={shift} booked={r.booked} />
        {(own || r.open) && <Card><Kicker>{own ? "Your cover note" : "Kit’s sample cover note"}</Kicker><p className="mt-2 text-sm">{own?.coverNote ?? shift.note}</p></Card>}
        <Contact />
      </div>
      {!own && r.open && <aside className="demo-decision">
        <div className="demo-decision-context"><h2>Apply for this shift</h2><p>{shift.productionName} · {shift.dailyStartTime}–{shift.dailyEndTime}</p></div>
        <Button className="w-full" onClick={() => { act({ type: "apply", shift: shift.id, marshal: "kit" }); window.location.hash = "marshal/dashboard"; }}>Apply as Kit Mercer</Button>
      </aside>}
    </div>
  </>;
}

export function ManagerShift({ shift, applications }: Omit<DetailProps, "act">) {
  const r = roster(shift, applications);
  return <>
    <Back href="#manager">Production dashboard</Back>
    <PageHeader title={shift.productionName} subtitle={`${shift.location} · ${shift.dailyStartTime}–${shift.dailyEndTime}`} action={<ShiftStatusBadge status={r.status} />} />
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <Card variant="highlight">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-bold">Review applicants</h2><CapacityMeter booked={r.booked} needed={shift.marshalsNeeded} /></div>
        {r.entries.length === 0 && <p className="text-sm text-ink-muted">No applications yet. Apply in Marshal view to see the profile here.</p>}
        {r.entries.map(a => {
          const person = profiles[a.marshal];
          const outcome = marshalApplicationOutcome(a.status, r);
          return <a key={a.marshal} href={`#manager/${shift.id}/${a.marshal}`} className="block border-t border-line py-3 last:pb-0 hover:text-coral-ink">
            <div className="flex items-center justify-between gap-2"><strong>{person.name}</strong><Icon name="chevron" className="size-4 shrink-0 text-coral-ink" /></div>
            <p className="mt-0.5 text-sm text-ink-muted">{person.base} · {person.transport}</p>
            {r.open && a.status === "APPLIED" && <p className="mt-1 text-sm">{person.experience[0]}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              {r.open && a.status === "APPLIED" ? <ApplicationStatusBadge status={a.status} /> : <StatusBadge label={outcome.label} tone={outcome.tone} />}
              <span className="text-xs text-ink-muted">{person.completedCount ? `${person.completedCount} completed through Setru` : "No completed Setru shifts yet"}</span>
            </div>
          </a>;
        })}
      </Card>
      <Brief shift={shift} booked={r.booked} />
    </div>
  </>;
}

export function Applicant({ shift, application, applications, act }: DetailProps & { application: Application }) {
  const r = roster(shift, applications);
  const person = profiles[application.marshal];
  if (application.status === "ACCEPTED") return <Booking shift={shift} application={application} applications={applications} managerView />;
  const outcome = marshalApplicationOutcome(application.status, r);
  return <>
    <Back href={`#manager/${shift.id}`}>Back to applicants</Back>
    <PageHeader kicker="Applicant" title={person.name} subtitle={`${shift.productionName} · ${shift.dailyStartTime} call`}
      action={r.open ? <ApplicationStatusBadge status={application.status} /> : <StatusBadge label={outcome.label} tone={outcome.tone} />} />
    <div className="demo-detail">
      <div className="min-w-0 space-y-3">
        <Card variant="highlight"><Kicker>Cover note · {shift.productionName}</Kicker><p className="mt-2 text-base">{application.coverNote}</p></Card>
        <Card><h2 className="mb-3 text-lg font-bold">Marshal profile</h2><ProfileFacts person={person} /></Card>
        <Contact />
      </div>
      {r.open ? <aside className="demo-decision">
        <div className="demo-decision-context"><h2>Booking decision</h2><CapacityMeter booked={r.booked} needed={shift.marshalsNeeded} /></div>
        <ConfirmButton action={async () => act({ type: "accept", shift: shift.id, marshal: application.marshal })}
          triggerLabel={`Accept and book ${person.name.split(" ")[0]}`} title={CONFIRM_ACCEPT_TITLE}
          description={<><strong>{person.name} · {shift.productionName}</strong><p className="mt-2">{confirmAcceptBody(r.booked, shift.marshalsNeeded)}</p></>}
          confirmLabel={CONFIRM_ACCEPT_ACTION} />
      </aside> : <Card><h2 className="font-bold">All places are booked</h2><p className="mt-1 text-sm">{person.name} can be reviewed again if a place reopens.</p></Card>}
    </div>
  </>;
}
