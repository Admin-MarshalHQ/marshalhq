import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/db";
import { Card, PageHeader } from "@/components/ui";
import MarshalProfileForm from "./MarshalProfileForm";

export default async function EditMarshalProfilePage() {
  const user = await requireRole("MARSHAL");
  const profile = await prisma.marshalProfile.findUnique({
    where: { userId: user.id },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={profile ? "Edit profile" : "Create your marshal profile"}
        subtitle="Visible to managers when you apply. Contact details are never shown here."
      />
      <Card>
        <MarshalProfileForm profile={profile} />
      </Card>
    </div>
  );
}
