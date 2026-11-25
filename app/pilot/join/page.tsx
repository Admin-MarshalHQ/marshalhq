import Link from "next/link";
import { PageHeader, Card } from "@/components/ui";
import { JoinCodeForm, PilotAgreementForm } from "@/components/PilotAgreementForm";
import { PilotDocuments } from "@/components/PilotDocuments";
import { admissionOpen, pilotDocuments } from "@/lib/pilot-documents";

export const metadata = { title: "Private pilot invitation", robots: {index:false,follow:false} };
export default function JoinPilot() {
  const docs = pilotDocuments();
  if (!admissionOpen() || !docs) return <><PageHeader title="Private pilot admission is paused" /><Link href="/login">Log in to an existing account</Link></>;
  return <div className="mx-auto max-w-2xl space-y-4"><PageHeader title="Your private pilot invitation" subtitle="Use the email address and role agreed with the operator. Already have an account? Log in to review the pilot terms." />
    <Link className="underline" href="/login?next=/pilot/agreement">Log in to an existing account</Link>
    <PilotDocuments {...docs} />
    <Card><JoinCodeForm /></Card>
    <Card><h2 className="mb-3 font-semibold">Register with your code</h2><PilotAgreementForm register termsVersion={docs.termsVersion} noticeVersion={docs.noticeVersion} /></Card>
  </div>;
}
