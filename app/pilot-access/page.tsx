import Link from "next/link";
import { PageHeader } from "@/components/ui";

export default function PilotAccessPage() {
  return <div className="mx-auto max-w-xl">
    <PageHeader title="Pilot access is by invitation" subtitle="Your account is registered. Setru is testing real shifts with a small group of invited managers and marshals." />
    <Link className="underline" href="/support">Contact support about pilot access</Link>
  </div>;
}
