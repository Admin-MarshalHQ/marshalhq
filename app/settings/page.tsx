import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, DL, Kicker, PageHeader } from "@/components/ui";
import { formatPhone } from "@/lib/phone";
import PhoneForm from "./PhoneForm";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      phone: true,
      role: true,
      createdAt: true,
    },
  });
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        kicker="Account"
        title="Your account"
        subtitle="Your login details and contact phone. Contact details release only after a booking is confirmed."
      />
      <Card>
        <DL
          items={[
            { label: "Email", value: user.email },
            {
              label: "Phone",
              value: (
                <span>
                  {formatPhone(user.phone)}{" "}
                  <span className="text-xs text-ink-soft">
                    (released after a booking is confirmed)
                  </span>
                </span>
              ),
            },
            {
              label: "Role",
              value: user.role === "MANAGER" ? "Production manager" : user.role === "MARSHAL" ? "Location marshal" : "Not set",
            },
            {
              label: "Member since",
              value: user.createdAt.toLocaleDateString("en-GB"),
            },
          ]}
        />
      </Card>
      <Card className="mt-4">
        <Kicker className="mb-3">Contact phone</Kicker>
        <PhoneForm phone={user.phone} />
      </Card>
      <Card className="mt-4" variant="sunken">
        <Kicker className="mb-1">Help, privacy, and deletion</Kicker>
        <p className="text-sm text-ink-muted">
          To reset your password, change contact details, or request account
          deletion, use{" "}
          <Link href="/support" className="text-accent underline">
            support
          </Link>
          . Privacy and deletion requests are reviewed manually so that shift,
          application, and completion history stays intact for the people
          you&rsquo;ve worked with.
        </p>
      </Card>
    </div>
  );
}
