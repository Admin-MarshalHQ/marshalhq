"use client";

import { useEffect, useRef, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { Icon } from "@/components/Icon";
import { Applicant, ManagerDashboard, ManagerShift, Marketplace, MarshalDashboard, MarshalShift } from "./Screens";
import { initialApplications, makeShifts, transition, type Action, type Application } from "./model";

export default function DemoWorkspace({ firstDay }: { firstDay: string }) {
  const [path, setPath] = useState("");
  const [moves, setMoves] = useState<Action[]>([]);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const screen = useRef<HTMLDivElement>(null);
  const storageKey = `setru-demo-v1:${firstDay.slice(0, 10)}`;
  const shifts = makeShifts(firstDay);
  const applications = moves.reduce<Application[]>(transition, initialApplications);

  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(sessionStorage.getItem(storageKey) || "[]");
      if (Array.isArray(saved)) setMoves(saved.slice(0, 2 * shifts.length));
    } catch { /* Private browsing can disable storage. In-memory actions still work. */ }
    setPath(window.location.hash.slice(1));
    setReady(true);
    function navigate() {
      setPath(window.location.hash.slice(1));
      setNotice("");
      screen.current?.focus({ preventScroll: true });
      window.scrollTo(0, 0);
    }
    window.addEventListener("hashchange", navigate);
    return () => window.removeEventListener("hashchange", navigate);
  }, [storageKey, shifts.length]);

  useEffect(() => {
    if (ready) {
      try { sessionStorage.setItem(storageKey, JSON.stringify(moves)); } catch { /* In-memory fallback. */ }
    }
  }, [moves, ready, storageKey]);

  function act(move: Action) {
    setMoves(previous => {
      const current = previous.reduce<Application[]>(transition, initialApplications);
      return transition(current, move) === current ? previous : [...previous, move];
    });
    if (move.type === "accept") {
      window.requestAnimationFrame(() => {
        screen.current?.focus({ preventScroll: true });
        window.scrollTo(0, 0);
      });
    }
  }

  function reset() {
    setMoves([]);
    window.history.replaceState(window.history.state, "", window.location.pathname);
    setPath("");
    setNotice("Demo reset. The sample shifts are ready to explore again.");
    window.scrollTo(0, 0);
  }

  const [role, section, person] = path.split("/");
  const managerView = role === "manager";
  const shift = shifts.find(s => s.id === section);
  const application = shift && applications.find(a => a.shift === shift.id && a.marshal === person);
  const dashboard = !managerView && section === "dashboard";
  const listProps = { shifts, applications };
  const lastMove = moves[moves.length - 1];
  const hint = dashboard && lastMove?.type === "apply" ? "Switch to Manager view to review Kit’s application." : "";
  return <div className="setru-demo">
    <header className="demo-masthead"><div className="demo-width flex min-h-14 items-center justify-between gap-2">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3">
        <a href="/" aria-label="Setru home" className="brand-link"><BrandLogo alt="" /></a>
        <span className="demo-sample">Demo · sample data</span>
      </div>
      <a className="demo-waitlist" href="/#waitlist">Join the waitlist</a>
    </div></header>
    <div className="demo-toolbar"><div className="demo-width flex min-h-16 items-center justify-between gap-2">
      <nav aria-label="Demo role" className="demo-roles">
        <a href={managerView ? "#marshal/dashboard" : (path ? `#${path}` : "#marshal")} aria-current={!managerView ? "true" : undefined}>Marshal view</a>
        <a href={managerView ? `#${path}` : "#manager"} aria-current={managerView ? "true" : undefined}>Manager view</a>
      </nav>
      <button type="button" className="demo-reset" onClick={reset}>Reset demo</button>
    </div></div>
    <div className="demo-width pb-6">
      {!shift && <nav aria-label="Demo workspace" className="demo-nav">
        {managerView ? <a href="#manager" aria-current={!shift ? "page" : undefined}><Icon name="home" />Production dashboard</a> : <>
          <a href="#marshal" aria-current={!dashboard && !shift ? "page" : undefined}><Icon name="calendar" />Find shifts</a>
          <a href="#marshal/dashboard" aria-current={dashboard ? "page" : undefined}><Icon name="home" />My dashboard</a>
        </>}
      </nav>}
      <div role="status" aria-live="polite">{(notice || hint) && <p className="demo-notice">{notice || hint}</p>}</div>
      <div ref={screen} tabIndex={-1} className="demo-screen">
        {managerView ? (
          shift ? (application ? <Applicant shift={shift} application={application} applications={applications} act={act} />
            : <ManagerShift shift={shift} applications={applications} />) : <ManagerDashboard {...listProps} />
        ) : shift ? <MarshalShift shift={shift} applications={applications} act={act} />
          : dashboard ? <MarshalDashboard {...listProps} /> : <Marketplace {...listProps} />}
      </div>
    </div>
  </div>;
}
