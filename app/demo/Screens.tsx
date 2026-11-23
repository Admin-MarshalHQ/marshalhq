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
import { company, manager, profiles, roster, type Action, type Application, type DemoShift } from "./model";

type ListProps = { shifts: DemoShift[]; applications: Application[] };
type DetailProps = { shift: DemoShift; applications: Application[]; act: (move: Action) => void };
const sectionTitle = "mb-3 text-xl font-bold tracking-tight";

function Back({ href, children }: { href: string; children: React.ReactNode }) {
  return <a className="mb-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-ink-muted hover:text-coral-ink" href={href}><Icon name="back" className="size-4" />{children}</a>;
}

export function Marketplace({ shifts, applications }: ListProps) {
  const openShifts = shifts.filter(s => roster(s, applications).open);
  return <>
    <PageHeader title="Available shifts" subtitle="Find location marshal work in UK film and TV." />
    {openShifts.length ? <ul className="grid items-start gap-4 md:grid-cols-2">
      {openShifts.map(s => <ShiftListing key={s.id} shift={s} byline={s.unit}
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
    <div className="mb-4 flex items-center gap-3"><DateBlock date={shift.startDate} />
      <div><h2 className="text-lg font-bold">Shift details</h2><CapacityMeter booked={booked} needed={shift.marshalsNeeded} /></div>
    </div>
    <ShiftFacts shift={shift} />
    {[["Duties", shift.duties], ["Parking / travel", shift.travel], ["Experience / notes", shift.experience]].map(([label, value]) =>
      <div key={label} className="mt-4 border-t border-line pt-3"><h3 className="mb-1 font-bold">{label}</h3><p className="text-sm">{value}</p></div>)}
  </Card>;
}

function Contact({ person, managerView = false }: { person?: typeof manager; managerView?: boolean }) {
  if (!person) return <ContactCard released={false} title="Contact" body="Contact details are released only when a manager accepts the application." />;
  return <ContactCard released title={CONTACT_RELEASED_HEADING} body={managerView ? CONTACT_RELEASED_BODY_MANAGER : CONTACT_RELEASED_BODY_MARSHAL}
    items={[{ label: managerView ? "Marshal" : "Location manager", value: person.name }, { label: "Email", value: person.email }, { label: "Phone", value: person.phone }]} />;
}

export function MarshalShift({ shift, applications, act }: DetailProps) {
  const r = roster(shift, applications);
  const own = r.entries.find(a => a.marshal === "kit");
  const outcome = own && marshalApplicationOutcome(own.status, r);
  return <>
    <Back href="#marshal">Back to open shifts</Back>
    <PageHeader title={shift.productionName} subtitle={`${shift.unit} · ${company}`} action={<ShiftStatusBadge status={r.status} />} />
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <Brief shift={shift} booked={r.booked} />
      <div className="space-y-3">
        <Card variant="highlight">
          {outcome ? <>
            <StatusBadge label={outcome.label} tone={outcome.tone} />
            <p className="my-3 text-sm">{outcome.detail}</p>
            <ButtonLink href="#marshal/dashboard" variant="secondary">My dashboard</ButtonLink>
          </> : r.open ? <>
            <h2 className="text-lg font-bold">Apply for this shift</h2>
            <p className="mt-1 text-sm text-ink-muted">Apply with Kit Mercer’s sample profile.</p>
            <div className="my-3 rounded-md bg-surface-sunken p-3 text-sm"><Kicker>Cover note</Kicker><p className="mt-1">{shift.note}</p></div>
            <Button className="w-full" onClick={() => { act({ type: "apply", shift: shift.id, marshal: "kit" }); window.location.hash = "marshal/dashboard"; }}>Apply as Kit Mercer</Button>
          </> : <p className="text-sm">This shift is filled.</p>}
        </Card>
        <Contact person={own?.status === "ACCEPTED" ? manager : undefined} />
      </div>
    </div>
  </>;
}

export function ManagerShift({ shift, applications }: Omit<DetailProps, "act">) {
  const r = roster(shift, applications);
  return <>
    <Back href="#manager">Production dashboard</Back>
    <PageHeader title={shift.productionName} subtitle={`${shift.location} · ${shift.dailyStartTime}–${shift.dailyEndTime}`} action={<ShiftStatusBadge status={r.status} />} />
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <Card variant="highlight"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-bold">Review applicants</h2><CapacityMeter booked={r.booked} needed={shift.marshalsNeeded} /></div>
        {r.entries.length === 0 && <p className="text-sm text-ink-muted">No applications yet. Apply in Marshal view to see the profile here.</p>}
        {r.entries.map(a => <a key={a.marshal} href={`#manager/${shift.id}/${a.marshal}`} className="flex min-h-14 items-center justify-between gap-2 border-t border-line py-3 hover:text-coral-ink">
          <span><strong>{profiles[a.marshal].name}</strong><span className="block text-sm text-ink-muted">{profiles[a.marshal].base}</span></span>
          <span className="flex items-center gap-1"><ApplicationStatusBadge status={a.status} /><Icon name="chevron" className="size-4" /></span></a>)}
      </Card><Brief shift={shift} booked={r.booked} />
    </div>
  </>;
}

export function Applicant({ shift, application, applications, act }: DetailProps & { application: Application }) {
  const r = roster(shift, applications);
  const person = profiles[application.marshal];
  const accepted = application.status === "ACCEPTED";
  return <>
    <Back href={`#manager/${shift.id}`}>Back to applicants</Back>
    <PageHeader kicker="Applicant" title={person.name} subtitle={`Applying for ${shift.productionName}`} action={<ApplicationStatusBadge status={application.status} />} />
    <div className="grid items-start gap-4 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      <Card><DL items={[{ label: "Base", value: person.base }, { label: "Travel", value: person.travel }, { label: "Availability", value: "Actively looking" }]} />
        <div className="mt-4 border-t border-line pt-3"><Kicker>Experience summary</Kicker><p className="mt-1 text-sm">{person.experience}</p></div>
        {application.marshal === "kit" && <div className="mt-4 border-t border-line pt-3"><Kicker>Cover note</Kicker><p className="mt-1 text-sm">{shift.note}</p></div>}
      </Card>
      <div className="space-y-3"><Card variant="highlight"><Kicker>Decision</Kicker>
        <div className="my-3 flex flex-wrap items-center gap-3"><CapacityMeter booked={r.booked} needed={shift.marshalsNeeded} /><ShiftStatusBadge status={r.status} /></div>
        {accepted ? <p className="text-sm font-semibold">{person.name} is booked for {shift.dailyStartTime}.</p> : r.open ?
          <ConfirmButton action={async () => act({ type: "accept", shift: shift.id, marshal: application.marshal })} triggerLabel="Accept and book this marshal"
            title={CONFIRM_ACCEPT_TITLE} description={confirmAcceptBody(r.booked, shift.marshalsNeeded)} confirmLabel={CONFIRM_ACCEPT_ACTION} />
          : <p className="text-sm">All places are booked.</p>}
      </Card><Contact person={accepted ? person : undefined} managerView /></div>
    </div>
  </>;
}
