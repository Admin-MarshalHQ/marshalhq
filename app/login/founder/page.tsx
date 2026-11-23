import type { Metadata } from "next";
import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import FounderLoginForm from "./FounderLoginForm";

export const metadata: Metadata = { title: "Founder login" };

export default function FounderLoginPage({ searchParams }: { searchParams: { next?: string } }) {
  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Founder login" subtitle="Sign in with a one-time code sent to your email." />
      <Card>
        <FounderLoginForm next={searchParams.next ?? "/founder"} />
      </Card>
      <p className="mt-4 text-center text-sm">
        <Link href="/login" className="shell-link text-coral-ink">
          Back to log in
        </Link>
      </p>
    </div>
  );
}
