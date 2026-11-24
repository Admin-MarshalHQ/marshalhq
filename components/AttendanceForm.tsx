import { attendanceLabels } from "@/lib/attendance";
import { formatDate } from "@/lib/format";
import { Button } from "./ui";

export function AttendanceForm({ roster, action, resolving = false, callDate, finishOnly = false }: {
  roster: { id: string; attendance: string | null; marshal: { marshalProfile: { fullName: string } | null } }[];
  action: (form: FormData) => Promise<void>;
  resolving?: boolean;
  callDate?: string;
  finishOnly?: boolean;
}) {
  return <form action={action} className="space-y-3">
    <h2 className="font-bold">{resolving ? "Review or correct attendance" : callDate ? "Record attendance for this call" : finishOnly ? "All calls accounted for" : "Confirm attendance after wrap"}</h2>
    {callDate && <p>Call date · {formatDate(callDate)}<input type="hidden" name="callDate" value={callDate} /></p>}
    {resolving && <input type="hidden" name="applicationId" value={roster[0].id} />}
    {resolving && <>
      <p>Current record: {attendanceLabels[roster[0].attendance as keyof typeof attendanceLabels] ?? "Individual attendance unconfirmed"}</p>
      <input type="hidden" name="previous" value={roster[0].attendance ?? ""} />
      <label className="block">Reason or case reference (private)
        <input className="mt-1 block w-full rounded border p-2" name="reason" required maxLength={500} />
      </label>
    </>}
    {roster.map(app => <label key={app.id} className="block">
      {app.marshal.marshalProfile?.fullName ?? "Booked marshal"}
      <select className="mt-1 block w-full rounded border p-2" name={app.id} required defaultValue="">
        <option value="" disabled>Select the outcome</option>
        {Object.entries(attendanceLabels)
          .map(([key,label]) => <option key={key} value={key}>{key === "WORKED_FLAGGED" && !resolving ? "Worked — concern for review" : label}</option>)}
      </select>
    </label>)}
    <Button type="submit">{resolving ? "Save reviewed outcomes" : callDate ? "Save call attendance" : finishOnly ? "Finish shift" : "Confirm attendance and finish shift"}</Button>
  </form>;
}
