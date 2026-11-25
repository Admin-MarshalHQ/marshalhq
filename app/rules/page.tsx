import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Platform rules" };

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Platform rules" />
      <div className="prose-plain max-w-none text-[15px]">
        <p>Use the <Link href="/demo">demo</Link> to try a sample booking. The following rules apply to participants using hiring features.</p>
        <h2>Post a shift someone can commit to</h2>
        <p>Post only authorised, genuine work. Give the dates, call and wrap times, location, duties, rate and number of places. For consecutive calls, identify the final call date and any next-day wrap. Explain risks and pay arrangements before asking anyone to commit. Use a new brief if the terms materially change after someone applies.</p>
        <h2>Apply and select individually</h2>
        <p>Apply only if you can work the advertised run. Describe your experience and training accurately. Managers choose each applicant individually, up to capacity. A profile is the participant’s own account of their experience. Make decisions on relevant job requirements and treat people fairly.</p>
        <h2>Respect booking privacy</h2>
        <p>Keep phone numbers and email addresses out of profiles, briefs, reviews and cover notes. Applying shares your name, profile and note with the posting manager. Acceptance releases booking contacts between that manager and each accepted marshal, even while other places are open. Use those details only to coordinate that booking.</p>
        <h2>Record what happened</h2>
        <p>Tell the other party promptly if plans change. Distinguish a production cancellation from an individual withdrawal. Record attendance for each booked person and call date after wrap. An agreed release from future calls is separate from an absence.</p>
        <p>Keep feedback factual and respectful. To challenge a date, review, booking or access decision, use <Link href="/support">Support</Link> and identify the record and requested correction. Setru may pause access while it reviews a concern. Do not share private allegations in a public profile or review.</p>
      </div>
    </div>
  );
}
