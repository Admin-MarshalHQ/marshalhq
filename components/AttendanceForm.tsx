import { attendanceLabels } from "@/lib/attendance";
import { Button } from "./ui";

export function AttendanceForm({ roster, action, resolving = false }: {
  roster: { id: string; marshal: { marshalProfile: { fullName: string } | null } }[];
  action: (form: FormData) => Promise<void>;
  resolving?: boolean;
}) {
  return <form action={action} className="space-y-3">
    <h2 className="font-bold">{resolving ? "Resolve disputed attendance" : "Confirm attendance after wrap"}</h2>
    {resolving && <input type="hidden" name="applicationId" value={roster[0].id} />}
    {roster.map(app => <label key={app.id} className="block">
      {app.marshal.marshalProfile?.fullName ?? "Booked marshal"}
      <select className="mt-1 block w-full rounded border p-2" name={app.id} required defaultValue="">
        <option value="" disabled>Select the outcome</option>
        {Object.entries(attendanceLabels).filter(([key]) => !resolving || key !== "UNRESOLVED")
          .map(([key,label]) => <option key={key} value={key}>{label}</option>)}
      </select>
    </label>)}
    <Button type="submit">{resolving ? "Save reviewed outcomes" : "Confirm attendance and finish shift"}</Button>
  </form>;
}
