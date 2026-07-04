"use client";

import Link from "next/link";
import { Button } from "@/components/ui";

// Root error boundary. Calm, operational copy — nothing the user did is
// lost; workflow state lives on the server.
export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-soft">
        Something went wrong
      </p>
      <h1 className="mt-2 font-serif text-2xl text-ink">
        That didn&rsquo;t load properly
      </h1>
      <p className="mt-2 text-sm text-ink-muted">
        Nothing has been lost — your shifts and applications are safe. Try
        again, and if it keeps happening,{" "}
        <Link href="/support" className="underline">
          contact support
        </Link>
        .
      </p>
      <div className="mt-5">
        <Button onClick={() => reset()}>Try again</Button>
      </div>
    </div>
  );
}
