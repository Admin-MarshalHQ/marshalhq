import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { Card, PageHeader } from "@/components/ui";
import ManagerProfileForm from "./ManagerProfileForm";

export default async function EditManagerProfilePage() {
  const user = await requireRole("MANAGER");
  const account = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      phone: true,
      managerProfile: {
        select: { companyName: true, displayName: true },
      },
    },
  });
  if (!account?.managerProfile) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        kicker="Manager profile"
        back={{ href: "/manager", label: "Back to dashboard" }}
        title="Edit profile"
        subtitle="Marshals see your company and name on shifts. Contact details release only after a booking is confirmed."
      />
      <Card>
        <ManagerProfileForm
          companyName={account.managerProfile.companyName}
          displayName={account.managerProfile.displayName}
          phone={account.phone}
        />
      </Card>
    </div>
  );
}
