import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { invitedRole } from "@/lib/pilot-participant";
import { saveNotice } from "@/lib/notify";
import { pilotDocuments } from "@/lib/pilot-documents";

export function acknowledgedDocuments(form: FormData) {
  const docs = pilotDocuments();
  if (!docs || form.get("agreeTerms") !== "yes" || form.get("receiveNotice") !== "yes" ||
      form.get("termsVersion") !== docs.termsVersion || form.get("noticeVersion") !== docs.noticeVersion) return null;
  return docs;
}

export async function hasPilotAgreement(userId: string, role: "MANAGER" | "MARSHAL", db: Prisma.TransactionClient = prisma) {
  const docs = pilotDocuments();
  if (!docs) return false;
  const member = await db.user.findFirst({ where: { id: userId, role, disabledAt: null, emailVerifiedAt: { not: null },
    pilotAgreements: { some: { role, termsVersion: docs.termsVersion, noticeVersion: docs.noticeVersion } } },
    select: { email: true } });
  return member !== null && invitedRole(member.email) === role;
}

export async function recordAgreement(tx: Prisma.TransactionClient, userId: string, role: string, docs: NonNullable<ReturnType<typeof pilotDocuments>>) {
  const result = await tx.pilotAgreement.createMany({ data: { userId, role, ...docs }, skipDuplicates: true });
  if (!result.count) return null;
  return saveNotice(tx, { userId, kind: "PILOT_AGREEMENT", subject: "Your Setru pilot terms and privacy notice",
    body: `Your accepted ${role.toLowerCase()} terms and acknowledged privacy notice follow. Keep this copy.

${docs.terms}

${docs.notice}`,
    link: "/pilot/agreement" });
}
