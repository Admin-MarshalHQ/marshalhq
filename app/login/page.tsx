import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import LoginForm from "./LoginForm";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; reset?: string };
}) {
  const next = searchParams?.next ?? "/";
  const resetSuccess = searchParams?.reset === "1";
  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Log in" />
      <Card>
        <LoginForm next={next} resetSuccess={resetSuccess} />
      </Card>
      <p className="mt-4 text-center text-sm text-ink-muted">
        New here?{" "}
        <Link href="/signup" className="text-accent underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
