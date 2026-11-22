import type { Metadata } from "next";
import { Icon } from "@/components/Icon";
import { ButtonLink, Card, PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Waitlist request received – MarshalHQ",
  description: "Your MarshalHQ waitlist request has been received.",
};

export default function EarlyAccessThanksPage() {
  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="You’re on the waitlist" />
      <Card className="space-y-4">
        <span className="grid size-11 place-items-center rounded-md bg-ok-soft text-ok">
          <Icon name="check" />
        </span>
        <p>We’ve received your waitlist request. We’ll get in touch as beta access opens up.</p>
        <ButtonLink href="/">Back to home</ButtonLink>
      </Card>
    </div>
  );
}
