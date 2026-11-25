import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { Card, PageHeader } from "@/components/ui";
import SupportForm from "./SupportForm";

export const metadata: Metadata = { title: "Support" };

export default async function SupportPage() {
  const session = await auth();
  const loggedInEmail = session?.user?.email ?? null;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Contact Setru"
        subtitle="Account help, shift or booking issues, privacy or deletion requests, and trust or safety concerns."
      />
      <Card>
        <p className="mb-4 text-sm text-ink-muted">
          Ask us to check a booking, correct your record, exercise a privacy right or make a complaint. For a booking dispute, a shift reference, call date and a short description are enough to open a case. For immediate danger, contact the on-site safety lead or emergency services. Please leave out ID documents and other people’s contact details.
        </p>
        <SupportForm loggedInEmail={loggedInEmail} />
      </Card>
      <p className="mt-4 text-xs text-ink-soft">
        See{" "}
        <Link href="/privacy" className="underline">
          how we handle privacy and deletion requests
        </Link>
        .
      </p>
    </div>
  );
}
