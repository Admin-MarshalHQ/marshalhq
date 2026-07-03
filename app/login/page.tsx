import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import LoginForm from "./LoginForm";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; reset?: string; verified?: string };
}) {
  const next = searchParams?.next ?? "/";
  const resetSuccess = searchParams?.reset === "1";
  const verifiedSuccess = searchParams?.verified === "1";
  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Log in" />
      <Card>
        <LoginForm
          next={next}
          resetSuccess={resetSuccess}
          verifiedSuccess={verifiedSuccess}
        />
      </Card>
      <p className="mt-4 text-center text-sm text-ink-muted">
        Looking for access?{" "}
        <Link href="/#waitlist" className="text-accent underline">
          Join the waitlist
        </Link>
      </p>
    </div>
  );
}
