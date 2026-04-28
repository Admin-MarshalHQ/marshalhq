import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import ForgotForm from "./ForgotForm";

export default function ForgotPage() {
  return (
    <div className="mx-auto max-w-md">
      <PageHeader
        title="Reset your password"
        subtitle="We'll email you a single-use link that expires in 1 hour."
      />
      <Card>
        <ForgotForm />
      </Card>
      <p className="mt-4 text-center text-sm text-ink-muted">
        Remembered it?{" "}
        <Link href="/login" className="text-accent underline">
          Back to log in
        </Link>
      </p>
    </div>
  );
}
