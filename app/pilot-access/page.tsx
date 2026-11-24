import Link from "next/link";
import { PageHeader } from "@/components/ui";

export default function PilotAccessPage() {
  return <div className="mx-auto max-w-xl">
    <PageHeader title="Pilot access is by invitation" subtitle="Your account is registered. Hiring access requires a separate invitation. You can explore sample shifts in the public demo." />
    <Link className="underline" href="/support">Contact support about pilot access</Link>
  </div>;
}
