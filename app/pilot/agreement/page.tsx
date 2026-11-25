import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import { PilotAgreementForm } from "@/components/PilotAgreementForm";
import { PilotDocuments } from "@/components/PilotDocuments";
import { requireUser } from "@/lib/access";
import { prisma } from "@/lib/db";
import { admissionOpen, pilotDocuments } from "@/lib/pilot-documents";
import { invitedRole } from "@/lib/pilot-participant";

export default async function AgreementPage() {
  const user = await requireUser();
  const docs = pilotDocuments();
  const receipts = await prisma.pilotAgreement.findMany({ where:{userId:user.id}, orderBy:{acceptedAt:"desc"},
    select:{id:true,role:true,acceptedAt:true,termsVersion:true,noticeVersion:true} });
  const current = receipts.some(r => r.role === user.role && r.termsVersion === docs?.termsVersion && r.noticeVersion === docs?.noticeVersion);
  const invited = !!user.emailVerifiedAt && invitedRole(user.email) === user.role;
  return <div className="mx-auto max-w-2xl space-y-4">
    <PageHeader title="Your pilot agreement" />
    {current && <Card>Your current agreement is recorded. <Link className="underline" href={user.role === "MANAGER" ? "/manager" : "/marshal"}>Open your dashboard</Link></Card>}
    {!current && (invited && admissionOpen() && docs ? <Card><PilotDocuments {...docs} /><PilotAgreementForm termsVersion={docs.termsVersion} noticeVersion={docs.noticeVersion} /></Card> :
      <p>New pilot activity requires a cleared invitation. You can still access previous copies and <Link className="underline" href="/support">contact Support</Link>.</p>)}
    {receipts.map(r=><Card key={r.id}><a className="underline" href={`/pilot/agreement/${r.id}/download`}>Download your terms and privacy notice</a><p className="text-sm">{r.role === "MANAGER" ? "Manager" : "Marshal"} · {r.acceptedAt.toISOString().slice(0,10)}</p></Card>)}
  </div>;
}
