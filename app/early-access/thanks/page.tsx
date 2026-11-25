import { redirect } from "next/navigation";
import { intakeHeld } from "@/lib/intake";
import type { Metadata } from "next";
import { WAITLIST_NEXT_STEP } from "@/lib/copy";
import { Icon } from "@/components/Icon";
import { ButtonLink, Card, PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Waitlist request received",
  description: "Your Setru waitlist request has been received.",
};

export default function EarlyAccessThanksPage() {
  if (intakeHeld()) redirect("/#waitlist");
  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="You’re on the waitlist" />
      <Card className="space-y-4">
        <span className="grid size-11 place-items-center rounded-md bg-ok-soft text-ok">
          <Icon name="check" />
        </span>
        <p>{WAITLIST_NEXT_STEP}</p>
        <ButtonLink href="/">Back to home</ButtonLink>
      </Card>
    </div>
  );
}
