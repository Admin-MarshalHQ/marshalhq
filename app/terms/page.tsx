import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Terms of use" };

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Terms of use" />
      <div className="prose-plain max-w-none text-[15px]">
        <p>Setru is in development for UK film and TV locations teams. Anyone can explore the <Link href="/demo">public demo</Link>. Its people and vacancies are examples. Applying or accepting there creates no real booking.</p>
        <h2>Using Setru</h2>
        <p>Use your own account, keep your sign-in details private and provide accurate information. Use Support to report an account problem. Follow the <Link href="/rules">platform rules</Link> when posting content or handling someone else’s details.</p>
        <h2>Hiring access</h2>
        <p>A waitlist entry or account does not guarantee access, work or a filled shift. The planned first pilot is free to both sides and limited to one authorised direct hirer in Great Britain. The hirer will engage, supervise and pay marshals directly.</p>
        <p>Before a real booking, the hirer and marshal need the identity of the engager, the work, hours, rate, pay arrangements and cancellation terms. A manager must have authority from the hirer. Accepting a place can have contractual consequences.</p>
        <h2>Problems and complaints</h2>
        <p>Use <Link href="/support">Support</Link> to report misuse or challenge a decision. These terms do not limit your statutory rights. The <Link href="/privacy">privacy notice</Link> explains how to ask about information Setru holds.</p>
      </div>
    </div>
  );
}
