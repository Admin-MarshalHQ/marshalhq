import { PageHeader } from "@/components/ui";

export default function Rules() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Platform rules" />
      <div className="prose-plain max-w-none text-[15px]">
        <p>
          MarshalHQ is deliberately narrow. These rules keep the hiring loop
          trustworthy for everyone using it.
        </p>
        <ol className="ml-5 list-decimal space-y-2">
          <li>
            Post only real shifts. Cancel them promptly if plans change.
          </li>
          <li>
            Apply only to shifts you can genuinely complete. Withdraw early
            if circumstances change.
          </li>
          <li>
            One accepted marshal per shift. Don’t bypass the platform to
            hire someone you’ve not accepted.
          </li>
          <li>
            Keep contact details inside the platform until a booking is
            confirmed. Sharing phone numbers in cover notes or profiles is not
            allowed.
          </li>
          <li>
            Be accurate about experience and training. Managers rely on it.
          </li>
          <li>
            After a shift completes, mark it honestly. The reliability signal
            only works if it reflects reality.
          </li>
        </ol>
        <p>
          Accounts that breach these rules may be suspended or removed.
        </p>
      </div>
    </div>
  );
}
