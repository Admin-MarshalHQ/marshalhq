import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ButtonLink } from "@/components/ui";

export default async function Landing() {
  const session = await auth();
  if (session?.user?.id) {
    if (session.user.role === "MANAGER") redirect("/manager");
    if (session.user.role === "MARSHAL") redirect("/marshal");
  }
  return (
    <div className="mx-auto max-w-3xl py-10">
      <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        Hire location marshals you can trust.
      </h1>
      <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-muted">
        MarshalHQ is a focused staffing tool for UK film and television
        productions. Post a shift, review credible applicants, and release
        contact details only after you have confirmed the booking. No noise, no
        marketplace clutter.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <ButtonLink href="/signup">Create an account</ButtonLink>
        <ButtonLink href="/login" variant="secondary">
          Log in
        </ButtonLink>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2">
        <div className="rounded-md border border-line bg-white p-5">
          <h2 className="text-base font-semibold text-ink">
            For production managers
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            Post a structured shift, compare applicants side by side, and
            confirm one marshal. Contact details are released the moment you
            accept.
          </p>
        </div>
        <div className="rounded-md border border-line bg-white p-5">
          <h2 className="text-base font-semibold text-ink">For marshals</h2>
          <p className="mt-2 text-sm text-ink-muted">
            Build a credible profile, apply to relevant shifts, and start a
            verified track record of completed work.
          </p>
        </div>
      </div>

      <p className="mt-10 text-xs text-ink-soft">
        By using MarshalHQ you agree to our{" "}
        <Link href="/terms" className="underline">
          Terms
        </Link>
        ,{" "}
        <Link href="/privacy" className="underline">
          Privacy
        </Link>
        , and{" "}
        <Link href="/rules" className="underline">
          Platform rules
        </Link>
        .
      </p>
    </div>
  );
}
