import Link from "next/link";
import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-soft">
        404
      </p>
      <h1 className="mt-2 font-serif text-2xl text-ink">
        This page doesn&rsquo;t exist
      </h1>
      <p className="mt-2 text-sm text-ink-muted">
        The link may be old, or the shift or application it pointed to has
        moved on. If you followed a notification here,{" "}
        <Link href="/notifications" className="underline">
          check your inbox
        </Link>{" "}
        for the current state.
      </p>
      <div className="mt-5">
        <ButtonLink href="/">Go to MarshalHQ</ButtonLink>
      </div>
    </div>
  );
}
