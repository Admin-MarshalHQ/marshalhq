import { requireUser } from "@/lib/access";
import { prisma } from "@/lib/db";

export async function GET(_request: Request, {params}: {params:{id:string}}) {
  const user = await requireUser();
  const record = await prisma.pilotAgreement.findFirst({where:{id:params.id,userId:user.id}});
  if (!record) return new Response(null,{status:404,headers:{"Cache-Control":"private, no-store"}});
  const text = `Setru pilot participant copy\nRole: ${record.role}\nAccepted: ${record.acceptedAt.toISOString()}\nTerms version: ${record.termsVersion}\nPrivacy notice acknowledged: ${record.noticeVersion}\n\n${record.terms}\n\n${record.notice}\n`;
  return new Response(text,{headers:{"Content-Type":"text/plain; charset=utf-8","Content-Disposition":'attachment; filename="Setru-pilot-agreement.txt"',"Cache-Control":"private, no-store"}});
}
